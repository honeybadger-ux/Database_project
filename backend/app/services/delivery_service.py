from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session

from app.models.delivery import DeliveryAttempt
from app.models.employee import Employee
from app.schemas.delivery import DeliveryAttemptCreate


def record_delivery_attempt(
    db: Session,
    data: DeliveryAttemptCreate,
    employee: Employee,
) -> DeliveryAttempt:
    """Atomically records a delivery attempt and transitions parcel state via fn_record_delivery_attempt."""
    try:
        outcome_val = (
            data.outcome.value
            if hasattr(data.outcome, "value")
            else str(data.outcome)
        )
        stmt = text(
            """
            SELECT fn_record_delivery_attempt(
                :parcel_id,
                :employee_id,
                CAST(:outcome AS delivery_outcome),
                :recipient_name,
                :signature_collected,
                :remarks
            )
            """
        )
        db.execute(
            stmt,
            {
                "parcel_id": data.parcel_id,
                "employee_id": employee.employee_id,
                "outcome": outcome_val,
                "recipient_name": data.recipient_name,
                "signature_collected": data.signature_collected,
                "remarks": data.remarks,
            },
        )
        db.commit()

        attempt = (
            db.query(DeliveryAttempt)
            .filter(DeliveryAttempt.parcel_id == data.parcel_id)
            .order_by(DeliveryAttempt.attempt_number.desc())
            .first()
        )
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Delivery attempt was processed but could not be retrieved",
            )
        return attempt
    except (IntegrityError, DBAPIError) as exc:
        db.rollback()
        error_msg = str(getattr(exc, "orig", exc))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
