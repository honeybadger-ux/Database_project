from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_serializer

from app.models.enums import ParcelType


class SellerBase(BaseModel):
    company_name: str
    contact_email: str
    contact_phone: str
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_active: bool = True


class SellerCreate(SellerBase):
    password: Optional[str] = "password123"


class SellerUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_active: Optional[bool] = None


class SellerResponse(SellerBase):
    seller_id: int
    api_key: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("api_key")
    def mask_api_key(self, key: str) -> str:
        """Masks sensitive live API keys for zero leakage."""
        if not key:
            return ""
        if len(key) <= 12:
            return "sk_live_***"
        return f"{key[:10]}...{key[-4:]}"


class SellerDirectoryItem(BaseModel):
    """Safe public merchant directory item for authentication & demo selection."""
    seller_id: int
    company_name: str
    contact_email: str
    city: Optional[str] = None
    state: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SellerLoginRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    api_key: Optional[str] = None


class SellerTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    seller: SellerResponse


class SellerOrderCreate(BaseModel):
    seller_id: Optional[int] = None  # Populated from authenticated JWT
    courier_id: int
    origin_hub_id: Optional[int] = None
    destination_hub_id: Optional[int] = None

    sender_name: str
    sender_phone: str
    sender_email: str
    sender_address: str
    sender_city: str
    sender_state: str
    sender_pincode: str

    receiver_name: str
    receiver_phone: str
    receiver_email: str
    receiver_address: str
    receiver_city: str
    receiver_state: str
    receiver_pincode: str

    parcel_type: ParcelType = ParcelType.SMALL_PACKAGE
    weight_kg: Decimal
    length_cm: Decimal = Decimal("10.00")
    width_cm: Decimal = Decimal("10.00")
    height_cm: Decimal = Decimal("10.00")
    declared_value: Decimal = Decimal("500.00")
    special_instructions: Optional[str] = None


class SellerStatsResponse(BaseModel):
    seller_id: int
    company_name: str
    total_orders: int
    active_orders: int
    delivered_orders: int
    total_shipping_spend: Decimal
