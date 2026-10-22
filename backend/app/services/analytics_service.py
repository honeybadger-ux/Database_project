from typing import List, Optional
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.enums import ParcelStatus
from app.models.hub import Hub
from app.models.parcel import Parcel
from app.models.shipment import Shipment
from app.schemas.analytics import (
    DeliveryRate,
    HubThroughput,
    OverviewStats,
    StatusDistribution,
    TransitTime,
)


def get_overview_stats(
    db: Session,
    hub_id: Optional[int] = None,
    courier_id: Optional[int] = None,
) -> OverviewStats:
    """Computes high-level system metrics (globally, per courier tenant, or scoped to a regional hub)."""
    parcel_q = db.query(Parcel)
    hub_q = db.query(Hub)
    emp_q = db.query(Employee)
    ship_q = db.query(Shipment)

    if courier_id is not None:
        parcel_q = parcel_q.filter(Parcel.courier_id == courier_id)
        hub_q = hub_q.filter(Hub.courier_id == courier_id)
        emp_q = emp_q.filter(Employee.courier_id == courier_id)
        ship_q = ship_q.filter(Shipment.courier_id == courier_id)

    if hub_id is not None:
        parcel_scope = (
            (Parcel.origin_hub_id == hub_id)
            | (Parcel.destination_hub_id == hub_id)
            | (Parcel.current_hub_id == hub_id)
        )
        total_parcels = parcel_q.filter(parcel_scope).count()
        active_parcels = parcel_q.filter(
            parcel_scope,
            Parcel.current_status.notin_(
                [ParcelStatus.DELIVERED, ParcelStatus.RETURNED_TO_SENDER, ParcelStatus.CANCELLED]
            ),
        ).count()
        delivered_parcels = parcel_q.filter(
            Parcel.destination_hub_id == hub_id,
            Parcel.current_status == ParcelStatus.DELIVERED,
        ).count()
        total_hubs = 1
        total_employees = emp_q.filter(Employee.hub_id == hub_id, Employee.is_active.is_(True)).count()
        total_shipments = ship_q.filter(
            (Shipment.from_hub_id == hub_id) | (Shipment.to_hub_id == hub_id)
        ).count()
    else:
        total_parcels = parcel_q.count()
        active_parcels = parcel_q.filter(
            Parcel.current_status.notin_(
                [ParcelStatus.DELIVERED, ParcelStatus.RETURNED_TO_SENDER, ParcelStatus.CANCELLED]
            )
        ).count()
        delivered_parcels = parcel_q.filter(Parcel.current_status == ParcelStatus.DELIVERED).count()
        total_hubs = hub_q.filter(Hub.is_active.is_(True)).count()
        total_employees = emp_q.filter(Employee.is_active.is_(True)).count()
        total_shipments = ship_q.count()

    return OverviewStats(
        total_parcels=total_parcels,
        active_parcels=active_parcels,
        delivered_parcels=delivered_parcels,
        total_hubs=total_hubs,
        total_employees=total_employees,
        total_shipments=total_shipments,
    )


def get_status_distribution(
    db: Session,
    hub_id: Optional[int] = None,
    courier_id: Optional[int] = None,
) -> List[StatusDistribution]:
    """Calculates breakdown of parcels across lifecycle states with carrier and hub filtering."""
    where_clauses = []
    params = {}

    if courier_id is not None:
        where_clauses.append("courier_id = :courier_id")
        params["courier_id"] = courier_id

    if hub_id is not None:
        where_clauses.append("(current_hub_id = :hub_id OR origin_hub_id = :hub_id OR destination_hub_id = :hub_id)")
        params["hub_id"] = hub_id

    where_str = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    sql = text(
        f"""
        SELECT
            current_status::TEXT AS status,
            COUNT(*) AS parcel_count,
            ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 2)::FLOAT AS percentage
        FROM parcels
        {where_str}
        GROUP BY current_status
        ORDER BY parcel_count DESC;
        """
    )
    results = db.execute(sql, params).mappings().all()

    return [
        StatusDistribution(
            status=row["status"],
            parcel_count=int(row["parcel_count"]),
            percentage=float(row["percentage"] or 0.0),
        )
        for row in results
    ]


def get_hub_throughput(
    db: Session,
    hub_id: Optional[int] = None,
    courier_id: Optional[int] = None,
) -> List[HubThroughput]:
    """Computes scanning event volume and unique parcel touch points per hub."""
    where_clauses = []
    params = {}

    if courier_id is not None:
        where_clauses.append("h.courier_id = :courier_id")
        params["courier_id"] = courier_id

    if hub_id is not None:
        where_clauses.append("h.hub_id = :hub_id")
        params["hub_id"] = hub_id

    where_str = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    sql = text(
        f"""
        SELECT
            h.hub_name,
            COUNT(th.tracking_id) AS total_events,
            COUNT(DISTINCT th.parcel_id) AS unique_parcels
        FROM hubs h
        LEFT JOIN tracking_history th ON th.hub_id = h.hub_id
        {where_str}
        GROUP BY h.hub_id, h.hub_name
        ORDER BY total_events DESC;
        """
    )
    results = db.execute(sql, params).mappings().all()

    return [
        HubThroughput(
            hub_name=row["hub_name"],
            total_events=int(row["total_events"]),
            unique_parcels=int(row["unique_parcels"]),
        )
        for row in results
    ]


def get_transit_times(
    db: Session,
    hub_id: Optional[int] = None,
    courier_id: Optional[int] = None,
) -> List[TransitTime]:
    """Calculates avg, min, and max linehaul transit durations across hub pairs."""
    where_clauses = [
        "s.status = 'ARRIVED'",
        "s.arrival_time IS NOT NULL",
        "s.dispatch_time IS NOT NULL",
    ]
    params = {}

    if courier_id is not None:
        where_clauses.append("s.courier_id = :courier_id")
        params["courier_id"] = courier_id

    if hub_id is not None:
        where_clauses.append("(s.from_hub_id = :hub_id OR s.to_hub_id = :hub_id)")
        params["hub_id"] = hub_id

    where_str = "WHERE " + " AND ".join(where_clauses)

    sql = text(
        f"""
        SELECT
            h1.hub_name AS origin_hub,
            h2.hub_name AS destination_hub,
            COUNT(s.shipment_id) AS total_shipments,
            COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (s.arrival_time - s.dispatch_time)) / 3600)::NUMERIC, 2), 0)::FLOAT AS avg_transit_hours,
            COALESCE(ROUND(MIN(EXTRACT(EPOCH FROM (s.arrival_time - s.dispatch_time)) / 3600)::NUMERIC, 2), 0)::FLOAT AS min_transit_hours,
            COALESCE(ROUND(MAX(EXTRACT(EPOCH FROM (s.arrival_time - s.dispatch_time)) / 3600)::NUMERIC, 2), 0)::FLOAT AS max_transit_hours
        FROM shipments s
        JOIN hubs h1 ON h1.hub_id = s.from_hub_id
        JOIN hubs h2 ON h2.hub_id = s.to_hub_id
        {where_str}
        GROUP BY h1.hub_name, h2.hub_name
        ORDER BY avg_transit_hours DESC;
        """
    )
    results = db.execute(sql, params).mappings().all()

    return [
        TransitTime(
            origin_hub=row["origin_hub"],
            destination_hub=row["destination_hub"],
            total_shipments=int(row["total_shipments"]),
            avg_transit_hours=float(row["avg_transit_hours"]),
            min_transit_hours=float(row["min_transit_hours"]),
            max_transit_hours=float(row["max_transit_hours"]),
        )
        for row in results
    ]


def get_delivery_rates(
    db: Session,
    hub_id: Optional[int] = None,
    courier_id: Optional[int] = None,
) -> List[DeliveryRate]:
    """Calculates delivery attempt outcomes and signature acquisition rates."""
    where_clauses = []
    params = {}

    if courier_id is not None:
        where_clauses.append("e.courier_id = :courier_id")
        params["courier_id"] = courier_id

    if hub_id is not None:
        where_clauses.append("e.hub_id = :hub_id")
        params["hub_id"] = hub_id

    where_str = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    sql = text(
        f"""
        SELECT
            da.outcome::TEXT AS outcome,
            COUNT(*) AS attempt_count,
            ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 2)::FLOAT AS rate_percentage,
            COUNT(*) FILTER (WHERE da.signature_collected = TRUE) AS signatures_obtained
        FROM delivery_attempts da
        JOIN employees e ON e.employee_id = da.employee_id
        {where_str}
        GROUP BY da.outcome
        ORDER BY attempt_count DESC;
        """
    )
    results = db.execute(sql, params).mappings().all()

    return [
        DeliveryRate(
            outcome=row["outcome"],
            attempt_count=int(row["attempt_count"]),
            rate_percentage=float(row["rate_percentage"] or 0.0),
            signatures_obtained=int(row["signatures_obtained"]),
        )
        for row in results
    ]
