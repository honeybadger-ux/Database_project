from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DisputeCreate(BaseModel):
    parcel_id: int
    raised_by_type: str = "CUSTOMER"  # 'CUSTOMER', 'SELLER', 'COURIER'
    raised_by_name: Optional[str] = None
    raised_by_email: Optional[str] = None
    reason: str


class DisputeResolveRequest(BaseModel):
    status: str  # 'RESOLVED', 'REJECTED', 'IN_INVESTIGATION'
    resolution_notes: str


class DisputeResponse(BaseModel):
    dispute_id: int
    parcel_id: int
    raised_by_type: str
    raised_by_name: Optional[str] = None
    raised_by_email: Optional[str] = None
    courier_id: Optional[int] = None
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    reason: str
    status: str
    resolution_notes: Optional[str] = None
    resolved_by: Optional[int] = None
    resolver_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
