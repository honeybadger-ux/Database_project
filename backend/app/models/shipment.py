from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ShipmentStatus


class ShipmentParcel(Base):
    __tablename__ = "shipment_parcels"

    shipment_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("shipments.shipment_id", ondelete="CASCADE"),
        primary_key=True,
    )
    parcel_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("parcels.parcel_id", ondelete="RESTRICT"),
        primary_key=True,
    )
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Shipment(Base):
    __tablename__ = "shipments"

    shipment_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    from_hub_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("hubs.hub_id", ondelete="RESTRICT"),
        nullable=False,
    )
    to_hub_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("hubs.hub_id", ondelete="RESTRICT"),
        nullable=False,
    )
    courier_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("courier_companies.courier_id", ondelete="RESTRICT"),
        default=1,
        nullable=False,
        index=True,
    )
    dispatched_by: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("employees.employee_id", ondelete="RESTRICT"),
        nullable=False,
    )
    received_by: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("employees.employee_id", ondelete="RESTRICT"),
        nullable=True,
    )
    vehicle_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    status: Mapped[ShipmentStatus] = mapped_column(
        Enum(ShipmentStatus, name="shipment_status", create_type=False),
        default=ShipmentStatus.LOADING,
        nullable=False,
    )
    dispatch_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    arrival_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    courier: Mapped["CourierCompany"] = relationship("CourierCompany", back_populates="shipments")
    from_hub: Mapped["Hub"] = relationship(
        "Hub",
        foreign_keys=[from_hub_id],
    )
    to_hub: Mapped["Hub"] = relationship(
        "Hub",
        foreign_keys=[to_hub_id],
    )
    dispatched_by_employee: Mapped["Employee"] = relationship(
        "Employee",
        foreign_keys=[dispatched_by],
    )
    received_by_employee: Mapped[Optional["Employee"]] = relationship(
        "Employee",
        foreign_keys=[received_by],
    )
    parcels: Mapped[List["Parcel"]] = relationship(
        "Parcel",
        secondary="shipment_parcels",
        back_populates="shipments",
    )

    @property
    def from_hub_name(self) -> Optional[str]:
        return self.from_hub.hub_name if self.from_hub else None

    @property
    def to_hub_name(self) -> Optional[str]:
        return self.to_hub.hub_name if self.to_hub else None

    @property
    def parcel_count(self) -> int:
        return len(self.parcels) if self.parcels else 0

