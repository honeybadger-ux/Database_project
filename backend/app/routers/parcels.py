from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user, require_role
from app.database import get_db
from app.models.employee import Employee
from app.models.enums import EmployeeRole, ParcelStatus
from app.models.hub import Hub
from app.schemas.parcel import (
    ParcelCreate,
    ParcelResponse,
    ParcelStatusUpdate,
    ParcelTrackingResponse,
)
from app.schemas.tracking import TrackingHistoryResponse
from app.services.parcel_service import (
    count_parcels,
    get_parcel_by_id,
    get_parcels,
    register_parcel,
    update_parcel_status,
)

router = APIRouter(prefix="/api/parcels", tags=["Parcels"])


@router.post("", response_model=ParcelResponse, status_code=status.HTTP_201_CREATED)
def create_parcel(
    parcel_in: ParcelCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER", "CLERK")),
) -> ParcelResponse:
    """Registers a new parcel in the system with carrier and regional scope enforcement."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    if role_str == "SUPER_ADMIN":
        # Platform owner can register parcel under any courier or origin hub
        pass
    elif role_str == "COURIER_ADMIN":
        # Courier Admin can register parcel under any hub of their courier tenant
        hub = db.query(Hub).filter(Hub.hub_id == parcel_in.origin_hub_id).first()
        if not hub or hub.courier_id != current_user.courier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Carrier Tenant Violation: Origin Hub #{parcel_in.origin_hub_id} does not belong to your courier company.",
            )
        parcel_in.courier_id = current_user.courier_id
    else:
        # Regional personnel (HUB_MANAGER, CLERK) are strictly scoped to their assigned hub & carrier
        if parcel_in.origin_hub_id != current_user.hub_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Regional Scope Violation: You are assigned to Hub {current_user.hub_id} and cannot register parcels originating from Hub {parcel_in.origin_hub_id}.",
            )
        parcel_in.courier_id = current_user.courier_id

    parcel = register_parcel(db, parcel_in, current_user)
    return ParcelResponse.model_validate(parcel)


@router.get("", response_model=List[ParcelResponse])
def list_parcels(
    hub_id: Optional[int] = Query(None, description="Filter by associated hub ID"),
    courier_id: Optional[int] = Query(None, description="Filter by courier tenant ID (Super Admin only)"),
    seller_id: Optional[int] = Query(None, description="Filter by merchant seller ID"),
    current_status: Optional[ParcelStatus] = Query(None, alias="status", description="Filter by parcel status"),
    search: Optional[str] = Query(None, description="Search tracking number, parcel ID, or customer name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    response: Response = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
) -> List[ParcelResponse]:
    """Retrieves parcels with carrier multi-tenant and regional isolation.

    - SUPER_ADMIN: Unrestricted access across all carrier tenants; can filter by courier_id.
    - COURIER_ADMIN: Scoped strictly to their carrier tenant (current_user.courier_id).
    - Regional Staff: Scoped strictly to their carrier tenant and assigned regional hub.
    """
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    effective_courier_id = courier_id
    effective_hub_id = hub_id

    if role_str == "SUPER_ADMIN":
        # Unrestricted: filters as requested
        pass
    elif role_str == "COURIER_ADMIN":
        effective_courier_id = current_user.courier_id
    else:
        effective_courier_id = current_user.courier_id
        effective_hub_id = current_user.hub_id

    total = count_parcels(
        db=db,
        hub_id=effective_hub_id,
        courier_id=effective_courier_id,
        seller_id=seller_id,
        current_status=current_status,
        search=search,
    )
    if response:
        response.headers["X-Total-Count"] = str(total)

    parcels = get_parcels(
        db=db,
        hub_id=effective_hub_id,
        courier_id=effective_courier_id,
        seller_id=seller_id,
        current_status=current_status,
        search=search,
        skip=skip,
        limit=limit,
    )
    return [ParcelResponse.model_validate(p) for p in parcels]


@router.get("/{parcel_id}", response_model=ParcelTrackingResponse)
def get_parcel(
    parcel_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
) -> ParcelTrackingResponse:
    """Retrieves full parcel details including tracking history and delivery attempts, respecting tenant bounds."""
    parcel = get_parcel_by_id(db, parcel_id)
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parcel with ID {parcel_id} not found",
        )

    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != "SUPER_ADMIN":
        if parcel.courier_id != current_user.courier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Parcel {parcel.tracking_number} belongs to another courier carrier.",
            )

    return ParcelTrackingResponse.model_validate(parcel)


@router.post("/{parcel_id}/status", response_model=TrackingHistoryResponse, status_code=status.HTTP_201_CREATED)
def update_status(
    parcel_id: int,
    update_data: ParcelStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER", "CLERK")),
) -> TrackingHistoryResponse:
    """Updates parcel status by appending to tracking history with tenant scoping."""
    parcel = get_parcel_by_id(db, parcel_id)
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parcel with ID {parcel_id} not found",
        )

    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    if role_str == "SUPER_ADMIN":
        effective_hub_id = update_data.hub_id or parcel.current_hub_id or current_user.hub_id
    elif role_str == "COURIER_ADMIN":
        if parcel.courier_id != current_user.courier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Carrier Tenant Violation: Cannot update parcels belonging to other couriers.",
            )
        effective_hub_id = update_data.hub_id or parcel.current_hub_id or current_user.hub_id
    else:
        if parcel.courier_id != current_user.courier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Carrier Tenant Violation: Cannot update parcels belonging to other couriers.",
            )
        associated_hubs = {parcel.current_hub_id, parcel.origin_hub_id, parcel.destination_hub_id}
        if current_user.hub_id not in associated_hubs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Regional Scope Violation: Parcel {parcel.tracking_number} is not under the jurisdiction of Hub {current_user.hub_id}.",
            )
        effective_hub_id = current_user.hub_id

    tracking_event = update_parcel_status(
        db=db,
        parcel_id=parcel_id,
        new_status=update_data.status,
        hub_id=effective_hub_id,
        employee_id=current_user.employee_id,
        remarks=update_data.remarks,
    )
    return TrackingHistoryResponse.model_validate(tracking_event)
