from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.jwt import require_role
from app.database import get_db
from app.models.employee import Employee
from app.models.enums import ParcelStatus
from app.schemas.delivery import DeliveryAttemptCreate, DeliveryAttemptResponse
from app.services.delivery_service import record_delivery_attempt
from app.services.parcel_service import get_parcel_by_id

router = APIRouter(prefix="/api/delivery-attempts", tags=["Delivery"])


@router.post("", response_model=DeliveryAttemptResponse, status_code=status.HTTP_201_CREATED)
def record_attempt(
    attempt_in: DeliveryAttemptCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("COURIER", "HUB_MANAGER", "COURIER_ADMIN", "SUPER_ADMIN")),
) -> DeliveryAttemptResponse:
    """Records a last-mile delivery attempt and updates parcel status with tenant and regional validation."""
    parcel = get_parcel_by_id(db, attempt_in.parcel_id)
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parcel with ID {attempt_in.parcel_id} not found",
        )

    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    # Carrier scoping: Staff can only record attempts for parcels assigned to their own courier company
    if role_str != "SUPER_ADMIN":
        if current_user.courier_id is not None and parcel.courier_id is not None:
            if current_user.courier_id != parcel.courier_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Carrier Scope Violation: Cannot record delivery attempt for a parcel belonging to another carrier.",
                )

    # Regional scoping: Operational delivery attempts must be performed by staff at the parcel's destination hub
    if role_str not in ("SUPER_ADMIN", "COURIER_ADMIN") and current_user.hub_id != parcel.destination_hub_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Regional Scope Violation: Parcel {parcel.tracking_number} is destined for Hub {parcel.destination_hub_id}. Personnel at Hub {current_user.hub_id} cannot attempt delivery.",
        )

    # Operational lifecycle validation: Parcel must be out for delivery or previously failed
    if parcel.current_status not in (ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.FAILED_DELIVERY):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Delivery attempt cannot be recorded: parcel is currently in '{parcel.current_status.value}' state. Must be 'OUT_FOR_DELIVERY' or 'FAILED_DELIVERY'.",
        )

    attempt = record_delivery_attempt(db, attempt_in, current_user)
    return DeliveryAttemptResponse.model_validate(attempt)
