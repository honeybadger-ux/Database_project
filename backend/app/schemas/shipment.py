from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from app.models.enums import ShipmentStatus
from app.schemas.employee import EmployeeResponse
from app.schemas.hub import HubResponse
from app.schemas.parcel import ParcelResponse


class ShipmentBase(BaseModel):
    to_hub_id: int
    from_hub_id: Optional[int] = None
    vehicle_number: Optional[str] = None


class ShipmentCreate(ShipmentBase):
    parcel_ids: List[int]


class ShipmentResponse(BaseModel):
    shipment_id: int
    courier_id: Optional[int] = None
    from_hub_id: int
    to_hub_id: int
    dispatched_by: int
    received_by: Optional[int] = None
    vehicle_number: Optional[str] = None
    status: ShipmentStatus
    dispatch_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    created_at: datetime
    from_hub_name: Optional[str] = None
    to_hub_name: Optional[str] = None
    parcel_count: Optional[int] = None
    from_hub: Optional[HubResponse] = None
    to_hub: Optional[HubResponse] = None
    dispatched_by_employee: Optional[EmployeeResponse] = None
    received_by_employee: Optional[EmployeeResponse] = None
    parcels: List[ParcelResponse] = []

    model_config = ConfigDict(from_attributes=True)
