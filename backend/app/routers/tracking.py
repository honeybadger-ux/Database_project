from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dispute import Dispute
from app.schemas.dispute import DisputeCreate, DisputeResponse
from app.schemas.parcel import ParcelTrackingResponse
from app.services.parcel_service import get_parcel_by_tracking

router = APIRouter(prefix="/api/track", tags=["Public Tracking"])


@router.get("/{tracking_number}", response_model=ParcelTrackingResponse)
def track_parcel(
    tracking_number: str,
    db: Session = Depends(get_db),
) -> ParcelTrackingResponse:
    """Public tracking endpoint to view parcel status, routing journey, carrier fulfillment, and delivery attempts."""
    parcel = get_parcel_by_tracking(db, tracking_number.strip().upper())
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No parcel found with tracking number '{tracking_number}'",
        )
    return ParcelTrackingResponse.model_validate(parcel)


@router.post("/{tracking_number}/dispute", response_model=DisputeResponse, status_code=status.HTTP_201_CREATED)
def raise_parcel_dispute(
    tracking_number: str,
    dispute_in: DisputeCreate,
    db: Session = Depends(get_db),
) -> DisputeResponse:
    """Allows an end customer or sender to raise a dispute/complaint for unresolved shipping delays or damage."""
    parcel = get_parcel_by_tracking(db, tracking_number.strip().upper())
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No parcel found with tracking number '{tracking_number}'",
        )

    # Mark parcel dispute status
    parcel.dispute_status = "OPEN"

    dispute = Dispute(
        parcel_id=parcel.parcel_id,
        raised_by_type=dispute_in.raised_by_type.upper(),
        raised_by_name=dispute_in.raised_by_name,
        raised_by_email=dispute_in.raised_by_email,
        reason=dispute_in.reason,
        status="OPEN",
    )
    db.add(dispute)
    db.commit()
    db.refresh(dispute)

    return DisputeResponse(
        dispute_id=dispute.dispute_id,
        parcel_id=parcel.parcel_id,
        raised_by_type=dispute.raised_by_type,
        raised_by_name=dispute.raised_by_name,
        raised_by_email=dispute.raised_by_email,
        courier_id=parcel.courier_id,
        courier_name=parcel.courier.name if parcel.courier else None,
        tracking_number=parcel.tracking_number,
        reason=dispute.reason,
        status=dispute.status,
        resolution_notes=None,
        resolved_by=None,
        resolver_name=None,
        created_at=dispute.created_at,
        updated_at=dispute.updated_at,
    )
