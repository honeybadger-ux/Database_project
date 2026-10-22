-- ============================================================================
-- SCRIPT:      004_create_triggers.sql
-- DESCRIPTION: Business invariant triggers & atomic stored procedures
--              All trigger logic refined per architecture audit findings.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGER 1: Monotonic Timestamp Validation
-- Ensures BI-8: T(E_n) >= T(E_{n-1}) for every parcel's event sequence.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_enforce_monotonic_timestamp()
RETURNS TRIGGER AS $$
DECLARE
    v_last_timestamp TIMESTAMPTZ;
BEGIN
    SELECT MAX(created_at) INTO v_last_timestamp
    FROM tracking_history
    WHERE parcel_id = NEW.parcel_id;

    IF v_last_timestamp IS NOT NULL AND NEW.created_at < v_last_timestamp THEN
        RAISE EXCEPTION 'Temporal Invariant Violation: New timestamp % is earlier than preceding event %',
            NEW.created_at, v_last_timestamp;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_01_monotonic_timestamp
    BEFORE INSERT ON tracking_history
    FOR EACH ROW
    EXECUTE FUNCTION fn_enforce_monotonic_timestamp();

-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGER 2: State Machine Transition Guard
-- Enforces BI-4 (monotonic progression) and BI-9 (terminal finality).
-- REFINED: Terminal check moved to top for defensive clarity.
--          Hub authorization (BI-3) enforced when employee/hub provided.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_validate_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_current_status parcel_status;
    v_emp_hub_id     BIGINT;
BEGIN
    -- Fetch current parcel status
    SELECT current_status INTO v_current_status
    FROM parcels
    WHERE parcel_id = NEW.parcel_id;

    -- ── BI-9: Terminal State Finality (checked FIRST) ───────────────────
    IF v_current_status IN ('DELIVERED', 'RETURNED_TO_SENDER', 'CANCELLED') THEN
        RAISE EXCEPTION 'Terminal State: Parcel % is finalized in state %. No further events allowed.',
            NEW.parcel_id, v_current_status;
    END IF;

    -- ── BI-3: Hub Authorization Scope ───────────────────────────────────
    -- When both employee and hub are provided, verify the employee belongs
    -- to that hub. Prevents cross-hub ghost scans.
    IF NEW.employee_id IS NOT NULL AND NEW.hub_id IS NOT NULL THEN
        SELECT hub_id INTO v_emp_hub_id
        FROM employees
        WHERE employee_id = NEW.employee_id;

        IF v_emp_hub_id != NEW.hub_id THEN
            RAISE EXCEPTION 'Hub Authorization Violation: Employee % belongs to hub %, not hub %',
                NEW.employee_id, v_emp_hub_id, NEW.hub_id;
        END IF;
    END IF;

    -- ── Initial registration event (parcel just created with REGISTERED) ─
    IF v_current_status = 'REGISTERED' AND NEW.status = 'REGISTERED' THEN
        RETURN NEW;
    END IF;

    -- ── BI-4: State Transition Adjacency Matrix ─────────────────────────
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

CREATE TRIGGER trg_02_validate_status_transition
    BEFORE INSERT ON tracking_history
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_status_transition();

-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGER 3: Materialized Status & Location Projection Sync
-- Keeps parcels.current_status and parcels.current_hub_id in sync.
-- REFINED: Sets current_hub_id = NULL for IN_TRANSIT and CANCELLED states
--          (parcel is on a vehicle or no longer physically located).
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_parcel_on_tracking()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE parcels
    SET current_status = NEW.status,
        current_hub_id = CASE
            WHEN NEW.status = 'IN_TRANSIT' THEN NULL    -- On vehicle, between hubs
            WHEN NEW.status = 'CANCELLED'  THEN NULL    -- No physical location
            ELSE NEW.hub_id
        END,
        updated_at = NOW()
    WHERE parcel_id = NEW.parcel_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_03_sync_parcel_on_tracking
    AFTER INSERT ON tracking_history
    FOR EACH ROW
    EXECUTE FUNCTION fn_sync_parcel_on_tracking();

-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGER 4: Ledger Immutability Enforcement (BI-2)
-- Prevents any UPDATE or DELETE on the tracking_history table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_prevent_tracking_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Immutability Violation: % operations are strictly forbidden on tracking_history', TG_OP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_04_tracking_immutable
    BEFORE UPDATE OR DELETE ON tracking_history
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_tracking_modification();


-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- PROCEDURE 1: Atomic Parcel Registration
-- Creates the parcel record + initial REGISTERED tracking event in one tx.
-- ────────────────────────────────────────────────────────────────────────────
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
    p_estimated_delivery   DATE DEFAULT NULL
) RETURNS TABLE(out_parcel_id BIGINT, out_tracking_number VARCHAR) AS $$
DECLARE
    v_parcel_id      BIGINT;
    v_tracking_num   VARCHAR(20);
BEGIN
    -- Generate tracking number
    v_tracking_num := generate_tracking_number();

    -- Insert parcel
    INSERT INTO parcels (
        tracking_number, sender_id, receiver_id,
        origin_hub_id, destination_hub_id, current_hub_id,
        current_status, parcel_type,
        weight_kg, length_cm, width_cm, height_cm,
        declared_value, estimated_delivery_date, special_instructions
    ) VALUES (
        v_tracking_num, p_sender_id, p_receiver_id,
        p_origin_hub_id, p_destination_hub_id, p_origin_hub_id,
        'REGISTERED', p_parcel_type,
        p_weight_kg, p_length_cm, p_width_cm, p_height_cm,
        p_declared_value, p_estimated_delivery, p_special_instructions
    ) RETURNING parcel_id INTO v_parcel_id;

    -- Log initial tracking event
    INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
    VALUES (v_parcel_id, p_origin_hub_id, p_employee_id, 'REGISTERED', 'Parcel registered at counter');

    RETURN QUERY SELECT v_parcel_id, v_tracking_num;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- PROCEDURE 2: Atomic Batch Shipment Dispatch
-- Validates all parcels → creates shipment manifest → logs IN_TRANSIT events.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_dispatch_shipment(
    p_from_hub_id    BIGINT,
    p_to_hub_id      BIGINT,
    p_employee_id    BIGINT,
    p_vehicle_number VARCHAR,
    p_parcel_ids     BIGINT[]
) RETURNS BIGINT AS $$
DECLARE
    v_shipment_id  BIGINT;
    v_pid          BIGINT;
    v_current_hub  BIGINT;
    v_status       parcel_status;
BEGIN
    -- Pre-validate all parcels before any mutation
    FOREACH v_pid IN ARRAY p_parcel_ids LOOP
        SELECT current_hub_id, current_status INTO v_current_hub, v_status
        FROM parcels WHERE parcel_id = v_pid;

        IF v_current_hub IS NULL OR v_current_hub != p_from_hub_id THEN
            RAISE EXCEPTION 'Dispatch Error: Parcel % is not at hub %',
                v_pid, p_from_hub_id;
        END IF;

        IF v_status NOT IN ('RECEIVED_AT_ORIGIN_HUB', 'ARRIVED_AT_HUB') THEN
            RAISE EXCEPTION 'Dispatch Error: Parcel % in state % is not eligible for dispatch',
                v_pid, v_status;
        END IF;
    END LOOP;

    -- Create shipment manifest
    INSERT INTO shipments (from_hub_id, to_hub_id, dispatched_by, vehicle_number, status, dispatch_time)
    VALUES (p_from_hub_id, p_to_hub_id, p_employee_id, p_vehicle_number, 'DISPATCHED', NOW())
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

-- ────────────────────────────────────────────────────────────────────────────
-- PROCEDURE 3: Atomic Batch Shipment Receipt
-- Marks shipment ARRIVED → logs ARRIVED_AT_HUB for each manifested parcel.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_receive_shipment(
    p_shipment_id BIGINT,
    p_employee_id BIGINT
) RETURNS VOID AS $$
DECLARE
    v_pid      BIGINT;
    v_dest_hub BIGINT;
BEGIN
    -- Atomically transition shipment status and get destination hub
    UPDATE shipments
    SET status       = 'ARRIVED',
        received_by  = p_employee_id,
        arrival_time = NOW()
    WHERE shipment_id = p_shipment_id AND status = 'DISPATCHED'
    RETURNING to_hub_id INTO v_dest_hub;

    IF v_dest_hub IS NULL THEN
        RAISE EXCEPTION 'Receipt Error: Shipment % was not found in DISPATCHED state', p_shipment_id;
    END IF;

    -- Log arrival for each parcel on the manifest
    FOR v_pid IN SELECT parcel_id FROM shipment_parcels WHERE shipment_id = p_shipment_id LOOP
        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (v_pid, v_dest_hub, p_employee_id, 'ARRIVED_AT_HUB', 'Received and scanned at facility');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- PROCEDURE 4: Record Delivery Attempt
-- Logs a last-mile delivery attempt with auto-incrementing attempt_number.
-- Automatically transitions parcel to DELIVERED or FAILED_DELIVERY.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_record_delivery_attempt(
    p_parcel_id           BIGINT,
    p_employee_id         BIGINT,
    p_outcome             delivery_outcome,
    p_recipient_name      VARCHAR DEFAULT NULL,
    p_signature_collected BOOLEAN DEFAULT FALSE,
    p_remarks             TEXT    DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_attempt_num    SMALLINT;
    v_max_attempts   SMALLINT;
    v_dest_hub       BIGINT;
    v_new_status     parcel_status;
BEGIN
    -- Determine the next attempt number
    SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_num
    FROM delivery_attempts
    WHERE parcel_id = p_parcel_id;

    -- Get parcel metadata
    SELECT max_delivery_attempts, destination_hub_id
    INTO v_max_attempts, v_dest_hub
    FROM parcels
    WHERE parcel_id = p_parcel_id;

    -- Record the delivery attempt
    INSERT INTO delivery_attempts (parcel_id, employee_id, attempt_number, outcome,
                                    recipient_name, signature_collected, remarks)
    VALUES (p_parcel_id, p_employee_id, v_attempt_num, p_outcome,
            p_recipient_name, p_signature_collected, p_remarks);

    -- Determine resulting parcel status
    IF p_outcome = 'DELIVERED' THEN
        v_new_status := 'DELIVERED';
    ELSE
        v_new_status := 'FAILED_DELIVERY';
    END IF;

    -- Log tracking event
    INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
    VALUES (p_parcel_id, v_dest_hub, p_employee_id, v_new_status,
            'Delivery attempt #' || v_attempt_num || ': ' || p_outcome::TEXT);

    -- If max attempts exceeded on failure, auto-return to sender
    IF v_new_status = 'FAILED_DELIVERY' AND v_attempt_num >= v_max_attempts THEN
        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (p_parcel_id, v_dest_hub, p_employee_id, 'RETURNED_TO_SENDER',
                'Max delivery attempts (' || v_max_attempts || ') exceeded — returning to sender');
    END IF;
END;
$$ LANGUAGE plpgsql;
