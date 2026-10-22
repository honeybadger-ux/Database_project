-- ============================================================================
-- SCRIPT:      002_create_tables.sql
-- DESCRIPTION: Core entity tables, keys, constraints, and helper functions
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Tracking Number Generator
-- Simplified format: TRK0000001 — monotonic, always fits VARCHAR(20)
-- ────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE tracking_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    seq_val BIGINT;
BEGIN
    seq_val := nextval('tracking_number_seq');
    RETURN 'TRK' || LPAD(seq_val::TEXT, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- Table 1: Customers (Senders & Receivers)
-- PK: customer_id | CK: email
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE customers (
    customer_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name     VARCHAR(100)  NOT NULL,
    email         CITEXT        NOT NULL UNIQUE,
    phone         VARCHAR(15)   NOT NULL,
    address_line1 VARCHAR(255)  NOT NULL,
    address_line2 VARCHAR(255),
    city          VARCHAR(100)  NOT NULL,
    state         VARCHAR(100)  NOT NULL,
    pincode       VARCHAR(10)   NOT NULL,
    country       VARCHAR(100)  NOT NULL DEFAULT 'India',
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Table 2: Logistics Hubs (Collection / Sorting / Distribution)
-- PK: hub_id | CK: hub_name
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE hubs (
    hub_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hub_name   VARCHAR(100)  NOT NULL UNIQUE,
    hub_type   hub_type      NOT NULL,
    address    VARCHAR(255)  NOT NULL,
    city       VARCHAR(100)  NOT NULL,
    state      VARCHAR(100)  NOT NULL,
    pincode    VARCHAR(10)   NOT NULL,
    phone      VARCHAR(15),
    is_active  BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Table 3: Employees (Personnel & Hub Assignment)
-- PK: employee_id | CK: email | FK: hub_id → hubs
-- Added: password_hash for JWT authentication
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE employees (
    employee_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hub_id        BIGINT         NOT NULL REFERENCES hubs(hub_id) ON DELETE RESTRICT,
    full_name     VARCHAR(100)   NOT NULL,
    email         CITEXT         NOT NULL UNIQUE,
    phone         VARCHAR(15)    NOT NULL,
    role          employee_role  NOT NULL,
    password_hash VARCHAR(255)   NOT NULL,
    hire_date     DATE           NOT NULL DEFAULT CURRENT_DATE,
    is_active     BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Table 4: Parcels
-- PK: parcel_id | CK: tracking_number
-- FKs: sender_id, receiver_id → customers
--      origin_hub_id, destination_hub_id, current_hub_id → hubs
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE parcels (
    parcel_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tracking_number      VARCHAR(20)    NOT NULL UNIQUE,
    sender_id            BIGINT         NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    receiver_id          BIGINT         NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    origin_hub_id        BIGINT         NOT NULL REFERENCES hubs(hub_id) ON DELETE RESTRICT,
    destination_hub_id   BIGINT         NOT NULL REFERENCES hubs(hub_id) ON DELETE RESTRICT,
    current_hub_id       BIGINT         REFERENCES hubs(hub_id) ON DELETE RESTRICT,
    current_status       parcel_status  NOT NULL DEFAULT 'REGISTERED',
    parcel_type          parcel_type    NOT NULL DEFAULT 'SMALL_PACKAGE',
    weight_kg            NUMERIC(8,2)   NOT NULL,
    length_cm            NUMERIC(8,2)   NOT NULL,
    width_cm             NUMERIC(8,2)   NOT NULL,
    height_cm            NUMERIC(8,2)   NOT NULL,
    declared_value       NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
    estimated_delivery_date DATE,
    max_delivery_attempts   SMALLINT    NOT NULL DEFAULT 3,
    special_instructions TEXT,
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    -- Domain business constraints
    CONSTRAINT chk_sender_neq_receiver    CHECK (sender_id != receiver_id),
    CONSTRAINT chk_origin_neq_destination CHECK (origin_hub_id != destination_hub_id),
    CONSTRAINT chk_weight_positive        CHECK (weight_kg  > 0),
    CONSTRAINT chk_length_positive        CHECK (length_cm  > 0),
    CONSTRAINT chk_width_positive         CHECK (width_cm   > 0),
    CONSTRAINT chk_height_positive        CHECK (height_cm  > 0),
    CONSTRAINT chk_declared_value_nonneg  CHECK (declared_value >= 0),
    CONSTRAINT chk_max_attempts_range     CHECK (max_delivery_attempts BETWEEN 1 AND 10)
);

-- ────────────────────────────────────────────────────────────────────────────
-- Table 5: Linehaul Inter-Hub Shipments
-- PK: shipment_id
-- FKs: from_hub_id, to_hub_id → hubs
--      dispatched_by, received_by → employees
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE shipments (
    shipment_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    from_hub_id    BIGINT           NOT NULL REFERENCES hubs(hub_id) ON DELETE RESTRICT,
    to_hub_id      BIGINT           NOT NULL REFERENCES hubs(hub_id) ON DELETE RESTRICT,
    dispatched_by  BIGINT           NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    received_by    BIGINT           REFERENCES employees(employee_id) ON DELETE RESTRICT,
    vehicle_number VARCHAR(20),
    status         shipment_status  NOT NULL DEFAULT 'LOADING',
    dispatch_time  TIMESTAMPTZ,
    arrival_time   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_hub_different          CHECK (from_hub_id != to_hub_id),
    CONSTRAINT chk_arrival_after_dispatch CHECK (arrival_time IS NULL OR arrival_time >= dispatch_time)
);

-- ────────────────────────────────────────────────────────────────────────────
-- Table 6: Shipment Manifest (M:N Bridge — shipments ↔ parcels)
-- PK: (shipment_id, parcel_id)
-- Added: added_at for manifest audit trail
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE shipment_parcels (
    shipment_id BIGINT      NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    parcel_id   BIGINT      NOT NULL REFERENCES parcels(parcel_id)     ON DELETE RESTRICT,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (shipment_id, parcel_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- Table 7: Tracking History (Append-Only Immutable Event Ledger)
-- PK: tracking_id
-- FKs: parcel_id → parcels, hub_id → hubs, employee_id → employees
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE tracking_history (
    tracking_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parcel_id   BIGINT        NOT NULL REFERENCES parcels(parcel_id)    ON DELETE RESTRICT,
    hub_id      BIGINT        REFERENCES hubs(hub_id)                   ON DELETE RESTRICT,
    employee_id BIGINT        REFERENCES employees(employee_id)         ON DELETE RESTRICT,
    status      parcel_status NOT NULL,
    remarks     TEXT,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Table 8: Last-Mile Delivery Attempts
-- PK: attempt_id
-- FKs: parcel_id → parcels, employee_id → employees
-- Added: attempt_number with unique constraint for sequencing
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE delivery_attempts (
    attempt_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parcel_id           BIGINT            NOT NULL REFERENCES parcels(parcel_id)    ON DELETE RESTRICT,
    employee_id         BIGINT            NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    attempt_number      SMALLINT          NOT NULL,
    outcome             delivery_outcome  NOT NULL,
    recipient_name      VARCHAR(100),
    signature_collected BOOLEAN           NOT NULL DEFAULT FALSE,
    remarks             TEXT,
    attempted_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_parcel_attempt   UNIQUE (parcel_id, attempt_number),
    CONSTRAINT chk_attempt_range   CHECK  (attempt_number BETWEEN 1 AND 10)
);
