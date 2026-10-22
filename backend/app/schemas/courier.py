from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CourierCompanyBase(BaseModel):
    name: str
    code: str
    base_rate: Decimal = Decimal("40.00")
    rating: Decimal = Decimal("4.50")
    tracking_url_prefix: Optional[str] = None
    is_active: bool = True


class CourierCompanyCreate(CourierCompanyBase):
    pass


class CourierCompanyUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    base_rate: Optional[Decimal] = None
    rating: Optional[Decimal] = None
    tracking_url_prefix: Optional[str] = None
    is_active: Optional[bool] = None


class CourierCompanyResponse(CourierCompanyBase):
    courier_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
