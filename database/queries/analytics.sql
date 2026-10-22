-- ============================================================================
-- SCRIPT:      analytics.sql
-- DESCRIPTION: Advanced analytical SQL queries demonstrating CTEs,
--              window functions, aggregates, and multi-table joins.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Query 1: System-wide Pipeline Status Distribution
-- Shows how many parcels are in each lifecycle state with percentages.
-- ────────────────────────────────────────────────────────────────────────────
SELECT
    current_status,
    COUNT(*)                                                          AS parcel_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2)               AS percentage
FROM parcels
GROUP BY current_status
ORDER BY parcel_count DESC;

-- ────────────────────────────────────────────────────────────────────────────
-- Query 2: Linehaul Transit Duration Analysis Across Hub Pairs
-- Computes avg/min/max transit hours between every hub pair with completed trips.
-- ────────────────────────────────────────────────────────────────────────────
SELECT
    h1.hub_name                                                                   AS origin_hub,
    h2.hub_name                                                                   AS destination_hub,
    COUNT(s.shipment_id)                                                          AS total_shipments,
    ROUND(AVG(EXTRACT(EPOCH FROM (s.arrival_time - s.dispatch_time)) / 3600)::NUMERIC, 2) AS avg_transit_hours,
    ROUND(MIN(EXTRACT(EPOCH FROM (s.arrival_time - s.dispatch_time)) / 3600)::NUMERIC, 2) AS min_transit_hours,
    ROUND(MAX(EXTRACT(EPOCH FROM (s.arrival_time - s.dispatch_time)) / 3600)::NUMERIC, 2) AS max_transit_hours
FROM shipments s
JOIN hubs h1 ON h1.hub_id = s.from_hub_id
JOIN hubs h2 ON h2.hub_id = s.to_hub_id
WHERE s.status = 'ARRIVED'
  AND s.arrival_time IS NOT NULL
  AND s.dispatch_time IS NOT NULL
GROUP BY h1.hub_name, h2.hub_name
ORDER BY avg_transit_hours DESC;

-- ────────────────────────────────────────────────────────────────────────────
-- Query 3: Hub Dwell Time Bottleneck Detection (LEAD Window Function)
-- Measures how long parcels sit at each hub before moving to the next event.
-- ────────────────────────────────────────────────────────────────────────────
WITH event_intervals AS (
    SELECT
        th.parcel_id,
        th.hub_id,
        th.status,
        th.created_at                                               AS scan_time,
        LEAD(th.created_at) OVER (
            PARTITION BY th.parcel_id
            ORDER BY th.created_at
        )                                                           AS next_scan_time
    FROM tracking_history th
)
SELECT
    h.hub_name,
    COUNT(*)                                                                        AS scanned_packages,
    ROUND(AVG(EXTRACT(EPOCH FROM (ei.next_scan_time - ei.scan_time)) / 3600)::NUMERIC, 2) AS avg_dwell_hours,
    ROUND(MAX(EXTRACT(EPOCH FROM (ei.next_scan_time - ei.scan_time)) / 3600)::NUMERIC, 2) AS max_dwell_hours
FROM event_intervals ei
JOIN hubs h ON h.hub_id = ei.hub_id
WHERE ei.status IN ('RECEIVED_AT_ORIGIN_HUB', 'ARRIVED_AT_HUB')
  AND ei.next_scan_time IS NOT NULL
GROUP BY h.hub_name
ORDER BY avg_dwell_hours DESC;

-- ────────────────────────────────────────────────────────────────────────────
-- Query 4: Last-Mile Delivery Success Rate & Failure Root-Cause Analysis
-- ────────────────────────────────────────────────────────────────────────────
SELECT
    outcome,
    COUNT(*)                                                        AS attempt_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2)             AS rate_percentage,
    COUNT(*) FILTER (WHERE signature_collected = TRUE)              AS signatures_obtained
FROM delivery_attempts
GROUP BY outcome
ORDER BY attempt_count DESC;

-- ────────────────────────────────────────────────────────────────────────────
-- Query 5: Employee Workforce Productivity Matrix
-- Ranks employees by total events logged and unique parcels handled.
-- ────────────────────────────────────────────────────────────────────────────
SELECT
    e.employee_id,
    e.full_name,
    e.role,
    h.hub_name,
    COUNT(th.tracking_id)                                           AS total_events_logged,
    COUNT(DISTINCT th.parcel_id)                                    AS unique_parcels_handled,
    RANK() OVER (ORDER BY COUNT(th.tracking_id) DESC)               AS productivity_rank
FROM employees e
JOIN hubs h ON h.hub_id = e.hub_id
LEFT JOIN tracking_history th ON th.employee_id = e.employee_id
GROUP BY e.employee_id, e.full_name, e.role, h.hub_name
ORDER BY total_events_logged DESC;

-- ────────────────────────────────────────────────────────────────────────────
-- Query 6: Delayed Parcels (Active in Pipeline > 48 Hours)
-- Identifies parcels that have been in the pipeline too long.
-- ────────────────────────────────────────────────────────────────────────────
SELECT
    p.tracking_number,
    p.current_status,
    h_orig.hub_name                                                 AS origin,
    h_dest.hub_name                                                 AS destination,
    h_curr.hub_name                                                 AS current_location,
    ROUND((EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600)::NUMERIC, 1) AS hours_since_booking,
    p.estimated_delivery_date
FROM parcels p
JOIN hubs h_orig ON h_orig.hub_id = p.origin_hub_id
JOIN hubs h_dest ON h_dest.hub_id = p.destination_hub_id
LEFT JOIN hubs h_curr ON h_curr.hub_id = p.current_hub_id
WHERE p.current_status NOT IN ('DELIVERED', 'RETURNED_TO_SENDER', 'CANCELLED')
  AND p.created_at < NOW() - INTERVAL '48 hours'
ORDER BY p.created_at ASC;
