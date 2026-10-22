from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.employee import Employee
from app.models.enums import ParcelStatus
from app.models.parcel import Parcel
from app.models.tracking import TrackingHistory
from app.schemas.parcel import ParcelCreate


def register_parcel(db: Session, data: ParcelCreate, employee: Employee) -> Parcel:
    """Registers a new parcel atomically via the stored procedure fn_register_parcel."""
    try:
        parcel_type_val = (
            data.parcel_type.value
            if hasattr(data.parcel_type, "value")
            else str(data.parcel_type)
        )
        courier_id_val = getattr(data, "courier_id", None) or getattr(employee, "courier_id", None) or 1
        seller_id_val = getattr(data, "seller_id", None)

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
                "sender_id": data.sender_id,
                "receiver_id": data.receiver_id,
                "origin_hub_id": data.origin_hub_id,
                "destination_hub_id": data.destination_hub_id,
                "parcel_type": parcel_type_val,
                "weight_kg": float(data.weight_kg),
                "length_cm": float(data.length_cm),
                "width_cm": float(data.width_cm),
                "height_cm": float(data.height_cm),
                "declared_value": float(data.declared_value),
                "special_instructions": data.special_instructions,
                "employee_id": employee.employee_id,
                "estimated_delivery": data.estimated_delivery_date,
                "courier_id": courier_id_val,
                "seller_id": seller_id_val,
            },
        )
        row = result.fetchone()
        db.commit()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to register parcel: no ID returned from stored procedure",
            )

        parcel_id = row[0]
        parcel = get_parcel_by_id(db, parcel_id)
        if not parcel:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Parcel registered but could not be retrieved",
            )
        return parcel
    except (IntegrityError, DBAPIError) as exc:
        db.rollback()
        error_msg = str(getattr(exc, "orig", exc))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)


def get_parcels(
    db: Session,
    hub_id: Optional[int] = None,
    courier_id: Optional[int] = None,
    seller_id: Optional[int] = None,
    current_status: Optional[ParcelStatus] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Parcel]:
    """Query parcels with optional filters on hub, carrier tenant, seller, status, and search query."""
    query = db.query(Parcel).options(
        joinedload(Parcel.sender),
        joinedload(Parcel.receiver),
        joinedload(Parcel.origin_hub),
        joinedload(Parcel.destination_hub),
        joinedload(Parcel.current_hub),
        joinedload(Parcel.courier),
        joinedload(Parcel.seller),
    )
    if courier_id is not None:
        query = query.filter(Parcel.courier_id == courier_id)
    if seller_id is not None:
        query = query.filter(Parcel.seller_id == seller_id)
    if hub_id is not None:
        query = query.filter(
            (Parcel.current_hub_id == hub_id)
            | (Parcel.origin_hub_id == hub_id)
            | (Parcel.destination_hub_id == hub_id)
        )
    if current_status is not None:
        query = query.filter(Parcel.current_status == current_status)

    if search and search.strip():
        term = f"%{search.strip()}%"
        from app.models.customer import Customer
        from sqlalchemy.orm import aliased
        sender_alias = aliased(Customer)
        receiver_alias = aliased(Customer)
        query = (
            query.join(sender_alias, Parcel.sender_id == sender_alias.customer_id)
            .join(receiver_alias, Parcel.receiver_id == receiver_alias.customer_id)
        )
        if search.strip().isdigit():
            query = query.filter(
                (Parcel.tracking_number.ilike(term))
                | (Parcel.parcel_id == int(search.strip()))
                | (sender_alias.full_name.ilike(term))
                | (receiver_alias.full_name.ilike(term))
            )
        else:
            query = query.filter(
                (Parcel.tracking_number.ilike(term))
                | (sender_alias.full_name.ilike(term))
                | (receiver_alias.full_name.ilike(term))
            )

    return (
        query.order_by(Parcel.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def count_parcels(
    db: Session,
    hub_id: Optional[int] = None,
    courier_id: Optional[int] = None,
    seller_id: Optional[int] = None,
    current_status: Optional[ParcelStatus] = None,
    search: Optional[str] = None,
) -> int:
    """Count total parcels matching the carrier, hub, status, and search filters."""
    query = db.query(Parcel)
    if courier_id is not None:
        query = query.filter(Parcel.courier_id == courier_id)
    if seller_id is not None:
        query = query.filter(Parcel.seller_id == seller_id)
    if hub_id is not None:
        query = query.filter(
            (Parcel.current_hub_id == hub_id)
            | (Parcel.origin_hub_id == hub_id)
            | (Parcel.destination_hub_id == hub_id)
        )
    if current_status is not None:
        query = query.filter(Parcel.current_status == current_status)

    if search and search.strip():
        term = f"%{search.strip()}%"
        from app.models.customer import Customer
        from sqlalchemy.orm import aliased
        sender_alias = aliased(Customer)
        receiver_alias = aliased(Customer)
        query = (
            query.join(sender_alias, Parcel.sender_id == sender_alias.customer_id)
            .join(receiver_alias, Parcel.receiver_id == receiver_alias.customer_id)
        )
        if search.strip().isdigit():
            query = query.filter(
                (Parcel.tracking_number.ilike(term))
                | (Parcel.parcel_id == int(search.strip()))
                | (sender_alias.full_name.ilike(term))
                | (receiver_alias.full_name.ilike(term))
            )
        else:
            query = query.filter(
                (Parcel.tracking_number.ilike(term))
                | (sender_alias.full_name.ilike(term))
                | (receiver_alias.full_name.ilike(term))
            )

    return query.count()




def get_parcel_by_id(db: Session, parcel_id: int) -> Optional[Parcel]:
    """Fetch single parcel with all related records loaded."""
    return (
        db.query(Parcel)
        .options(
            joinedload(Parcel.sender),
            joinedload(Parcel.receiver),
            joinedload(Parcel.origin_hub),
            joinedload(Parcel.destination_hub),
            joinedload(Parcel.current_hub),
            joinedload(Parcel.courier),
            joinedload(Parcel.seller),
            selectinload(Parcel.tracking_events).joinedload(TrackingHistory.hub),
            selectinload(Parcel.delivery_attempts),
        )
        .filter(Parcel.parcel_id == parcel_id)
        .first()
    )


def get_parcel_by_tracking(db: Session, tracking_number: str) -> Optional[Parcel]:
    """Fetch parcel by tracking number with complete history and attempts."""
    return (
        db.query(Parcel)
        .options(
            joinedload(Parcel.sender),
            joinedload(Parcel.receiver),
            joinedload(Parcel.origin_hub),
            joinedload(Parcel.destination_hub),
            joinedload(Parcel.current_hub),
            joinedload(Parcel.courier),
            joinedload(Parcel.seller),
            selectinload(Parcel.tracking_events).joinedload(TrackingHistory.hub),
            selectinload(Parcel.delivery_attempts),
        )
        .filter(Parcel.tracking_number == tracking_number)
        .first()
    )


def update_parcel_status(
    db: Session,
    parcel_id: int,
    new_status: ParcelStatus,
    hub_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    remarks: Optional[str] = None,
) -> TrackingHistory:
    """Inserts a new tracking event; database triggers validate transition and update parcel state."""
    parcel = db.query(Parcel).filter(Parcel.parcel_id == parcel_id).first()
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parcel with ID {parcel_id} not found",
        )

    if hub_id is None and employee_id is not None:
        emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if emp:
            hub_id = emp.hub_id

    try:
        tracking_event = TrackingHistory(
            parcel_id=parcel_id,
            hub_id=hub_id,
            employee_id=employee_id,
            status=new_status,
            remarks=remarks,
        )
        db.add(tracking_event)
        db.commit()
        db.refresh(tracking_event)
        return tracking_event
    except (IntegrityError, DBAPIError) as exc:
        db.rollback()
        error_msg = str(getattr(exc, "orig", exc))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
