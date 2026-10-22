-- ============================================================================
-- SCRIPT:      003_create_indexes.sql
-- DESCRIPTION: B-Tree, composite, and partial performance indexes
-- ============================================================================

-- ── Customer Lookups ────────────────────────────────────────────────────────
CREATE INDEX idx_customers_phone ON customers (phone);

-- ── Employee Lookups (filtered to active only) ──────────────────────────────
CREATE INDEX idx_employees_hub_active ON employees (hub_id) WHERE is_active = TRUE;
CREATE INDEX idx_employees_role       ON employees (role);

-- ── Parcel FK Indexes (customer-facing queries) ─────────────────────────────
CREATE INDEX idx_parcels_sender   ON parcels (sender_id);
CREATE INDEX idx_parcels_receiver ON parcels (receiver_id);

-- ── Partial index: active pipeline parcels (excludes terminal states) ───────
CREATE INDEX idx_parcels_active ON parcels (current_status)
    WHERE current_status NOT IN ('DELIVERED', 'RETURNED_TO_SENDER', 'CANCELLED');

-- ── Partial index: current hub inventory (parcels physically at a hub) ──────
CREATE INDEX idx_parcels_current_hub ON parcels (current_hub_id)
    WHERE current_hub_id IS NOT NULL;

-- ── Tracking History: time-series lookups ───────────────────────────────────
CREATE INDEX idx_tracking_parcel_time ON tracking_history (parcel_id, created_at DESC);
CREATE INDEX idx_tracking_hub_time    ON tracking_history (hub_id, created_at DESC);

-- ── Shipment: dispatch & arrival query patterns ─────────────────────────────
CREATE INDEX idx_shipments_from_hub ON shipments (from_hub_id, dispatch_time DESC);
CREATE INDEX idx_shipments_to_hub   ON shipments (to_hub_id, arrival_time DESC);
CREATE INDEX idx_shipments_status   ON shipments (status);

-- ── Shipment Manifest: reverse parcel → shipment lookup ─────────────────────
CREATE INDEX idx_shipment_parcels_parcel ON shipment_parcels (parcel_id);

-- ── Delivery Attempts: parcel sequencing ────────────────────────────────────
CREATE INDEX idx_delivery_attempts_parcel ON delivery_attempts (parcel_id, attempt_number);
