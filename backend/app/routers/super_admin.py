import secrets
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session, joinedload

from app.auth.jwt import get_password_hash, require_role
from app.database import get_db
from app.models.courier import CourierCompany
from app.models.dispute import Dispute
from app.models.employee import Employee
from app.models.enums import ParcelStatus
from app.models.hub import Hub
from app.models.parcel import Parcel
from app.models.seller import Seller
from app.schemas.courier import (
    CourierCompanyCreate,
    CourierCompanyResponse,
    CourierCompanyUpdate,
)
from app.schemas.dispute import DisputeResolveRequest, DisputeResponse
from app.schemas.seller import SellerCreate, SellerResponse, SellerUpdate

router = APIRouter(prefix="/api/super-admin", tags=["Super Root Admin Platform Console"])


@router.get("/overview")
def get_super_admin_overview(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN")),
) -> Dict[str, Any]:
    """Returns platform-wide cross-tenant analytics and carrier performance for the Super Root Admin."""
    total_couriers = db.query(func.count(CourierCompany.courier_id)).scalar() or 0
    total_sellers = db.query(func.count(Seller.seller_id)).scalar() or 0
    total_parcels = db.query(func.count(Parcel.parcel_id)).scalar() or 0
    total_disputes = db.query(func.count(Dispute.dispute_id)).scalar() or 0
    active_disputes = (
        db.query(func.count(Dispute.dispute_id))
        .filter(Dispute.status.in_(["OPEN", "IN_INVESTIGATION"]))
        .scalar()
        or 0
    )

    # Carrier performance breakdown
    carriers = db.query(CourierCompany).order_by(CourierCompany.courier_id.asc()).all()
    carrier_stats = []
    for c in carriers:
        c_parcels = db.query(func.count(Parcel.parcel_id)).filter(Parcel.courier_id == c.courier_id).scalar() or 0
        c_active = (
            db.query(func.count(Parcel.parcel_id))
            .filter(
                Parcel.courier_id == c.courier_id,
                Parcel.current_status.notin_(
                    [ParcelStatus.DELIVERED, ParcelStatus.RETURNED_TO_SENDER, ParcelStatus.CANCELLED]
                ),
            )
            .scalar()
            or 0
        )
        c_delivered = (
            db.query(func.count(Parcel.parcel_id))
            .filter(Parcel.courier_id == c.courier_id, Parcel.current_status == ParcelStatus.DELIVERED)
            .scalar()
            or 0
        )
        c_disputes = (
            db.query(func.count(Dispute.dispute_id))
            .join(Parcel, Dispute.parcel_id == Parcel.parcel_id)
            .filter(Parcel.courier_id == c.courier_id)
            .scalar()
            or 0
        )
        c_hubs = db.query(func.count(Hub.hub_id)).filter(Hub.courier_id == c.courier_id).scalar() or 0
        c_employees = db.query(func.count(Employee.employee_id)).filter(Employee.courier_id == c.courier_id).scalar() or 0

        carrier_stats.append({
            "courier_id": c.courier_id,
            "name": c.name,
            "code": c.code,
            "rating": float(c.rating),
            "base_rate": float(c.base_rate),
            "is_active": c.is_active,
            "hubs_count": c_hubs,
            "employees_count": c_employees,
            "total_parcels": c_parcels,
            "active_parcels": c_active,
            "delivered_parcels": c_delivered,
            "dispute_count": c_disputes,
        })

    # Top sellers breakdown
    sellers = db.query(Seller).order_by(Seller.seller_id.asc()).all()
    seller_stats = []
    for s in sellers:
        s_orders = db.query(func.count(Parcel.parcel_id)).filter(Parcel.seller_id == s.seller_id).scalar() or 0
        s_active = (
            db.query(func.count(Parcel.parcel_id))
            .filter(
                Parcel.seller_id == s.seller_id,
                Parcel.current_status.notin_(
                    [ParcelStatus.DELIVERED, ParcelStatus.RETURNED_TO_SENDER, ParcelStatus.CANCELLED]
                ),
            )
            .scalar()
            or 0
        )
        seller_stats.append({
            "seller_id": s.seller_id,
            "company_name": s.company_name,
            "contact_email": s.contact_email,
            "total_orders": s_orders,
            "active_orders": s_active,
            "is_active": s.is_active,
        })

    return {
        "total_couriers": total_couriers,
        "total_sellers": total_sellers,
        "total_parcels": total_parcels,
        "total_disputes": total_disputes,
        "active_disputes": active_disputes,
        "carriers": carrier_stats,
        "sellers": seller_stats,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Courier Company Onboarding & Management
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/couriers", response_model=List[CourierCompanyResponse])
def list_courier_companies(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN")),
) -> List[CourierCompanyResponse]:
    """Lists all onboarded courier partner tenants."""
    couriers = db.query(CourierCompany).order_by(CourierCompany.courier_id.asc()).all()
    return [CourierCompanyResponse.model_validate(c) for c in couriers]


@router.post("/couriers", response_model=CourierCompanyResponse, status_code=status.HTTP_201_CREATED)
def onboard_courier_company(
    courier_in: CourierCompanyCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN")),
) -> CourierCompanyResponse:
    """Onboards a new logistics carrier tenant into the platform."""
    existing = db.query(CourierCompany).filter(
        (CourierCompany.code == courier_in.code.strip().upper())
        | (CourierCompany.name == courier_in.name.strip())
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Courier company with name '{courier_in.name}' or code '{courier_in.code}' already exists",
        )

    courier = CourierCompany(
        name=courier_in.name.strip(),
        code=courier_in.code.strip().upper(),
        base_rate=courier_in.base_rate,
        rating=courier_in.rating,
        tracking_url_prefix=courier_in.tracking_url_prefix,
        is_active=courier_in.is_active,
    )
    db.add(courier)
    db.commit()
    db.refresh(courier)
    return CourierCompanyResponse.model_validate(courier)


@router.put("/couriers/{courier_id}", response_model=CourierCompanyResponse)
def update_courier_company(
    courier_id: int,
    courier_in: CourierCompanyUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN")),
) -> CourierCompanyResponse:
    """Updates an existing courier company tenant profile or pricing rates."""
    courier = db.query(CourierCompany).filter(CourierCompany.courier_id == courier_id).first()
    if not courier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Courier company #{courier_id} not found",
        )

    update_dict = courier_in.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(courier, field, val)

    db.commit()
    db.refresh(courier)
    return CourierCompanyResponse.model_validate(courier)


# ─────────────────────────────────────────────────────────────────────────────
# Seller Onboarding & Management
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/sellers", response_model=List[SellerResponse])
def list_sellers_super_admin(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN")),
) -> List[SellerResponse]:
    """Lists all onboarded e-commerce seller accounts."""
    sellers = db.query(Seller).order_by(Seller.seller_id.asc()).all()
    return [SellerResponse.model_validate(s) for s in sellers]


@router.post("/sellers", response_model=SellerResponse, status_code=status.HTTP_201_CREATED)
def onboard_seller(
    seller_in: SellerCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN")),
) -> SellerResponse:
    """Onboards a new merchant seller with generated API keys."""
    existing = db.query(Seller).filter(Seller.contact_email == seller_in.contact_email.strip().lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Seller with email '{seller_in.contact_email}' already exists",
        )

    # Generate secure random API key
    api_key = f"sk_live_{secrets.token_hex(16)}"
    raw_password = getattr(seller_in, "password", None) or "password123"
    hashed_pwd = get_password_hash(raw_password)

    seller = Seller(
        company_name=seller_in.company_name.strip(),
        contact_email=seller_in.contact_email.strip().lower(),
        contact_phone=seller_in.contact_phone.strip(),
        address_line1=seller_in.address_line1,
        city=seller_in.city,
        state=seller_in.state,
        pincode=seller_in.pincode,
        api_key=api_key,
        password_hash=hashed_pwd,
        is_active=seller_in.is_active,
    )
    db.add(seller)
    db.commit()
    db.refresh(seller)
    return SellerResponse.model_validate(seller)


@router.put("/sellers/{seller_id}", response_model=SellerResponse)
def update_seller(
    seller_id: int,
    seller_in: SellerUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN")),
) -> SellerResponse:
    """Updates merchant account status or profile details."""
    seller = db.query(Seller).filter(Seller.seller_id == seller_id).first()
    if not seller:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Seller #{seller_id} not found",
        )

    update_dict = seller_in.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(seller, field, val)

    db.commit()
    db.refresh(seller)
    return SellerResponse.model_validate(seller)


# ─────────────────────────────────────────────────────────────────────────────
# Cross-Tenant Dispute Resolution Console
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/disputes", response_model=List[DisputeResponse])
def list_disputes(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN")),
) -> List[DisputeResponse]:
    """Lists cross-carrier customer disputes requiring Super Root Admin arbitration."""
    query = (
        db.query(Dispute)
        .options(
            joinedload(Dispute.parcel).joinedload(Parcel.courier),
            joinedload(Dispute.resolver),
        )
    )

    if status_filter:
        query = query.filter(Dispute.status == status_filter.upper())

    disputes = query.order_by(Dispute.created_at.desc()).all()

    results = []
    for d in disputes:
        results.append(
            DisputeResponse(
                dispute_id=d.dispute_id,
                parcel_id=d.parcel_id,
                raised_by_type=d.raised_by_type,
                raised_by_name=d.raised_by_name,
                raised_by_email=d.raised_by_email,
                courier_id=d.parcel.courier_id if d.parcel else None,
                courier_name=d.parcel.courier.name if (d.parcel and d.parcel.courier) else None,
                tracking_number=d.parcel.tracking_number if d.parcel else None,
                reason=d.reason,
                status=d.status,
                resolution_notes=d.resolution_notes,
                resolved_by=d.resolved_by,
                resolver_name=d.resolver.full_name if d.resolver else None,
                created_at=d.created_at,
                updated_at=d.updated_at,
            )
        )
    return results


@router.put("/disputes/{dispute_id}/resolve", response_model=DisputeResponse)
def resolve_dispute(
    dispute_id: int,
    resolve_in: DisputeResolveRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN")),
) -> DisputeResponse:
    """Super Root Admin arbitrates and resolves or updates a customer/merchant dispute."""
    dispute = (
        db.query(Dispute)
        .options(
            joinedload(Dispute.parcel).joinedload(Parcel.courier),
            joinedload(Dispute.resolver),
        )
        .filter(Dispute.dispute_id == dispute_id)
        .first()
    )
    if not dispute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispute #{dispute_id} not found",
        )

    dispute.status = resolve_in.status.upper()
    dispute.resolution_notes = resolve_in.resolution_notes
    dispute.resolved_by = current_user.employee_id

    # Sync status to parcel
    if dispute.parcel:
        dispute.parcel.dispute_status = resolve_in.status.upper()

    db.commit()
    db.refresh(dispute)

    return DisputeResponse(
        dispute_id=dispute.dispute_id,
        parcel_id=dispute.parcel_id,
        raised_by_type=dispute.raised_by_type,
        raised_by_name=dispute.raised_by_name,
        raised_by_email=dispute.raised_by_email,
        courier_id=dispute.parcel.courier_id if dispute.parcel else None,
        courier_name=dispute.parcel.courier.name if (dispute.parcel and dispute.parcel.courier) else None,
        tracking_number=dispute.parcel.tracking_number if dispute.parcel else None,
        reason=dispute.reason,
        status=dispute.status,
        resolution_notes=dispute.resolution_notes,
        resolved_by=dispute.resolved_by,
        resolver_name=current_user.full_name,
        created_at=dispute.created_at,
        updated_at=dispute.updated_at,
    )
