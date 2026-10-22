from datetime import datetime
from typing import Optional
from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ParcelStatus


class TrackingHistory(Base):
    __tablename__ = "tracking_history"

    tracking_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    parcel_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("parcels.parcel_id", ondelete="RESTRICT"),
        nullable=False,
    )
    hub_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("hubs.hub_id", ondelete="RESTRICT"),
        nullable=True,
    )
    employee_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("employees.employee_id", ondelete="RESTRICT"),
        nullable=True,
    )
    status: Mapped[ParcelStatus] = mapped_column(
        Enum(ParcelStatus, name="parcel_status", create_type=False),
        nullable=False,
    )
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    parcel: Mapped["Parcel"] = relationship(
        "Parcel",
        back_populates="tracking_events",
    )
    hub: Mapped[Optional["Hub"]] = relationship(
        "Hub",
        foreign_keys=[hub_id],
    )
    employee: Mapped[Optional["Employee"]] = relationship(
        "Employee",
        foreign_keys=[employee_id],
    )

    @property
    def hub_name(self) -> Optional[str]:
        return self.hub.hub_name if self.hub else None

    @property
    def employee_name(self) -> Optional[str]:
        return self.employee.full_name if self.employee else None

