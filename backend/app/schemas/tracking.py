from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.models.enums import ParcelStatus
from app.schemas.hub import HubResponse


class TrackingHistoryBase(BaseModel):
    status: ParcelStatus
    remarks: Optional[str] = None


class TrackingHistoryCreate(TrackingHistoryBase):
    parcel_id: int
    hub_id: Optional[int] = None


class TrackingHistoryResponse(TrackingHistoryBase):
    tracking_id: int
    parcel_id: int
    hub_id: Optional[int] = None
    employee_id: Optional[int] = None
    created_at: datetime
    hub_name: Optional[str] = None
    employee_name: Optional[str] = None
    hub: Optional[HubResponse] = None

    model_config = ConfigDict(from_attributes=True)
