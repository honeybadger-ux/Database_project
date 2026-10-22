from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ParcelStatus, ParcelType


class Parcel(Base):
    __tablename__ = "parcels"

    parcel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tracking_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    sender_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.customer_id", ondelete="RESTRICT"),
        nullable=False,
    )
    receiver_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.customer_id", ondelete="RESTRICT"),
        nullable=False,
    )
    origin_hub_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("hubs.hub_id", ondelete="RESTRICT"),
        nullable=False,
    )
    destination_hub_id: Mapped[int] = mapped_column(
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
    seller_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("sellers.seller_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    dispute_status: Mapped[str] = mapped_column(String(30), default="NONE", nullable=False)
    current_hub_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("hubs.hub_id", ondelete="RESTRICT"),
        nullable=True,
    )
    current_status: Mapped[ParcelStatus] = mapped_column(
        Enum(ParcelStatus, name="parcel_status", create_type=False),
        default=ParcelStatus.REGISTERED,
        nullable=False,
    )
    parcel_type: Mapped[ParcelType] = mapped_column(
        Enum(ParcelType, name="parcel_type", create_type=False),
        default=ParcelType.SMALL_PACKAGE,
        nullable=False,
    )
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    length_cm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    width_cm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    height_cm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    declared_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    estimated_delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    max_delivery_attempts: Mapped[int] = mapped_column(SmallInteger, default=3, nullable=False)
    special_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    courier: Mapped["CourierCompany"] = relationship("CourierCompany", back_populates="parcels")
    seller: Mapped[Optional["Seller"]] = relationship("Seller", back_populates="parcels")
    disputes: Mapped[List["Dispute"]] = relationship("Dispute", back_populates="parcel")
    sender: Mapped["Customer"] = relationship(
        "Customer",
        foreign_keys=[sender_id],
        back_populates="parcels_sent",
    )
    receiver: Mapped["Customer"] = relationship(
        "Customer",
        foreign_keys=[receiver_id],
        back_populates="parcels_received",
    )
    origin_hub: Mapped["Hub"] = relationship(
        "Hub",
        foreign_keys=[origin_hub_id],
    )
    destination_hub: Mapped["Hub"] = relationship(
        "Hub",
        foreign_keys=[destination_hub_id],
    )
    current_hub: Mapped[Optional["Hub"]] = relationship(
        "Hub",
        foreign_keys=[current_hub_id],
    )
    tracking_events: Mapped[List["TrackingHistory"]] = relationship(
        "TrackingHistory",
        back_populates="parcel",
        order_by="TrackingHistory.created_at.asc()",
    )
    delivery_attempts: Mapped[List["DeliveryAttempt"]] = relationship(
        "DeliveryAttempt",
        back_populates="parcel",
        order_by="DeliveryAttempt.attempt_number.asc()",
    )
    shipments: Mapped[List["Shipment"]] = relationship(
        "Shipment",
        secondary="shipment_parcels",
        back_populates="parcels",
    )

    @property
    def courier_name(self) -> Optional[str]:
        return self.courier.name if self.courier else None

    @property
    def courier_code(self) -> Optional[str]:
        return self.courier.code if self.courier else None

    @property
    def seller_company_name(self) -> Optional[str]:
        return self.seller.company_name if self.seller else None

    @property
    def origin_hub_name(self) -> Optional[str]:
        return self.origin_hub.hub_name if self.origin_hub else None

    @property
    def destination_hub_name(self) -> Optional[str]:
        return self.destination_hub.hub_name if self.destination_hub else None

    @property
    def current_hub_name(self) -> Optional[str]:
        return self.current_hub.hub_name if self.current_hub else None

    @property
    def sender_name(self) -> Optional[str]:
        return self.sender.full_name if self.sender else None

    @property
    def sender_city(self) -> Optional[str]:
        return self.sender.city if self.sender else None

    @property
    def sender_state(self) -> Optional[str]:
        return self.sender.state if self.sender else None

    @property
    def sender_email(self) -> Optional[str]:
        return self.sender.email if self.sender else None

    @property
    def sender_phone(self) -> Optional[str]:
        return self.sender.phone if self.sender else None

    @property
    def sender_address(self) -> Optional[str]:
        if not self.sender:
            return None
        parts = [self.sender.address_line1, self.sender.address_line2, self.sender.city, self.sender.state, self.sender.pincode]
        return ", ".join(p for p in parts if p)

    @property
    def receiver_name(self) -> Optional[str]:
        return self.receiver.full_name if self.receiver else None

    @property
    def receiver_city(self) -> Optional[str]:
        return self.receiver.city if self.receiver else None

    @property
    def receiver_state(self) -> Optional[str]:
        return self.receiver.state if self.receiver else None

    @property
    def receiver_email(self) -> Optional[str]:
        return self.receiver.email if self.receiver else None

    @property
    def receiver_phone(self) -> Optional[str]:
        return self.receiver.phone if self.receiver else None

    @property
    def receiver_address(self) -> Optional[str]:
        if not self.receiver:
            return None
        parts = [self.receiver.address_line1, self.receiver.address_line2, self.receiver.city, self.receiver.state, self.receiver.pincode]
        return ", ".join(p for p in parts if p)

