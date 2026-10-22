-- ============================================================================
-- SCRIPT:      006_multi_tenant_aggregator.sql
-- DESCRIPTION: Multi-Tenant Shipping Aggregator & Logistics SaaS Migration
--              - Extends employee_role ENUM (SUPER_ADMIN, COURIER_ADMIN)
--              - Tables: courier_companies, sellers, serviceable_regions,
--                        courier_rate_cards, disputes
--              - Adds courier_id & seller_id foreign keys to hubs, employees,
--                shipments, parcels (3NF / BCNF compliant)
--              - Preserves all triggers and updates stored procedures with
--                backward-compatible default parameters
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. EXTEND EMPLOYEE ROLE ENUM
-- ────────────────────────────────────────────────────────────────────────────
ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'COURIER_ADMIN';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. COURIER COMPANIES (Carriers / Tenants)
-- PK: courier_id | CK: code, name
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courier_companies (
    courier_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                VARCHAR(100) NOT NULL UNIQUE,
    code                VARCHAR(20)  NOT NULL UNIQUE,
    base_rate           NUMERIC(8,2) NOT NULL DEFAULT 40.00,
    rating              NUMERIC(3,2) NOT NULL DEFAULT 4.50,
    tracking_url_prefix VARCHAR(255),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_base_rate_pos  CHECK (base_rate > 0),
    CONSTRAINT chk_rating_range   CHECK (rating >= 1.00 AND rating <= 5.00)
);

-- Seed Initial 4 Major Carrier Tenants
INSERT INTO courier_companies (name, code, base_rate, rating, tracking_url_prefix, is_active)
VALUES
    ('DTDC Express Logistics',       'DTDC',     40.00, 4.60, 'https://track.dtdc.com/?trk=',     TRUE),
    ('Blue Dart Aviation Express',   'BLUEDART', 65.00, 4.90, 'https://track.bluedart.com/?trk=', TRUE),
    ('Delhivery Logistics Network',  'DELHIVERY',36.00, 4.55, 'https://track.delhivery.com/?trk=',TRUE),
    ('FedEx Express India',          'FEDEX',    82.00, 4.85, 'https://track.fedex.com/?trk=',    TRUE)
ON CONFLICT (code) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. SELLERS / E-COMMERCE MERCHANTS
-- PK: seller_id | CK: contact_email, api_key
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sellers (
    seller_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_name        VARCHAR(100) NOT NULL,
    contact_email       CITEXT       NOT NULL UNIQUE,
    contact_phone       VARCHAR(15)  NOT NULL,
    api_key             VARCHAR(64)  NOT NULL UNIQUE,
    address_line1       VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(100),
    pincode             VARCHAR(10),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed Initial E-Commerce Aggregator Sellers
INSERT INTO sellers (company_name, contact_email, contact_phone, api_key, address_line1, city, state, pincode)
VALUES
    ('Amazon India Seller Services', 'ops-fulfillment@amazon.in', '080-41122334', 'sk_live_amz_9921_x8472910481234918234710', 'Brigade Gateway, 8th Floor, Rajajinagar', 'Bangalore', 'Karnataka', '560055'),
    ('Flipkart Internet Pvt Ltd',    'ekart-merchant@flipkart.com','080-67981111', 'sk_live_flp_4410_y1928374650192837465102', 'Embassy Tech Village, Outer Ring Road',   'Bangalore', 'Karnataka', '560103'),
    ('Meesho Supply Chain Services', 'seller-ops@meesho.com',     '080-61234567', 'sk_live_msh_8832_z736251409283746510293', '3rd Floor, Outer Ring Road, Bellandur',    'Bangalore', 'Karnataka', '560103'),
    ('Myntra Fashion Marketplace',   'merchant-hub@myntra.com',   '080-43576000', 'sk_live_myn_1102_w948271039485720194827', 'AKR Tech Park, Kudlu Gate, Hosur Road',    'Bangalore', 'Karnataka', '560068')
ON CONFLICT (contact_email) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. SERVICEABLE REGIONS (Carrier Regional Transit Matrix)
-- PK: region_id | CK: (courier_id, origin_state, dest_state)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS serviceable_regions (
    region_id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    courier_id             BIGINT       NOT NULL REFERENCES courier_companies(courier_id) ON DELETE CASCADE,
    origin_state           VARCHAR(100) NOT NULL,
    dest_state             VARCHAR(100) NOT NULL,
    estimated_transit_days INT          NOT NULL DEFAULT 3,
    is_serviceable         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_courier_route    UNIQUE (courier_id, origin_state, dest_state),
    CONSTRAINT chk_transit_days_pos CHECK (estimated_transit_days >= 1)
);

-- Seed Regional Transit Matrix (DTDC, Blue Dart, Delhivery, FedEx)
-- Key Indian logistics clusters: Maharashtra, Delhi, Karnataka, Telangana, Tamil Nadu, West Bengal, Gujarat
INSERT INTO serviceable_regions (courier_id, origin_state, dest_state, estimated_transit_days, is_serviceable)
VALUES
    -- DTDC (Affordable, Standard Delivery)
    (1, 'Maharashtra', 'Maharashtra', 1, TRUE),
    (1, 'Maharashtra', 'Delhi',       3, TRUE),
    (1, 'Maharashtra', 'Karnataka',   2, TRUE),
    (1, 'Maharashtra', 'Telangana',   2, TRUE),
    (1, 'Maharashtra', 'Tamil Nadu',  3, TRUE),
    (1, 'Delhi',       'Maharashtra', 3, TRUE),
    (1, 'Delhi',       'Delhi',       1, TRUE),
    (1, 'Delhi',       'Karnataka',   4, TRUE),
    (1, 'Karnataka',   'Maharashtra', 2, TRUE),
    (1, 'Karnataka',   'Tamil Nadu',  1, TRUE),
    (1, 'Karnataka',   'Karnataka',   1, TRUE),

    -- Blue Dart (Fastest Aviation Express, Premium Speed)
    (2, 'Maharashtra', 'Maharashtra', 1, TRUE),
    (2, 'Maharashtra', 'Delhi',       1, TRUE),
    (2, 'Maharashtra', 'Karnataka',   1, TRUE),
    (2, 'Maharashtra', 'Telangana',   1, TRUE),
    (2, 'Maharashtra', 'Tamil Nadu',  2, TRUE),
    (2, 'Delhi',       'Maharashtra', 1, TRUE),
    (2, 'Delhi',       'Delhi',       1, TRUE),
    (2, 'Delhi',       'Karnataka',   2, TRUE),
    (2, 'Karnataka',   'Maharashtra', 1, TRUE),
    (2, 'Karnataka',   'Tamil Nadu',  1, TRUE),
    (2, 'Karnataka',   'Karnataka',   1, TRUE),

    -- Delhivery (High-Tech Ground & Air, Balanced Price/Speed)
    (3, 'Maharashtra', 'Maharashtra', 1, TRUE),
    (3, 'Maharashtra', 'Delhi',       2, TRUE),
    (3, 'Maharashtra', 'Karnataka',   2, TRUE),
    (3, 'Maharashtra', 'Telangana',   2, TRUE),
    (3, 'Maharashtra', 'Tamil Nadu',  2, TRUE),
    (3, 'Delhi',       'Maharashtra', 2, TRUE),
    (3, 'Delhi',       'Delhi',       1, TRUE),
    (3, 'Delhi',       'Karnataka',   3, TRUE),
    (3, 'Karnataka',   'Maharashtra', 2, TRUE),
    (3, 'Karnataka',   'Tamil Nadu',  2, TRUE),
    (3, 'Karnataka',   'Karnataka',   1, TRUE),

    -- FedEx (Heavy Air Cargo, Top Reliability)
    (4, 'Maharashtra', 'Maharashtra', 1, TRUE),
    (4, 'Maharashtra', 'Delhi',       2, TRUE),
    (4, 'Maharashtra', 'Karnataka',   2, TRUE),
    (4, 'Maharashtra', 'Telangana',   2, TRUE),
    (4, 'Maharashtra', 'Tamil Nadu',  2, TRUE),
    (4, 'Delhi',       'Maharashtra', 2, TRUE),
    (4, 'Delhi',       'Delhi',       1, TRUE),
    (4, 'Delhi',       'Karnataka',   2, TRUE),
    (4, 'Karnataka',   'Maharashtra', 2, TRUE),
    (4, 'Karnataka',   'Tamil Nadu',  2, TRUE),
    (4, 'Karnataka',   'Karnataka',   1, TRUE)
ON CONFLICT (courier_id, origin_state, dest_state) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. COURIER RATE CARDS (Normalized 3NF Freight Calculation Engine)
-- PK: rate_card_id | CK: (courier_id, zone_type, min_weight_kg)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courier_rate_cards (
    rate_card_id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    courier_id                 BIGINT       NOT NULL REFERENCES courier_companies(courier_id) ON DELETE CASCADE,
    zone_type                  VARCHAR(50)  NOT NULL, -- 'LOCAL', 'REGIONAL', 'METRO', 'NATIONAL', 'SPECIAL_ZONE'
    min_weight_kg              NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    max_weight_kg              NUMERIC(8,2) NOT NULL DEFAULT 0.50,
    base_price                 NUMERIC(10,2) NOT NULL,
    additional_weight_step_kg  NUMERIC(8,2) NOT NULL DEFAULT 0.50,
    additional_weight_price    NUMERIC(10,2) NOT NULL,
    created_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_courier_rate_card UNIQUE (courier_id, zone_type, min_weight_kg),
    CONSTRAINT chk_prices_pos       CHECK (base_price >= 0 AND additional_weight_price >= 0)
);

-- Seed Multi-Carrier Rate Cards (Slabs: Local, Regional, Metro, National)
INSERT INTO courier_rate_cards (courier_id, zone_type, min_weight_kg, max_weight_kg, base_price, additional_weight_step_kg, additional_weight_price)
VALUES
    -- DTDC (Economy Leader)
    (1, 'LOCAL',    0.00, 0.50, 35.00, 0.50, 20.00),
    (1, 'REGIONAL', 0.00, 0.50, 48.00, 0.50, 28.00),
    (1, 'METRO',    0.00, 0.50, 58.00, 0.50, 35.00),
    (1, 'NATIONAL', 0.00, 0.50, 72.00, 0.50, 45.00),

    -- Blue Dart (Premium Express)
    (2, 'LOCAL',    0.00, 0.50, 55.00, 0.50, 35.00),
    (2, 'REGIONAL', 0.00, 0.50, 75.00, 0.50, 48.00),
    (2, 'METRO',    0.00, 0.50, 95.00, 0.50, 60.00),
    (2, 'NATIONAL', 0.00, 0.50, 120.00, 0.50, 75.00),

    -- Delhivery (E-Commerce Optimized)
    (3, 'LOCAL',    0.00, 0.50, 32.00, 0.50, 18.00),
    (3, 'REGIONAL', 0.00, 0.50, 45.00, 0.50, 25.00),
    (3, 'METRO',    0.00, 0.50, 54.00, 0.50, 32.00),
    (3, 'NATIONAL', 0.00, 0.50, 68.00, 0.50, 40.00),

    -- FedEx (Heavy & Secure Express)
    (4, 'LOCAL',    0.00, 0.50, 70.00, 0.50, 45.00),
    (4, 'REGIONAL', 0.00, 0.50, 95.00, 0.50, 65.00),
    (4, 'METRO',    0.00, 0.50, 115.00, 0.50, 80.00),
    (4, 'NATIONAL', 0.00, 0.50, 145.00, 0.50, 95.00)
ON CONFLICT (courier_id, zone_type, min_weight_kg) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. MULTI-TENANT FOREIGN KEY ATTACHMENTS
-- ────────────────────────────────────────────────────────────────────────────

-- Hubs Tenant Scoping
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS courier_id BIGINT REFERENCES courier_companies(courier_id) ON DELETE RESTRICT;

-- Distribute Hubs Across Tenants
-- Hubs 1..6 -> DTDC (id 1)
-- Hubs 7..9 -> Blue Dart (id 2)
-- Hubs 10..12 -> Delhivery (id 3)
-- Hubs 13..14 (and above) -> FedEx (id 4)
UPDATE hubs SET courier_id = 1 WHERE courier_id IS NULL AND hub_id BETWEEN 1 AND 6;
UPDATE hubs SET courier_id = 2 WHERE courier_id IS NULL AND hub_id BETWEEN 7 AND 9;
UPDATE hubs SET courier_id = 3 WHERE courier_id IS NULL AND hub_id BETWEEN 10 AND 12;
UPDATE hubs SET courier_id = 4 WHERE courier_id IS NULL AND hub_id >= 13;
UPDATE hubs SET courier_id = 1 WHERE courier_id IS NULL; -- default safety fallback

-- Make hubs.courier_id NOT NULL now that all are populated
ALTER TABLE hubs ALTER COLUMN courier_id SET NOT NULL;

-- Employees Tenant Scoping
ALTER TABLE employees ADD COLUMN IF NOT EXISTS courier_id BIGINT REFERENCES courier_companies(courier_id) ON DELETE RESTRICT;

-- Sync employee courier_id from their stationed hub
UPDATE employees e
SET courier_id = h.courier_id
FROM hubs h
WHERE e.hub_id = h.hub_id AND e.courier_id IS NULL;

-- Shipments Tenant Scoping
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS courier_id BIGINT REFERENCES courier_companies(courier_id) ON DELETE RESTRICT;

-- Sync shipment courier_id from from_hub_id
UPDATE shipments s
SET courier_id = h.courier_id
FROM hubs h
WHERE s.from_hub_id = h.hub_id AND s.courier_id IS NULL;

-- Make shipments.courier_id NOT NULL
ALTER TABLE shipments ALTER COLUMN courier_id SET NOT NULL;

-- Parcels Multi-Tenant Scoping & Merchant Link
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS courier_id BIGINT REFERENCES courier_companies(courier_id) ON DELETE RESTRICT;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS seller_id BIGINT REFERENCES sellers(seller_id) ON DELETE SET NULL;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS dispute_status VARCHAR(30) NOT NULL DEFAULT 'NONE';

-- Sync parcel courier_id from origin_hub_id
UPDATE parcels p
SET courier_id = h.courier_id
FROM hubs h
WHERE p.origin_hub_id = h.hub_id AND p.courier_id IS NULL;

-- Make parcels.courier_id NOT NULL
ALTER TABLE parcels ALTER COLUMN courier_id SET NOT NULL;

-- Associate sample parcels with sellers (Amazon, Flipkart, Meesho)
UPDATE parcels SET seller_id = 1 WHERE parcel_id % 3 = 1 AND seller_id IS NULL;
UPDATE parcels SET seller_id = 2 WHERE parcel_id % 3 = 2 AND seller_id IS NULL;
UPDATE parcels SET seller_id = 3 WHERE parcel_id % 3 = 0 AND seller_id IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. DISPUTES TABLE (Super Root Admin Governance)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
    dispute_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parcel_id           BIGINT       NOT NULL REFERENCES parcels(parcel_id) ON DELETE CASCADE,
    raised_by_type      VARCHAR(30)  NOT NULL, -- 'CUSTOMER', 'SELLER', 'COURIER'
    raised_by_name      VARCHAR(100),
    raised_by_email     CITEXT,
    courier_id          BIGINT       REFERENCES courier_companies(courier_id) ON DELETE SET NULL,
    reason              TEXT         NOT NULL,
    status              VARCHAR(30)  NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'IN_INVESTIGATION', 'RESOLVED', 'REJECTED'
    resolution_notes    TEXT,
    resolved_by         BIGINT       REFERENCES employees(employee_id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed Sample Active Disputes
INSERT INTO disputes (parcel_id, raised_by_type, raised_by_name, raised_by_email, courier_id, reason, status)
SELECT
    p.parcel_id,
    'SELLER',
    s.company_name,
    s.contact_email,
    p.courier_id,
    'SLA Delivery Delay: Consignment exceeded guaranteed transit SLA by 48+ hours.',
    'OPEN'
FROM parcels p
JOIN sellers s ON p.seller_id = s.seller_id
WHERE p.current_status IN ('IN_TRANSIT', 'FAILED_DELIVERY')
LIMIT 3;

-- Sync parcel dispute_status
UPDATE parcels p
SET dispute_status = 'DISPUTED'
FROM disputes d
WHERE p.parcel_id = d.parcel_id;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. SEED SUPER ADMIN & COURIER TENANT ADMINS
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Super Root Admin (Platform Owner - No courier_id restriction)
-- Password: password123 (bcrypt hash)
INSERT INTO employees (hub_id, full_name, email, phone, role, password_hash, is_active, courier_id)
VALUES
    (1, 'Super Root Admin', 'superadmin@courier.com', '9999900000', 'SUPER_ADMIN',
     '$2b$12$Ny/XcHnvLmvmSIoiJSE.MOle8FrCYlceiDSzas.Eew0IKem0bV5Q2', TRUE, NULL)
ON CONFLICT (email) DO UPDATE SET role = 'SUPER_ADMIN', courier_id = NULL;

-- 2. Convert Existing Root Admin (Rajesh Kumar) to DTDC Courier Admin
UPDATE employees
SET role = 'COURIER_ADMIN',
    full_name = 'Rajesh Kumar (DTDC Admin)',
    courier_id = 1
WHERE employee_id = 1;

-- 3. Provision Courier Admins for other carrier tenants if not exists
INSERT INTO employees (hub_id, full_name, email, phone, role, password_hash, is_active, courier_id)
VALUES
    (7,  'Sanjay Verma (Blue Dart Admin)',  'bluedart.admin@courier.com',  '9888800001', 'COURIER_ADMIN',
     '$2b$12$Ny/XcHnvLmvmSIoiJSE.MOle8FrCYlceiDSzas.Eew0IKem0bV5Q2', TRUE, 2),
    (10, 'Aakash Singhal (Delhivery Admin)','delhivery.admin@courier.com', '9888800002', 'COURIER_ADMIN',
     '$2b$12$Ny/XcHnvLmvmSIoiJSE.MOle8FrCYlceiDSzas.Eew0IKem0bV5Q2', TRUE, 3),
    (13, 'David Reynolds (FedEx Admin)',    'fedex.admin@courier.com',     '9888800003', 'COURIER_ADMIN',
     '$2b$12$Ny/XcHnvLmvmSIoiJSE.MOle8FrCYlceiDSzas.Eew0IKem0bV5Q2', TRUE, 4)
ON CONFLICT (email) DO UPDATE SET role = 'COURIER_ADMIN';

-- ────────────────────────────────────────────────────────────────────────────
-- 9. UPDATE STORED PROCEDURES WITH BACKWARD COMPATIBILITY
-- ────────────────────────────────────────────────────────────────────────────

-- Overload fn_register_parcel with multi-tenant p_courier_id and p_seller_id
CREATE OR REPLACE FUNCTION fn_register_parcel(
    p_sender_id            BIGINT,
    p_receiver_id          BIGINT,
    p_origin_hub_id        BIGINT,
    p_destination_hub_id   BIGINT,
    p_parcel_type          parcel_type,
    p_weight_kg            NUMERIC,
    p_length_cm            NUMERIC,
    p_width_cm             NUMERIC,
    p_height_cm            NUMERIC,
    p_declared_value       NUMERIC,
    p_special_instructions TEXT,
    p_employee_id          BIGINT,
    p_estimated_delivery   DATE DEFAULT NULL,
    p_courier_id           BIGINT DEFAULT 1,
    p_seller_id            BIGINT DEFAULT NULL
) RETURNS TABLE(out_parcel_id BIGINT, out_tracking_number VARCHAR) AS $$
DECLARE
    v_parcel_id      BIGINT;
    v_tracking_num   VARCHAR(20);
    v_hub_courier_id BIGINT;
BEGIN
    -- Resolve courier_id from origin hub if default is passed
    SELECT courier_id INTO v_hub_courier_id FROM hubs WHERE hub_id = p_origin_hub_id;
    IF v_hub_courier_id IS NOT NULL THEN
        p_courier_id := v_hub_courier_id;
    END IF;

    -- Generate tracking number
    v_tracking_num := generate_tracking_number();

    -- Insert parcel with multi-tenant courier and seller attribution
    INSERT INTO parcels (
        tracking_number, sender_id, receiver_id,
        origin_hub_id, destination_hub_id, current_hub_id,
        current_status, parcel_type,
        weight_kg, length_cm, width_cm, height_cm,
        declared_value, estimated_delivery_date, special_instructions,
        courier_id, seller_id
    ) VALUES (
        v_tracking_num, p_sender_id, p_receiver_id,
        p_origin_hub_id, p_destination_hub_id, p_origin_hub_id,
        'REGISTERED', p_parcel_type,
        p_weight_kg, p_length_cm, p_width_cm, p_height_cm,
        p_declared_value, p_estimated_delivery, p_special_instructions,
        p_courier_id, p_seller_id
    ) RETURNING parcel_id INTO v_parcel_id;

    -- Log initial tracking event
    INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
    VALUES (v_parcel_id, p_origin_hub_id, p_employee_id, 'REGISTERED', 'Parcel registered at counter');

    RETURN QUERY SELECT v_parcel_id, v_tracking_num;
END;
$$ LANGUAGE plpgsql;

-- Overload fn_dispatch_shipment to enforce single-carrier manifest invariant
CREATE OR REPLACE FUNCTION fn_dispatch_shipment(
    p_from_hub_id    BIGINT,
    p_to_hub_id      BIGINT,
    p_employee_id    BIGINT,
    p_vehicle_number VARCHAR,
    p_parcel_ids     BIGINT[]
) RETURNS BIGINT AS $$
DECLARE
    v_shipment_id      BIGINT;
    v_pid              BIGINT;
    v_current_hub      BIGINT;
    v_status           parcel_status;
    v_carrier_id       BIGINT;
    v_parcel_carrier   BIGINT;
BEGIN
    -- Determine the carrier operating the from_hub
    SELECT courier_id INTO v_carrier_id FROM hubs WHERE hub_id = p_from_hub_id;

    -- Pre-validate all parcels before any mutation
    FOREACH v_pid IN ARRAY p_parcel_ids LOOP
        SELECT current_hub_id, current_status, courier_id 
        INTO v_current_hub, v_status, v_parcel_carrier
        FROM parcels WHERE parcel_id = v_pid;

        IF v_current_hub IS NULL OR v_current_hub != p_from_hub_id THEN
            RAISE EXCEPTION 'Dispatch Error: Parcel % is not at hub %',
                v_pid, p_from_hub_id;
        END IF;

        IF v_status NOT IN ('RECEIVED_AT_ORIGIN_HUB', 'ARRIVED_AT_HUB') THEN
            RAISE EXCEPTION 'Dispatch Error: Parcel % in state % is not eligible for dispatch',
                v_pid, v_status;
        END IF;

        IF v_parcel_carrier != v_carrier_id THEN
            RAISE EXCEPTION 'Carrier Isolation Violation: Parcel % belongs to carrier % but shipment is operated by carrier %',
                v_pid, v_parcel_carrier, v_carrier_id;
        END IF;
    END LOOP;

    -- Create shipment manifest scoped to carrier
    INSERT INTO shipments (from_hub_id, to_hub_id, dispatched_by, vehicle_number, status, dispatch_time, courier_id)
    VALUES (p_from_hub_id, p_to_hub_id, p_employee_id, p_vehicle_number, 'DISPATCHED', NOW(), v_carrier_id)
    RETURNING shipment_id INTO v_shipment_id;

    -- Attach parcels and log IN_TRANSIT events
    FOREACH v_pid IN ARRAY p_parcel_ids LOOP
        INSERT INTO shipment_parcels (shipment_id, parcel_id)
        VALUES (v_shipment_id, v_pid);

        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (v_pid, p_from_hub_id, p_employee_id, 'IN_TRANSIT',
                'Dispatched on vehicle ' || COALESCE(p_vehicle_number, 'N/A'));
    END LOOP;

    RETURN v_shipment_id;
END;
$$ LANGUAGE plpgsql;

-- Upgrade fn_validate_status_transition for multi-tenant role hierarchy
CREATE OR REPLACE FUNCTION fn_validate_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_current_status parcel_status;
    v_emp_hub_id     BIGINT;
    v_emp_role       VARCHAR;
    v_emp_carrier    BIGINT;
BEGIN
    -- Fetch current parcel status
    SELECT current_status INTO v_current_status
    FROM parcels
    WHERE parcel_id = NEW.parcel_id;

    -- BI-9: Terminal State Finality (checked FIRST)
    IF v_current_status IN ('DELIVERED', 'RETURNED_TO_SENDER', 'CANCELLED') THEN
        RAISE EXCEPTION 'Terminal State: Parcel % is finalized in state %. No further events allowed.',
            NEW.parcel_id, v_current_status;
    END IF;

    -- BI-3: Hub Authorization Scope
    -- When both employee and hub are provided, verify the employee belongs
    -- to that hub, or is an executive (SUPER_ADMIN or COURIER_ADMIN) for this carrier.
    IF NEW.employee_id IS NOT NULL AND NEW.hub_id IS NOT NULL THEN
        SELECT hub_id, role::TEXT, courier_id 
        INTO v_emp_hub_id, v_emp_role, v_emp_carrier
        FROM employees
        WHERE employee_id = NEW.employee_id;

        IF v_emp_role = 'SUPER_ADMIN' THEN
            NULL;
        ELSIF v_emp_role = 'COURIER_ADMIN' THEN
            IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_id = NEW.hub_id AND courier_id = v_emp_carrier) THEN
                RAISE EXCEPTION 'Carrier Scope Violation: Hub % does not belong to carrier %', NEW.hub_id, v_emp_carrier;
            END IF;
        ELSIF v_emp_hub_id != NEW.hub_id THEN
            RAISE EXCEPTION 'Hub Authorization Violation: Employee % belongs to hub %, not hub %',
                NEW.employee_id, v_emp_hub_id, NEW.hub_id;
        END IF;
    END IF;

    -- Initial registration event (parcel just created with REGISTERED)
    IF v_current_status = 'REGISTERED' AND NEW.status = 'REGISTERED' THEN
        RETURN NEW;
    END IF;

    -- BI-4: State Transition Adjacency Matrix
    IF NOT (
        (v_current_status = 'REGISTERED'             AND NEW.status IN ('PICKED_UP', 'RECEIVED_AT_ORIGIN_HUB', 'CANCELLED'))
     OR (v_current_status = 'PICKED_UP'              AND NEW.status = 'RECEIVED_AT_ORIGIN_HUB')
     OR (v_current_status = 'RECEIVED_AT_ORIGIN_HUB' AND NEW.status = 'IN_TRANSIT')
     OR (v_current_status = 'IN_TRANSIT'              AND NEW.status = 'ARRIVED_AT_HUB')
     OR (v_current_status = 'ARRIVED_AT_HUB'          AND NEW.status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY'))
     OR (v_current_status = 'OUT_FOR_DELIVERY'        AND NEW.status IN ('DELIVERED', 'FAILED_DELIVERY'))
     OR (v_current_status = 'FAILED_DELIVERY'         AND NEW.status IN ('OUT_FOR_DELIVERY', 'RETURNED_TO_SENDER'))
    ) THEN
        RAISE EXCEPTION 'Illegal Transition: Parcel % cannot go from % to %',
            NEW.parcel_id, v_current_status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
