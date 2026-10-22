-- ============================================================================
-- SCRIPT:      001_create_enums.sql
-- DESCRIPTION: PostgreSQL extensions and domain ENUM type definitions
-- ============================================================================

-- Case-insensitive text for email columns
CREATE EXTENSION IF NOT EXISTS citext;

-- ────────────────────────────────────────────────────────────────────────────
-- Lifecycle states of a parcel in transit (10 states, 3 terminal)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TYPE parcel_status AS ENUM (
    'REGISTERED',
    'PICKED_UP',
    'RECEIVED_AT_ORIGIN_HUB',
    'IN_TRANSIT',
    'ARRIVED_AT_HUB',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED_DELIVERY',
    'RETURNED_TO_SENDER',
    'CANCELLED'
);

-- ────────────────────────────────────────────────────────────────────────────
-- Operational classification of logistics facilities
-- ────────────────────────────────────────────────────────────────────────────
CREATE TYPE hub_type AS ENUM (
    'COLLECTION',
    'SORTING',
    'DISTRIBUTION'
);

-- ────────────────────────────────────────────────────────────────────────────
-- Workforce operational roles
-- ────────────────────────────────────────────────────────────────────────────
CREATE TYPE employee_role AS ENUM (
    'HUB_MANAGER',
    'CLERK',
    'COURIER',
    'DRIVER',
    'WAREHOUSE_STAFF'
);

-- ────────────────────────────────────────────────────────────────────────────
-- Physical packaging categories
-- ────────────────────────────────────────────────────────────────────────────
CREATE TYPE parcel_type AS ENUM (
    'DOCUMENT',
    'SMALL_PACKAGE',
    'MEDIUM_PACKAGE',
    'LARGE_PACKAGE',
    'FRAGILE',
    'HAZARDOUS'
);

-- ────────────────────────────────────────────────────────────────────────────
-- Linehaul transport manifest states
-- ────────────────────────────────────────────────────────────────────────────
CREATE TYPE shipment_status AS ENUM (
    'LOADING',
    'DISPATCHED',
    'IN_TRANSIT',
    'ARRIVED',
    'CANCELLED'
);

-- ────────────────────────────────────────────────────────────────────────────
-- Last-mile delivery attempt outcomes
-- ────────────────────────────────────────────────────────────────────────────
CREATE TYPE delivery_outcome AS ENUM (
    'DELIVERED',
    'FAILED_NO_ONE_HOME',
    'FAILED_WRONG_ADDRESS',
    'FAILED_REFUSED',
    'FAILED_OTHER'
);
