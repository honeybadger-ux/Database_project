from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.models.enums import DeliveryOutcome


class DeliveryAttemptBase(BaseModel):
    outcome: DeliveryOutcome
    recipient_name: Optional[str] = None
    signature_collected: bool = False
    remarks: Optional[str] = None


class DeliveryAttemptCreate(DeliveryAttemptBase):
    parcel_id: int


class DeliveryAttemptResponse(DeliveryAttemptBase):
    attempt_id: int
    parcel_id: int
    employee_id: int
    attempt_number: int
    attempted_at: datetime

    model_config = ConfigDict(from_attributes=True)
