import math
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.courier import CourierCompany
from app.models.rate_card import CourierRateCard, ServiceableRegion, CourierPincodeServiceability
from app.schemas.rate import CourierQuoteResponse, RateComparisonResponse, RateEstimateRequest

# Major Tier-1 Metro hubs in India
METRO_STATES = {"Maharashtra", "Delhi", "Karnataka", "Telangana", "Tamil Nadu", "West Bengal"}

PINCODE_STATE_MAP: Dict[str, str] = {
    "11": "Delhi",
    "12": "Haryana",
    "13": "Haryana",
    "14": "Punjab",
    "15": "Punjab",
    "16": "Punjab",
    "17": "Himachal Pradesh",
    "18": "Jammu & Kashmir",
    "19": "Jammu & Kashmir",
    "20": "Uttar Pradesh",
    "21": "Uttar Pradesh",
    "22": "Uttar Pradesh",
    "24": "Uttarakhand",
    "25": "Uttar Pradesh",
    "26": "Uttar Pradesh",
    "27": "Uttar Pradesh",
    "28": "Uttar Pradesh",
    "30": "Rajasthan",
    "31": "Rajasthan",
    "32": "Rajasthan",
    "33": "Rajasthan",
    "34": "Rajasthan",
    "36": "Gujarat",
    "37": "Gujarat",
    "38": "Gujarat",
    "39": "Gujarat",
    "40": "Maharashtra",
    "41": "Maharashtra",
    "42": "Maharashtra",
    "43": "Maharashtra",
    "44": "Maharashtra",
    "45": "Madhya Pradesh",
    "46": "Madhya Pradesh",
    "47": "Madhya Pradesh",
    "48": "Madhya Pradesh",
    "49": "Chhattisgarh",
    "50": "Telangana",
    "51": "Andhra Pradesh",
    "52": "Andhra Pradesh",
    "53": "Andhra Pradesh",
    "56": "Karnataka",
    "57": "Karnataka",
    "58": "Karnataka",
    "59": "Karnataka",
    "60": "Tamil Nadu",
    "61": "Tamil Nadu",
    "62": "Tamil Nadu",
    "63": "Tamil Nadu",
    "64": "Tamil Nadu",
    "67": "Kerala",
    "68": "Kerala",
    "69": "Kerala",
    "70": "West Bengal",
    "71": "West Bengal",
    "72": "West Bengal",
    "73": "West Bengal",
    "74": "West Bengal",
    "75": "Odisha",
    "76": "Odisha",
    "80": "Bihar",
    "81": "Bihar",
    "82": "Bihar",
    "83": "Jharkhand",
    "84": "Bihar",
    "85": "Bihar",
}


def resolve_state_from_pincode(pincode: str, fallback: Optional[str] = None) -> str:
    if fallback:
        return fallback
    clean_pin = pincode.strip()[:2]
    return PINCODE_STATE_MAP.get(clean_pin, "Maharashtra")


def determine_zone(origin_state: str, dest_state: str, origin_pin: str, dest_pin: str) -> str:
    if origin_pin.strip()[:3] == dest_pin.strip()[:3]:
        return "LOCAL"
    if origin_state == dest_state:
        return "REGIONAL"
    if origin_state in METRO_STATES and dest_state in METRO_STATES:
        return "METRO"
    return "NATIONAL"


def compare_courier_rates(db: Session, request: RateEstimateRequest) -> RateComparisonResponse:
    # 1. State resolution
    origin_state = resolve_state_from_pincode(request.origin_pincode, request.origin_state)
    dest_state = resolve_state_from_pincode(request.destination_pincode, request.dest_state)

    # 2. Volumetric and billable weight computation (divisor: 5000)
    volumetric_weight = Decimal(
        str(round(float(request.length_cm * request.width_cm * request.height_cm) / 5000.0, 2))
    )
    billable_weight = max(request.weight_kg, volumetric_weight)

    # 3. Zone classification
    zone_type = determine_zone(origin_state, dest_state, request.origin_pincode, request.destination_pincode)

    # 4. Pincode and prefix classification for serviceability
    dest_pin = request.destination_pincode.strip()
    dest_prefix = dest_pin[:2]
    METRO_PREFIXES = {"11", "40", "56", "50", "60", "70", "38", "41"}
    BLUEDART_EXP_PREFIXES = {"11", "40", "56", "50", "60", "70", "38", "41", "12", "20", "30", "68", "42", "57", "78"}
    REMOTE_PREFIXES = {"79", "19", "17", "24"}

    # 5. Fetch all active carriers
    couriers = db.query(CourierCompany).filter(CourierCompany.is_active.is_(True)).all()

    quotes: List[CourierQuoteResponse] = []

    for c in couriers:
        # Check explicit pincode serviceability table first
        pincode_rule = (
            db.query(CourierPincodeServiceability)
            .filter(
                CourierPincodeServiceability.courier_id == c.courier_id,
                CourierPincodeServiceability.pincode == dest_pin,
            )
            .first()
        )

        if pincode_rule:
            is_serviceable = pincode_rule.is_delivery
            unserviceable_reason = pincode_rule.unserviceable_reason if not is_serviceable else None
            transit_offset = pincode_rule.transit_days_offset
        else:
            # Fallback heuristic based on carrier operational model
            c_code = (c.code or "").upper()
            if c_code == "DELHIVERY":
                is_serviceable = True
                unserviceable_reason = None
                transit_offset = 2 if dest_prefix in REMOTE_PREFIXES else 0
            elif c_code == "DTDC":
                if dest_prefix in REMOTE_PREFIXES:
                    is_serviceable = False
                    unserviceable_reason = "ODA - Destination pincode outside DTDC surface network"
                    transit_offset = 0
                else:
                    is_serviceable = True
                    unserviceable_reason = None
                    transit_offset = 0
            elif c_code == "BLUEDART":
                if dest_prefix in BLUEDART_EXP_PREFIXES:
                    is_serviceable = True
                    unserviceable_reason = None
                    transit_offset = 0
                else:
                    is_serviceable = False
                    unserviceable_reason = "ODA - Destination pincode outside Blue Dart express aviation grid"
                    transit_offset = 0
            elif c_code == "FEDEX":
                if dest_prefix in METRO_PREFIXES:
                    is_serviceable = True
                    unserviceable_reason = None
                    transit_offset = 0
                else:
                    is_serviceable = False
                    unserviceable_reason = "FedEx linehaul limited to metro airport cargo clusters"
                    transit_offset = 0
            else:
                is_serviceable = True
                unserviceable_reason = None
                transit_offset = 0

        # Lane transit days
        region_rule = (
            db.query(ServiceableRegion)
            .filter(
                ServiceableRegion.courier_id == c.courier_id,
                ServiceableRegion.origin_state == origin_state,
                ServiceableRegion.dest_state == dest_state,
            )
            .first()
        )

        base_transit_days = region_rule.estimated_transit_days if region_rule else 3
        estimated_days = max(1, base_transit_days + transit_offset)

        # If region rule explicitly set unserviceable, respect it
        if region_rule and not region_rule.is_serviceable:
            is_serviceable = False
            if not unserviceable_reason:
                unserviceable_reason = f"Lane {origin_state} -> {dest_state} not serviced by {c.name}"

        # Fetch matching rate card
        rate_card = (
            db.query(CourierRateCard)
            .filter(
                CourierRateCard.courier_id == c.courier_id,
                CourierRateCard.zone_type == zone_type,
            )
            .first()
        )

        if not rate_card:
            rate_card = (
                db.query(CourierRateCard)
                .filter(CourierRateCard.courier_id == c.courier_id)
                .first()
            )

        if rate_card:
            base_price = Decimal(str(rate_card.base_price))
            max_base_weight = Decimal(str(rate_card.max_weight_kg))
            step_kg = Decimal(str(rate_card.additional_weight_step_kg))
            step_price = Decimal(str(rate_card.additional_weight_price))

            if billable_weight > max_base_weight and step_kg > 0:
                excess_weight = billable_weight - max_base_weight
                num_steps = math.ceil(float(excess_weight) / float(step_kg))
                weight_surcharge = Decimal(str(round(num_steps * float(step_price), 2)))
            else:
                weight_surcharge = Decimal("0.00")

            total_cost = base_price + weight_surcharge
        else:
            base_price = Decimal(str(c.base_rate))
            weight_surcharge = Decimal("0.00")
            total_cost = base_price

        # Estimated delivery date
        est_delivery_dt = datetime.now() + timedelta(days=estimated_days)
        est_delivery_str = est_delivery_dt.strftime("%a, %d %b %Y")

        # Composite score calculation (unserviceable carriers receive penalizing score)
        if is_serviceable:
            rating_score = float(c.rating) * 20.0
            speed_score = max(0, 10 - estimated_days) * 4.0
            price_penalty = float(total_cost) * 0.15
            composite_score = round(rating_score + speed_score - price_penalty, 2)
        else:
            composite_score = -999.0

        quotes.append(
            CourierQuoteResponse(
                courier_id=c.courier_id,
                courier_name=c.name,
                courier_code=c.code,
                rating=c.rating,
                zone_type=zone_type,
                billable_weight_kg=billable_weight,
                base_cost=base_price,
                weight_surcharge=weight_surcharge,
                total_cost=total_cost,
                estimated_transit_days=estimated_days,
                estimated_delivery_date=est_delivery_str,
                is_serviceable=is_serviceable,
                unserviceable_reason=unserviceable_reason,
                badge=None,
                composite_score=composite_score,
            )
        )

    if not quotes:
        return RateComparisonResponse(
            origin_pincode=request.origin_pincode,
            destination_pincode=request.destination_pincode,
            origin_state=origin_state,
            dest_state=dest_state,
            volumetric_weight_kg=volumetric_weight,
            billable_weight_kg=billable_weight,
            quotes=[],
            recommended_courier_id=None,
        )

    # Assign Badges & Recommendation exclusively among serviceable carriers
    serviceable_quotes = [q for q in quotes if q.is_serviceable]

    if serviceable_quotes:
        cheapest = min(serviceable_quotes, key=lambda q: q.total_cost)
        fastest = min(serviceable_quotes, key=lambda q: q.estimated_transit_days)
        best_rated = max(serviceable_quotes, key=lambda q: q.composite_score)

        for q in serviceable_quotes:
            if q.courier_id == cheapest.courier_id and q.courier_id == fastest.courier_id:
                q.badge = "BEST_VALUE"
            elif q.courier_id == cheapest.courier_id:
                q.badge = "CHEAPEST"
            elif q.courier_id == fastest.courier_id:
                q.badge = "FASTEST"
            elif q.courier_id == best_rated.courier_id:
                q.badge = "TOP_RATED"

        recommended_id = best_rated.courier_id
    else:
        recommended_id = None

    # Sort quotes: serviceable first by composite score descending, then unserviceable carriers
    quotes.sort(key=lambda q: (1 if q.is_serviceable else 0, q.composite_score), reverse=True)

    return RateComparisonResponse(
        origin_pincode=request.origin_pincode,
        destination_pincode=request.destination_pincode,
        origin_state=origin_state,
        dest_state=dest_state,
        volumetric_weight_kg=volumetric_weight,
        billable_weight_kg=billable_weight,
        quotes=quotes,
        recommended_courier_id=recommended_id,
    )
