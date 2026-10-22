-- ============================================================================
-- SCRIPT:      test_triggers.sql
-- DESCRIPTION: Automated trigger test suite — validates all 4 triggers
--              and business invariants. Uses DO blocks with exception handling
--              to test both positive and negative cases.
--
-- USAGE:       psql -d courier_logistics -f database/tests/test_triggers.sql
--
-- NOTE:        This script runs AFTER seed data is loaded. It uses test data
--              that is inserted and then cleaned up within each test block.
-- ============================================================================

DO $$
DECLARE
    v_test_parcel_id  BIGINT;
    v_test_tracking   VARCHAR(20);
    v_result_status   parcel_status;
    v_result_hub      BIGINT;
    v_error_caught    BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '  TRIGGER TEST SUITE — Multi-Hub Courier Logistics DB';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '';

    -- ════════════════════════════════════════════════════════════════════
    -- TEST 1: Status Sync Trigger (trg_03)
    -- Verify that inserting into tracking_history updates parcels
    -- ════════════════════════════════════════════════════════════════════
    RAISE NOTICE '── TEST 1: Status Sync Trigger ──────────────────────────';

    -- Use parcel F3 (id=18), currently RECEIVED_AT_ORIGIN_HUB at hub 2
    -- Insert IN_TRANSIT event → current_hub_id should become NULL
    INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
    VALUES (18, 2, 5, 'IN_TRANSIT', 'TEST: Dispatched for sync trigger test');

    SELECT current_status, current_hub_id INTO v_result_status, v_result_hub
    FROM parcels WHERE parcel_id = 18;

    IF v_result_status = 'IN_TRANSIT' AND v_result_hub IS NULL THEN
        RAISE NOTICE '  ✅ PASS — Status synced to IN_TRANSIT, current_hub_id is NULL';
    ELSE
        RAISE NOTICE '  ❌ FAIL — Expected IN_TRANSIT/NULL, got %/%', v_result_status, v_result_hub;
    END IF;

    -- Continue: ARRIVED_AT_HUB at hub 3 → current_hub_id should be 3
    INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
    VALUES (18, 3, 7, 'ARRIVED_AT_HUB', 'TEST: Arrived for sync trigger test');

    SELECT current_status, current_hub_id INTO v_result_status, v_result_hub
    FROM parcels WHERE parcel_id = 18;

    IF v_result_status = 'ARRIVED_AT_HUB' AND v_result_hub = 3 THEN
        RAISE NOTICE '  ✅ PASS — Status synced to ARRIVED_AT_HUB, hub_id = 3';
    ELSE
        RAISE NOTICE '  ❌ FAIL — Expected ARRIVED_AT_HUB/3, got %/%', v_result_status, v_result_hub;
    END IF;

    RAISE NOTICE '';

    -- ════════════════════════════════════════════════════════════════════
    -- TEST 2: Ledger Immutability Trigger (trg_04)
    -- Verify UPDATE and DELETE on tracking_history are blocked
    -- ════════════════════════════════════════════════════════════════════
    RAISE NOTICE '── TEST 2: Ledger Immutability ─────────────────────────';

    -- Test UPDATE
    v_error_caught := FALSE;
    BEGIN
        UPDATE tracking_history SET remarks = 'TAMPERED' WHERE tracking_id = 1;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
    END;

    IF v_error_caught THEN
        RAISE NOTICE '  ✅ PASS — UPDATE on tracking_history was blocked';
    ELSE
        RAISE NOTICE '  ❌ FAIL — UPDATE on tracking_history was NOT blocked';
    END IF;

    -- Test DELETE
    v_error_caught := FALSE;
    BEGIN
        DELETE FROM tracking_history WHERE tracking_id = 1;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
    END;

    IF v_error_caught THEN
        RAISE NOTICE '  ✅ PASS — DELETE on tracking_history was blocked';
    ELSE
        RAISE NOTICE '  ❌ FAIL — DELETE on tracking_history was NOT blocked';
    END IF;

    RAISE NOTICE '';

    -- ════════════════════════════════════════════════════════════════════
    -- TEST 3: Valid State Machine Progression (trg_02)
    -- Create a fresh parcel and walk it through a legal lifecycle
    -- ════════════════════════════════════════════════════════════════════
    RAISE NOTICE '── TEST 3: Valid State Machine Progression ─────────────';

    -- Register a new test parcel
    INSERT INTO parcels (tracking_number, sender_id, receiver_id, origin_hub_id, destination_hub_id, current_hub_id, current_status, parcel_type, weight_kg, length_cm, width_cm, height_cm, declared_value)
    VALUES ('TRK-TEST-001', 1, 2, 1, 5, 1, 'REGISTERED', 'SMALL_PACKAGE', 1.00, 10, 10, 10, 100.00)
    RETURNING parcel_id INTO v_test_parcel_id;

    v_error_caught := FALSE;
    BEGIN
        -- Walk through legal progression
        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (v_test_parcel_id, 1, 2, 'REGISTERED', 'Test: Initial registration');

        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (v_test_parcel_id, 1, 2, 'RECEIVED_AT_ORIGIN_HUB', 'Test: Checked in');

        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (v_test_parcel_id, 1, 2, 'IN_TRANSIT', 'Test: Dispatched');

        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (v_test_parcel_id, 3, 7, 'ARRIVED_AT_HUB', 'Test: Arrived at sort hub');

        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (v_test_parcel_id, 3, 7, 'IN_TRANSIT', 'Test: Forwarded');

        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (v_test_parcel_id, 5, 12, 'ARRIVED_AT_HUB', 'Test: Arrived at dist hub');

        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (v_test_parcel_id, 5, 12, 'OUT_FOR_DELIVERY', 'Test: Out for delivery');

        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (v_test_parcel_id, 5, 12, 'DELIVERED', 'Test: Delivered');

    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  ❌ FAIL — Legal progression raised: %', SQLERRM;
    END;

    IF NOT v_error_caught THEN
        RAISE NOTICE '  ✅ PASS — Full legal lifecycle REGISTERED → DELIVERED completed';
    END IF;

    RAISE NOTICE '';

    -- ════════════════════════════════════════════════════════════════════
    -- TEST 4: Illegal State Machine Transition (trg_02)
    -- Attempt REGISTERED → DELIVERED directly (should fail)
    -- ════════════════════════════════════════════════════════════════════
    RAISE NOTICE '── TEST 4: Illegal State Transition ────────────────────';

    -- Create another test parcel
    INSERT INTO parcels (tracking_number, sender_id, receiver_id, origin_hub_id, destination_hub_id, current_hub_id, current_status, parcel_type, weight_kg, length_cm, width_cm, height_cm, declared_value)
    VALUES ('TRK-TEST-002', 3, 4, 1, 5, 1, 'REGISTERED', 'DOCUMENT', 0.50, 20, 15, 1, 50.00)
    RETURNING parcel_id INTO v_test_parcel_id;

    INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
    VALUES (v_test_parcel_id, 1, 2, 'REGISTERED', 'Test: Initial registration');

    v_error_caught := FALSE;
    BEGIN
        -- Illegal jump: REGISTERED → DELIVERED
        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (v_test_parcel_id, 1, 2, 'DELIVERED', 'Test: Illegal jump to DELIVERED');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  ✅ PASS — Illegal transition blocked: %', SQLERRM;
    END;

    IF NOT v_error_caught THEN
        RAISE NOTICE '  ❌ FAIL — Illegal transition was NOT blocked';
    END IF;

    RAISE NOTICE '';

    -- ════════════════════════════════════════════════════════════════════
    -- TEST 5: Temporal Monotonicity (trg_01)
    -- Insert a backdated event (should fail)
    -- ════════════════════════════════════════════════════════════════════
    RAISE NOTICE '── TEST 5: Temporal Monotonicity ───────────────────────';

    -- Parcel C1 (id=9) has events. Insert one with a backdated timestamp.
    v_error_caught := FALSE;
    BEGIN
        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks, created_at)
        VALUES (9, 3, 7, 'IN_TRANSIT', 'Test: Backdated event', NOW() - INTERVAL '30 days');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  ✅ PASS — Backdated event blocked: %', SQLERRM;
    END;

    IF NOT v_error_caught THEN
        RAISE NOTICE '  ❌ FAIL — Backdated event was NOT blocked';
    END IF;

    RAISE NOTICE '';

    -- ════════════════════════════════════════════════════════════════════
    -- TEST 6: Terminal State Finality (trg_02, BI-9)
    -- Try to add a tracking event to a DELIVERED parcel
    -- ════════════════════════════════════════════════════════════════════
    RAISE NOTICE '── TEST 6: Terminal State Finality ─────────────────────';

    -- Parcel A1 (id=1) is DELIVERED
    v_error_caught := FALSE;
    BEGIN
        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (1, 5, 12, 'OUT_FOR_DELIVERY', 'Test: Event on finalized parcel');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  ✅ PASS — Terminal state event blocked: %', SQLERRM;
    END;

    IF NOT v_error_caught THEN
        RAISE NOTICE '  ❌ FAIL — Terminal state event was NOT blocked';
    END IF;

    -- Also test CANCELLED parcel (id=19)
    v_error_caught := FALSE;
    BEGIN
        INSERT INTO tracking_history (parcel_id, hub_id, employee_id, status, remarks)
        VALUES (19, 2, 5, 'PICKED_UP', 'Test: Event on cancelled parcel');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
        RAISE NOTICE '  ✅ PASS — Event on CANCELLED parcel blocked: %', SQLERRM;
    END;

    IF NOT v_error_caught THEN
        RAISE NOTICE '  ❌ FAIL — Event on CANCELLED parcel was NOT blocked';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '  TEST SUITE COMPLETE';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;
