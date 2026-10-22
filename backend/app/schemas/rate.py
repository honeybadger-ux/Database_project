from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class RateEstimateRequest(BaseModel):
    origin_pincode: str
    destination_pincode: str
    origin_state: Optional[str] = None
    dest_state: Optional[str] = None
    weight_kg: Decimal
    length_cm: Decimal = Decimal("10.00")
    width_cm: Decimal = Decimal("10.00")
    height_cm: Decimal = Decimal("10.00")
    declared_value: Decimal = Decimal("500.00")


class CourierQuoteResponse(BaseModel):
    courier_id: int
    courier_name: str
    courier_code: str
    rating: Decimal
    zone_type: str
    billable_weight_kg: Decimal
    base_cost: Decimal
    weight_surcharge: Decimal
    total_cost: Decimal
    estimated_transit_days: int
    estimated_delivery_date: str
    is_serviceable: bool
    unserviceable_reason: Optional[str] = None
    badge: Optional[str] = None  # 'CHEAPEST', 'FASTEST', 'BEST_RATED'
    composite_score: float

    model_config = ConfigDict(from_attributes=True)


class RateComparisonResponse(BaseModel):
    origin_pincode: str
    destination_pincode: str
    origin_state: str
    dest_state: str
    volumetric_weight_kg: Decimal
    billable_weight_kg: Decimal
    quotes: List[CourierQuoteResponse]
    recommended_courier_id: Optional[int] = None
