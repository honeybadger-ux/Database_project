from datetime import datetime
from typing import Optional
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import DeliveryOutcome


class DeliveryAttempt(Base):
    __tablename__ = "delivery_attempts"

    attempt_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    parcel_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("parcels.parcel_id", ondelete="RESTRICT"),
        nullable=False,
    )
    employee_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("employees.employee_id", ondelete="RESTRICT"),
        nullable=False,
    )
    attempt_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    outcome: Mapped[DeliveryOutcome] = mapped_column(
        Enum(DeliveryOutcome, name="delivery_outcome", create_type=False),
        nullable=False,
    )
    recipient_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    signature_collected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    parcel: Mapped["Parcel"] = relationship(
        "Parcel",
        back_populates="delivery_attempts",
    )
    employee: Mapped["Employee"] = relationship(
        "Employee",
        foreign_keys=[employee_id],
    )
