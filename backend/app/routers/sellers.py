from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session, joinedload

from app.auth.jwt import (
    create_access_token,
    get_current_seller,
    get_current_user,
    require_role,
    verify_password,
)
from app.database import get_db
from app.models.customer import Customer
from app.models.employee import Employee
from app.models.enums import ParcelStatus
from app.models.hub import Hub
from app.models.parcel import Parcel
from app.models.seller import Seller
from app.models.rate_card import CourierPincodeServiceability
from app.schemas.parcel import ParcelResponse
from app.schemas.seller import (
    SellerCreate,
    SellerDirectoryItem,
    SellerLoginRequest,
    SellerOrderCreate,
    SellerResponse,
    SellerStatsResponse,
    SellerTokenResponse,
    SellerUpdate,
)
from app.services.parcel_service import get_parcel_by_id

router = APIRouter(prefix="/api/sellers", tags=["Sellers & Aggregator Booking"])


# ─────────────────────────────────────────────────────────────────────────────
# 1. MERCHANT AUTHENTICATION & DIRECTORY
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=SellerTokenResponse)
def seller_login(
    login_in: SellerLoginRequest,
    db: Session = Depends(get_db),
) -> SellerTokenResponse:
    """Authenticates an e-commerce merchant via bcrypt password or secure API Key.
    Returns a signed JWT scoped strictly with role=SELLER and merchant's seller_id.
    """
    seller: Optional[Seller] = None

    if login_in.api_key:
        seller = db.query(Seller).filter(Seller.api_key == login_in.api_key.strip()).first()
    elif login_in.email:
        clean_email = login_in.email.strip().lower()
        seller = db.query(Seller).filter(Seller.contact_email == clean_email).first()
        if seller:
            if not login_in.password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password is required for email login",
                )
            if not seller.password_hash or not verify_password(login_in.password, seller.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid merchant email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either contact_email + password or valid api_key",
        )

    if not seller:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Merchant credentials not recognized",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not seller.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant account is suspended or deactivated",
        )

    token_data = {
        "sub": str(seller.seller_id),
        "seller_id": seller.seller_id,
        "email": seller.contact_email,
        "company_name": seller.company_name,
        "role": "SELLER",
    }
    access_token = create_access_token(token_data)

    return SellerTokenResponse(
        access_token=access_token,
        token_type="bearer",
        seller=SellerResponse.model_validate(seller),
    )


@router.get("/directory", response_model=List[SellerDirectoryItem])
def list_seller_directory(db: Session = Depends(get_db)) -> List[SellerDirectoryItem]:
    """Public merchant directory exposing ONLY non-sensitive company info.
    Safe for demo logins and carrier rate routing without leaking API keys or credentials.
    """
    sellers = (
        db.query(Seller)
        .filter(Seller.is_active.is_(True))
        .order_by(Seller.company_name.asc())
        .all()
    )
    return [SellerDirectoryItem.model_validate(s) for s in sellers]


# ─────────────────────────────────────────────────────────────────────────────
# 2. AUTHENTICATED MERCHANT PROFILE & TENANT-ISOLATED STATS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=SellerResponse)
def get_current_seller_profile(
    current_seller: Seller = Depends(get_current_seller),
) -> SellerResponse:
    """Retrieves the authenticated merchant's own profile."""
    return SellerResponse.model_validate(current_seller)


@router.get("/stats", response_model=SellerStatsResponse)
def get_my_seller_stats(
    current_seller: Seller = Depends(get_current_seller),
    db: Session = Depends(get_db),
) -> SellerStatsResponse:
    """Computes order statistics strictly scoped to the logged-in merchant."""
    seller_id = current_seller.seller_id

    total_orders = db.query(func.count(Parcel.parcel_id)).filter(Parcel.seller_id == seller_id).scalar() or 0
    active_orders = (
        db.query(func.count(Parcel.parcel_id))
        .filter(
            Parcel.seller_id == seller_id,
            Parcel.current_status.notin_(
                [ParcelStatus.DELIVERED, ParcelStatus.RETURNED_TO_SENDER, ParcelStatus.CANCELLED]
            ),
        )
        .scalar()
        or 0
    )
    delivered_orders = (
        db.query(func.count(Parcel.parcel_id))
        .filter(Parcel.seller_id == seller_id, Parcel.current_status == ParcelStatus.DELIVERED)
        .scalar()
        or 0
    )
    spend = db.query(func.coalesce(func.sum(Parcel.declared_value), 0)).filter(Parcel.seller_id == seller_id).scalar()

    return SellerStatsResponse(
        seller_id=current_seller.seller_id,
        company_name=current_seller.company_name,
        total_orders=total_orders,
        active_orders=active_orders,
        delivered_orders=delivered_orders,
        total_shipping_spend=Decimal(str(spend or 0.0)),
    )


@router.get("/orders", response_model=List[ParcelResponse])
def list_my_seller_orders(
    current_status: Optional[ParcelStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    response: Response = None,
    current_seller: Seller = Depends(get_current_seller),
    db: Session = Depends(get_db),
) -> List[ParcelResponse]:
    """Lists orders strictly scoped to the authenticated merchant tenant."""
    seller_id = current_seller.seller_id

    query = (
        db.query(Parcel)
        .options(
            joinedload(Parcel.sender),
            joinedload(Parcel.receiver),
            joinedload(Parcel.origin_hub),
            joinedload(Parcel.destination_hub),
            joinedload(Parcel.courier),
            joinedload(Parcel.seller),
        )
        .filter(Parcel.seller_id == seller_id)
    )

    if current_status:
        query = query.filter(Parcel.current_status == current_status)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Parcel.tracking_number.ilike(term))
            | (Parcel.special_instructions.ilike(term))
        )

    total = query.count()
    if response:
        response.headers["X-Total-Count"] = str(total)

    parcels = query.order_by(Parcel.created_at.desc()).offset(skip).limit(limit).all()
    return [ParcelResponse.model_validate(p) for p in parcels]


# ─────────────────────────────────────────────────────────────────────────────
# 3. 1-CLICK DISPATCH / BOOKING (ENCRYPTED & TENANT-LOCKED)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/orders", response_model=ParcelResponse, status_code=status.HTTP_201_CREATED)
def book_seller_shipment(
    order_in: SellerOrderCreate,
    current_seller: Seller = Depends(get_current_seller),
    db: Session = Depends(get_db),
) -> ParcelResponse:
    """Books a parcel strictly on behalf of the authenticated merchant.
    Overwrites any passed seller_id with current_seller.seller_id to eliminate cross-tenant forgery.
    """
    # 1. Tenant binding: Lock to current merchant
    seller_id = current_seller.seller_id

    # 1.1 Verify carrier serviceability for destination pincode
    dest_pin = order_in.receiver_pincode.strip()
    pincode_rule = (
        db.query(CourierPincodeServiceability)
        .filter(
            CourierPincodeServiceability.courier_id == order_in.courier_id,
            CourierPincodeServiceability.pincode == dest_pin,
        )
        .first()
    )
    if pincode_rule and not pincode_rule.is_delivery:
        reason = pincode_rule.unserviceable_reason or "Destination pincode is outside carrier service network"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Serviceability Violation: {reason}",
        )

    # 2. Upsert / resolve sender Customer
    clean_sender_email = order_in.sender_email.strip().lower()
    sender = db.query(Customer).filter(Customer.email == clean_sender_email).first()
    if not sender:
        sender = Customer(
            full_name=order_in.sender_name.strip(),
            email=clean_sender_email,
            phone=order_in.sender_phone.strip(),
            address_line1=order_in.sender_address.strip(),
            city=order_in.sender_city.strip(),
            state=order_in.sender_state.strip(),
            pincode=order_in.sender_pincode.strip(),
            country="India",
        )
        db.add(sender)
        db.flush()

    # 3. Upsert / resolve receiver Customer
    clean_receiver_email = order_in.receiver_email.strip().lower()
    receiver = db.query(Customer).filter(Customer.email == clean_receiver_email).first()
    if not receiver:
        receiver = Customer(
            full_name=order_in.receiver_name.strip(),
            email=clean_receiver_email,
            phone=order_in.receiver_phone.strip(),
            address_line1=order_in.receiver_address.strip(),
            city=order_in.receiver_city.strip(),
            state=order_in.receiver_state.strip(),
            pincode=order_in.receiver_pincode.strip(),
            country="India",
        )
        db.add(receiver)
        db.flush()

    # 4. Resolve origin and destination hubs for chosen courier
    courier_hubs = (
        db.query(Hub)
        .filter(Hub.courier_id == order_in.courier_id, Hub.is_active.is_(True))
        .all()
    )
    if not courier_hubs:
        courier_hubs = db.query(Hub).filter(Hub.courier_id == order_in.courier_id).all()
        if not courier_hubs:
            courier_hubs = db.query(Hub).filter(Hub.is_active.is_(True)).all()

    origin_hub_id = order_in.origin_hub_id
    if not origin_hub_id:
        match = next(
            (h for h in courier_hubs if h.state.lower() == order_in.sender_state.strip().lower()),
            courier_hubs[0] if courier_hubs else None,
        )
        origin_hub_id = match.hub_id if match else 1

    destination_hub_id = order_in.destination_hub_id
    if not destination_hub_id:
        match = next(
            (
                h
                for h in courier_hubs
                if h.state.lower() == order_in.receiver_state.strip().lower()
                and h.hub_id != origin_hub_id
            ),
            None,
        )
        if not match:
            candidates = [h for h in courier_hubs if h.hub_id != origin_hub_id]
            match = candidates[0] if candidates else courier_hubs[0]
        destination_hub_id = match.hub_id if match else origin_hub_id

    # 5. Resolve an employee at origin_hub_id to satisfy trigger fn_validate_status_transition
    assigned_emp = (
        db.query(Employee)
        .filter(Employee.hub_id == origin_hub_id, Employee.is_active.is_(True))
        .first()
    )
    reg_employee_id = assigned_emp.employee_id if assigned_emp else None

    # 6. Estimated delivery date
    est_delivery = (datetime.now() + timedelta(days=3)).date()

    # 7. Execute stored procedure fn_register_parcel
    parcel_type_val = (
        order_in.parcel_type.value
        if hasattr(order_in.parcel_type, "value")
        else str(order_in.parcel_type)
    )

    try:
        stmt = text(
            """
            SELECT out_parcel_id, out_tracking_number
            FROM fn_register_parcel(
                p_sender_id            := :sender_id,
                p_receiver_id          := :receiver_id,
                p_origin_hub_id        := :origin_hub_id,
                p_destination_hub_id   := :destination_hub_id,
                p_parcel_type          := CAST(:parcel_type AS parcel_type),
                p_weight_kg            := :weight_kg,
                p_length_cm            := :length_cm,
                p_width_cm             := :width_cm,
                p_height_cm            := :height_cm,
                p_declared_value       := :declared_value,
                p_special_instructions := :special_instructions,
                p_employee_id          := :employee_id,
                p_estimated_delivery   := :estimated_delivery,
                p_courier_id           := :courier_id,
                p_seller_id            := :seller_id
            )
            """
        )
        result = db.execute(
            stmt,
            {
                "sender_id": sender.customer_id,
                "receiver_id": receiver.customer_id,
                "origin_hub_id": origin_hub_id,
                "destination_hub_id": destination_hub_id,
                "parcel_type": parcel_type_val,
                "weight_kg": float(order_in.weight_kg),
                "length_cm": float(order_in.length_cm),
                "width_cm": float(order_in.width_cm),
                "height_cm": float(order_in.height_cm),
                "declared_value": float(order_in.declared_value),
                "special_instructions": order_in.special_instructions,
                "employee_id": reg_employee_id,
                "estimated_delivery": est_delivery,
                "courier_id": order_in.courier_id,
                "seller_id": seller_id,
            },
        )
        row = result.fetchone()
        db.commit()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to book shipment: Stored procedure did not return parcel ID",
            )

        parcel_id = row[0]
        parcel = get_parcel_by_id(db, parcel_id)
        return ParcelResponse.model_validate(parcel)

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order creation failed: {str(exc)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# 4. CROSS-TENANT DEFENSE / RESTRICTED ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[SellerResponse])
def list_all_sellers_admin(
    is_active: Optional[bool] = Query(None, description="Filter active merchants"),
    db: Session = Depends(get_db),
    current_admin: Employee = Depends(require_role("SUPER_ADMIN")),
) -> List[SellerResponse]:
    """Lists all registered merchants. Strictly restricted to Super Platform Admin."""
    query = db.query(Seller)
    if is_active is not None:
        query = query.filter(Seller.is_active == is_active)
    sellers = query.order_by(Seller.company_name.asc()).all()
    return [SellerResponse.model_validate(s) for s in sellers]


@router.get("/{seller_id}", response_model=SellerResponse)
def get_seller_by_id(
    seller_id: int,
    current_seller: Seller = Depends(get_current_seller),
    db: Session = Depends(get_db),
) -> SellerResponse:
    """Retrieves seller profile. Enforces tenant boundary (cannot view another merchant)."""
    if current_seller.seller_id != seller_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant Isolation Violation: Cannot view details of another merchant.",
        )
    return SellerResponse.model_validate(current_seller)


@router.get("/{seller_id}/orders", response_model=List[ParcelResponse])
def list_seller_orders_by_id(
    seller_id: int,
    current_status: Optional[ParcelStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    response: Response = None,
    current_seller: Seller = Depends(get_current_seller),
    db: Session = Depends(get_db),
) -> List[ParcelResponse]:
    """Lists orders for a merchant ID. Strictly prevents cross-merchant leakage."""
    if current_seller.seller_id != seller_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant Isolation Violation: Cannot read orders of another merchant.",
        )
    return list_my_seller_orders(
        current_status=current_status,
        search=search,
        skip=skip,
        limit=limit,
        response=response,
        current_seller=current_seller,
        db=db,
    )


@router.get("/{seller_id}/stats", response_model=SellerStatsResponse)
def get_seller_stats_by_id(
    seller_id: int,
    current_seller: Seller = Depends(get_current_seller),
    db: Session = Depends(get_db),
) -> SellerStatsResponse:
    """Retrieves statistics for a merchant ID. Strictly prevents cross-merchant leakage."""
    if current_seller.seller_id != seller_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant Isolation Violation: Cannot view financial statistics of another merchant.",
        )
    return get_my_seller_stats(current_seller=current_seller, db=db)
