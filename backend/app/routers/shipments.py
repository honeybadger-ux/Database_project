from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user, require_role
from app.database import get_db
from app.models.employee import Employee
from app.models.enums import ShipmentStatus
from app.models.hub import Hub
from app.schemas.shipment import ShipmentCreate, ShipmentResponse
from app.services.shipment_service import (
    count_shipments,
    create_shipment,
    get_shipment_by_id,
    get_shipments,
    receive_shipment,
)

router = APIRouter(prefix="/api/shipments", tags=["Shipments"])


@router.post("", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
def dispatch_shipment(
    shipment_in: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER", "CLERK")),
) -> ShipmentResponse:
    """Dispatches a new linehaul shipment with manifested parcels under carrier tenant control."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    # Origin hub resolution
    origin_hub_id = shipment_in.from_hub_id or current_user.hub_id or 1

    if shipment_in.to_hub_id == origin_hub_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Destination hub cannot be identical to origin hub.",
        )

    # Validate destination hub
    dest_hub = db.query(Hub).filter(Hub.hub_id == shipment_in.to_hub_id).first()
    if not dest_hub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination hub #{shipment_in.to_hub_id} not found",
        )

    # Validate origin hub
    from_hub = db.query(Hub).filter(Hub.hub_id == origin_hub_id).first()
    if not from_hub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Origin hub #{origin_hub_id} not found",
        )

    if role_str != "SUPER_ADMIN":
        if dest_hub.courier_id != current_user.courier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Carrier Tenant Violation: Destination Hub #{shipment_in.to_hub_id} belongs to another courier partner.",
            )
        if from_hub.courier_id != current_user.courier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Carrier Tenant Violation: Origin Hub #{origin_hub_id} belongs to another courier partner.",
            )
        if role_str not in ("SUPER_ADMIN", "COURIER_ADMIN") and current_user.hub_id != origin_hub_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Regional Scope Violation: You are assigned to Hub #{current_user.hub_id} and cannot dispatch shipments from Hub #{origin_hub_id}.",
            )

    shipment = create_shipment(db, shipment_in, current_user, origin_hub_id=origin_hub_id)
    return ShipmentResponse.model_validate(shipment)


@router.get("", response_model=List[ShipmentResponse])
def list_shipments(
    hub_id: Optional[int] = Query(None, description="Hub ID for filtering"),
    courier_id: Optional[int] = Query(None, description="Courier Tenant ID (Super Admin only)"),
    direction: Optional[str] = Query(None, regex="^(inbound|outbound)$", description="'inbound' or 'outbound'"),
    current_status: Optional[ShipmentStatus] = Query(None, alias="status", description="Shipment status"),
    search: Optional[str] = Query(None, description="Search shipment ID, vehicle number, or hub name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    response: Response = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
) -> List[ShipmentResponse]:
    """Lists linehaul shipments with tenant scoping and direction/status filtering."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    effective_courier_id = courier_id
    effective_hub_id = hub_id

    if role_str == "SUPER_ADMIN":
        # Unrestricted
        pass
    elif role_str == "COURIER_ADMIN":
        effective_courier_id = current_user.courier_id
    else:
        effective_courier_id = current_user.courier_id
        effective_hub_id = current_user.hub_id

    total = count_shipments(
        db=db,
        hub_id=effective_hub_id,
        courier_id=effective_courier_id,
        direction=direction,
        current_status=current_status,
        search=search,
    )
    if response:
        response.headers["X-Total-Count"] = str(total)

    shipments = get_shipments(
        db=db,
        hub_id=effective_hub_id,
        courier_id=effective_courier_id,
        direction=direction,
        current_status=current_status,
        search=search,
        skip=skip,
        limit=limit,
    )
    return [ShipmentResponse.model_validate(s) for s in shipments]


@router.get("/{shipment_id}", response_model=ShipmentResponse)
def get_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
) -> ShipmentResponse:
    """Retrieves single shipment manifest detail with parcels."""
    shipment = get_shipment_by_id(db, shipment_id)
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with ID {shipment_id} not found",
        )

    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != "SUPER_ADMIN" and shipment.courier_id != current_user.courier_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Shipment #{shipment_id} belongs to another courier partner.",
        )

    return ShipmentResponse.model_validate(shipment)


@router.put("/{shipment_id}/receive", response_model=ShipmentResponse)
def receive_incoming_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER", "CLERK", "WAREHOUSE_STAFF")),
) -> ShipmentResponse:
    """Receives and scans incoming shipment at destination hub with tenant validation."""
    shipment = get_shipment_by_id(db, shipment_id)
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with ID {shipment_id} not found",
        )

    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != "SUPER_ADMIN":
        if shipment.courier_id != current_user.courier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Shipment #{shipment_id} belongs to another courier partner.",
            )
        if role_str not in ("COURIER_ADMIN", "SUPER_ADMIN") and current_user.hub_id != shipment.to_hub_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Regional Scope Violation: Shipment {shipment_id} is destined for Hub {shipment.to_hub_id}. Personnel at Hub {current_user.hub_id} cannot receive it.",
            )

    shipment = receive_shipment(db, shipment_id, current_user)
    return ShipmentResponse.model_validate(shipment)
