from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from app.models.enums import ParcelStatus, ParcelType
from app.schemas.customer import CustomerResponse
from app.schemas.delivery import DeliveryAttemptResponse
from app.schemas.hub import HubResponse
from app.schemas.tracking import TrackingHistoryResponse


class ParcelBase(BaseModel):
    sender_id: int
    receiver_id: int
    origin_hub_id: int
    destination_hub_id: int
    courier_id: Optional[int] = 1
    seller_id: Optional[int] = None
    parcel_type: ParcelType = ParcelType.SMALL_PACKAGE
    weight_kg: Decimal
    length_cm: Decimal
    width_cm: Decimal
    height_cm: Decimal
    declared_value: Decimal = Decimal("0.00")
    estimated_delivery_date: Optional[date] = None
    special_instructions: Optional[str] = None


class ParcelCreate(ParcelBase):
    pass


class ParcelStatusUpdate(BaseModel):
    status: ParcelStatus
    hub_id: Optional[int] = None
    remarks: Optional[str] = None


class ParcelResponse(ParcelBase):
    parcel_id: int
    tracking_number: str
    current_hub_id: Optional[int] = None
    current_status: ParcelStatus
    max_delivery_attempts: int
    created_at: datetime
    updated_at: datetime
    origin_hub_name: Optional[str] = None
    destination_hub_name: Optional[str] = None
    current_hub_name: Optional[str] = None
    sender_name: Optional[str] = None
    sender_city: Optional[str] = None
    sender_state: Optional[str] = None
    sender_email: Optional[str] = None
    sender_phone: Optional[str] = None
    sender_address: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_city: Optional[str] = None
    receiver_state: Optional[str] = None
    receiver_email: Optional[str] = None
    receiver_phone: Optional[str] = None
    receiver_address: Optional[str] = None
    courier_name: Optional[str] = None
    courier_code: Optional[str] = None
    seller_company_name: Optional[str] = None
    dispute_status: Optional[str] = "NONE"

    model_config = ConfigDict(from_attributes=True)


class ParcelTrackingResponse(ParcelResponse):
    sender: Optional[CustomerResponse] = None
    receiver: Optional[CustomerResponse] = None
    origin_hub: Optional[HubResponse] = None
    destination_hub: Optional[HubResponse] = None
    current_hub: Optional[HubResponse] = None
    tracking_events: List[TrackingHistoryResponse] = []
    delivery_attempts: List[DeliveryAttemptResponse] = []

    model_config = ConfigDict(from_attributes=True)
