from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.employee import Employee
from app.models.enums import ShipmentStatus
from app.models.shipment import Shipment
from app.schemas.shipment import ShipmentCreate


def get_shipment_by_id(db: Session, shipment_id: int) -> Optional[Shipment]:
    """Fetch single shipment with hubs, employees, courier, and parcels loaded."""
    return (
        db.query(Shipment)
        .options(
            joinedload(Shipment.from_hub),
            joinedload(Shipment.to_hub),
            joinedload(Shipment.dispatched_by_employee),
            joinedload(Shipment.received_by_employee),
            joinedload(Shipment.courier),
            selectinload(Shipment.parcels),
        )
        .filter(Shipment.shipment_id == shipment_id)
        .first()
    )


def create_shipment(
    db: Session,
    data: ShipmentCreate,
    employee: Employee,
    origin_hub_id: Optional[int] = None,
) -> Shipment:
    """Dispatches a shipment atomically via the stored procedure fn_dispatch_shipment."""
    if not data.parcel_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="parcel_ids list cannot be empty for shipment dispatch",
        )

    effective_from_hub_id = origin_hub_id or getattr(data, "from_hub_id", None) or employee.hub_id or 1

    # Format as PostgreSQL array literal, e.g. '{1,2,3}'
    parcel_ids_literal = "{" + ",".join(str(int(pid)) for pid in data.parcel_ids) + "}"

    try:
        stmt = text(
            """
            SELECT fn_dispatch_shipment(
                :from_hub_id,
                :to_hub_id,
                :employee_id,
                :vehicle_number,
                CAST(:parcel_ids AS BIGINT[])
            )
            """
        )
        result = db.execute(
            stmt,
            {
                "from_hub_id": effective_from_hub_id,
                "to_hub_id": data.to_hub_id,
                "employee_id": employee.employee_id,
                "vehicle_number": data.vehicle_number,
                "parcel_ids": parcel_ids_literal,
            },
        )
        shipment_id = result.scalar()
        db.commit()

        if not shipment_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to dispatch shipment: procedure did not return shipment ID",
            )

        shipment = get_shipment_by_id(db, shipment_id)
        if not shipment:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Shipment created but could not be retrieved",
            )
        return shipment
    except (IntegrityError, DBAPIError) as exc:
        db.rollback()
        error_msg = str(getattr(exc, "orig", exc))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)


def receive_shipment(db: Session, shipment_id: int, employee: Employee) -> Shipment:
    """Receives an incoming shipment atomically via fn_receive_shipment."""
    shipment = db.query(Shipment).filter(Shipment.shipment_id == shipment_id).first()
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with ID {shipment_id} not found",
        )

    if shipment.status != ShipmentStatus.DISPATCHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shipment cannot be received because current status is '{shipment.status.value}', expected 'DISPATCHED'",
        )

    try:
        stmt = text(
            """
            SELECT fn_receive_shipment(
                :shipment_id,
                :employee_id
            )
            """
        )
        db.execute(
            stmt,
            {
                "shipment_id": shipment_id,
                "employee_id": employee.employee_id,
            },
        )
        db.commit()

        updated_shipment = get_shipment_by_id(db, shipment_id)
        return updated_shipment
    except (IntegrityError, DBAPIError) as exc:
        db.rollback()
        error_msg = str(getattr(exc, "orig", exc))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)


def get_shipments(
    db: Session,
    hub_id: Optional[int] = None,
    courier_id: Optional[int] = None,
    direction: Optional[str] = None,
    current_status: Optional[ShipmentStatus] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Shipment]:
    """List shipments with carrier tenant, direction, status, and search filtering."""
    query = db.query(Shipment).options(
        joinedload(Shipment.from_hub),
        joinedload(Shipment.to_hub),
        joinedload(Shipment.dispatched_by_employee),
        joinedload(Shipment.received_by_employee),
        joinedload(Shipment.courier),
        selectinload(Shipment.parcels),
    )

    if courier_id is not None:
        query = query.filter(Shipment.courier_id == courier_id)

    if hub_id is not None:
        if direction == "inbound":
            query = query.filter(Shipment.to_hub_id == hub_id)
        elif direction == "outbound":
            query = query.filter(Shipment.from_hub_id == hub_id)
        else:
            query = query.filter(
                (Shipment.from_hub_id == hub_id) | (Shipment.to_hub_id == hub_id)
            )

    if current_status is not None:
        query = query.filter(Shipment.status == current_status)

    if search and search.strip():
        term = f"%{search.strip()}%"
        from app.models.hub import Hub
        from sqlalchemy.orm import aliased
        from_hub_alias = aliased(Hub)
        to_hub_alias = aliased(Hub)
        query = (
            query.join(from_hub_alias, Shipment.from_hub_id == from_hub_alias.hub_id)
            .join(to_hub_alias, Shipment.to_hub_id == to_hub_alias.hub_id)
        )
        if search.strip().isdigit():
            query = query.filter(
                (Shipment.shipment_id == int(search.strip()))
                | (Shipment.vehicle_number.ilike(term))
                | (from_hub_alias.hub_name.ilike(term))
                | (to_hub_alias.hub_name.ilike(term))
            )
        else:
            query = query.filter(
                (Shipment.vehicle_number.ilike(term))
                | (from_hub_alias.hub_name.ilike(term))
                | (to_hub_alias.hub_name.ilike(term))
            )

    return (
        query.order_by(Shipment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def count_shipments(
    db: Session,
    hub_id: Optional[int] = None,
    courier_id: Optional[int] = None,
    direction: Optional[str] = None,
    current_status: Optional[ShipmentStatus] = None,
    search: Optional[str] = None,
) -> int:
    """Count total shipments matching the carrier, direction, hub, status, and search filters."""
    query = db.query(Shipment)
    if courier_id is not None:
        query = query.filter(Shipment.courier_id == courier_id)
    if hub_id is not None:
        if direction == "inbound":
            query = query.filter(Shipment.to_hub_id == hub_id)
        elif direction == "outbound":
            query = query.filter(Shipment.from_hub_id == hub_id)
        else:
            query = query.filter(
                (Shipment.from_hub_id == hub_id) | (Shipment.to_hub_id == hub_id)
            )

    if current_status is not None:
        query = query.filter(Shipment.status == current_status)

    if search and search.strip():
        term = f"%{search.strip()}%"
        from app.models.hub import Hub
        from sqlalchemy.orm import aliased
        from_hub_alias = aliased(Hub)
        to_hub_alias = aliased(Hub)
        query = (
            query.join(from_hub_alias, Shipment.from_hub_id == from_hub_alias.hub_id)
            .join(to_hub_alias, Shipment.to_hub_id == to_hub_alias.hub_id)
        )
        if search.strip().isdigit():
            query = query.filter(
                (Shipment.shipment_id == int(search.strip()))
                | (Shipment.vehicle_number.ilike(term))
                | (from_hub_alias.hub_name.ilike(term))
                | (to_hub_alias.hub_name.ilike(term))
            )
        else:
            query = query.filter(
                (Shipment.vehicle_number.ilike(term))
                | (from_hub_alias.hub_name.ilike(term))
                | (to_hub_alias.hub_name.ilike(term))
            )

    return query.count()


