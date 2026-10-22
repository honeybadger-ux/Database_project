from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Boolean, DateTime, Integer, Numeric, String, UniqueConstraint, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ServiceableRegion(Base):
    __tablename__ = "serviceable_regions"

    region_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    courier_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("courier_companies.courier_id", ondelete="CASCADE"), nullable=False, index=True)
    origin_state: Mapped[str] = mapped_column(String(100), nullable=False)
    dest_state: Mapped[str] = mapped_column(String(100), nullable=False)
    estimated_transit_days: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    is_serviceable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("courier_id", "origin_state", "dest_state", name="uq_courier_route"),
    )

    courier: Mapped["CourierCompany"] = relationship("CourierCompany", back_populates="serviceable_regions")


class CourierRateCard(Base):
    __tablename__ = "courier_rate_cards"

    rate_card_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    courier_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("courier_companies.courier_id", ondelete="CASCADE"), nullable=False, index=True)
    zone_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'LOCAL', 'REGIONAL', 'METRO', 'NATIONAL', 'SPECIAL_ZONE'
    min_weight_kg: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=0.00, nullable=False)
    max_weight_kg: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=0.50, nullable=False)
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    additional_weight_step_kg: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=0.50, nullable=False)
    additional_weight_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("courier_id", "zone_type", "min_weight_kg", name="uq_courier_rate_card"),
    )

    courier: Mapped["CourierCompany"] = relationship("CourierCompany", back_populates="rate_cards")


class CourierPincodeServiceability(Base):
    __tablename__ = "courier_pincode_serviceability"

    serviceability_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    courier_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("courier_companies.courier_id", ondelete="CASCADE"), nullable=False, index=True)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    tier: Mapped[str] = mapped_column(String(20), default="TIER_1", nullable=False)
    is_pickup: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_delivery: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_cod: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    transit_days_offset: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unserviceable_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("courier_id", "pincode", name="uq_courier_pincode"),
    )

    courier: Mapped["CourierCompany"] = relationship("CourierCompany", back_populates="pincode_serviceabilities")
