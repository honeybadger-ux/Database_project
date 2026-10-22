-- ============================================================================
-- SCRIPT:      init.sql
-- DESCRIPTION: Master initialization script — runs all migrations in order.
--
-- USAGE:       psql -d courier_logistics -f database/init.sql
--
-- This script assumes a fresh database. It will:
--   1. Create extensions and ENUM types
--   2. Create all tables with constraints
--   3. Create performance indexes
--   4. Create triggers and stored procedures
--   5. Load realistic seed data
-- ============================================================================

\echo '════════════════════════════════════════════════════════════════'
\echo '  Multi-Hub Courier & Logistics Tracking Database'
\echo '  Initializing schema...'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

\echo '→ Step 1/5: Creating extensions and ENUM types...'
\i migrations/001_create_enums.sql
\echo '  ✓ Extensions and ENUMs created'
\echo ''

\echo '→ Step 2/5: Creating tables and constraints...'
\i migrations/002_create_tables.sql
\echo '  ✓ Tables created'
\echo ''

\echo '→ Step 3/5: Creating performance indexes...'
\i migrations/003_create_indexes.sql
\echo '  ✓ Indexes created'
\echo ''

\echo '→ Step 4/5: Creating triggers and stored procedures...'
\i migrations/004_create_triggers.sql
\echo '  ✓ Triggers and procedures created'
\echo ''

\echo '→ Step 5/6: Loading seed data...'
\i migrations/005_seed_data.sql
\echo '  ✓ Seed data loaded'
\echo ''

\echo '→ Step 6/7: Applying Multi-Tenant Aggregator schema, rate cards & tenant carriers...'
\i migrations/006_multi_tenant_aggregator.sql
\echo '  ✓ Multi-tenant aggregator schema & carriers configured'
\echo ''

\echo '→ Step 7/7: Applying Pincode Serviceability & Carrier Network Reach...'
\i migrations/007_pincode_serviceability.sql
\echo '  ✓ Pincode serviceability matrix configured'
\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  Database initialization complete!'
\echo '  Run test suite: psql -d courier_logistics -f tests/test_triggers.sql'
\echo '════════════════════════════════════════════════════════════════'
