from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.models.enums import HubType


class HubBase(BaseModel):
    hub_name: str
    hub_type: HubType
    courier_id: Optional[int] = 1
    address: str
    city: str
    state: str
    pincode: str
    phone: Optional[str] = None
    is_active: bool = True


class HubCreate(HubBase):
    pass


class HubUpdate(BaseModel):
    hub_name: Optional[str] = None
    hub_type: Optional[HubType] = None
    courier_id: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class HubResponse(HubBase):
    hub_id: int
    created_at: datetime
    courier_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
