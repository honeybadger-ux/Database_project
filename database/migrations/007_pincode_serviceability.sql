-- ============================================================================
-- Migration 007: Courier Pincode Serviceability & Carrier Network Reach
-- ============================================================================
-- Strictly 3NF Compliant: Normalized mapping of carrier companies to regional delivery pincodes.
-- Differentiates network coverage:
--   - DTDC (1): Strong national network, covers Metros, Tier-2, and Tier-3; ODA in remote high-altitude/NE borders
--   - Blue Dart (2): Aviation express specialist, Tier-1 Metros and major commercial hubs; ODA in Tier-3/rural/remote
--   - Delhivery (3): Universal domestic e-commerce network, reaches Metros, Tier-2/3/4 and remote NE/hill districts
--   - FedEx (4): High-speed airport and metro corridor specialist; unserviceable outside airport metro clusters
-- ============================================================================

CREATE TABLE IF NOT EXISTS courier_pincode_serviceability (
    serviceability_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    courier_id           BIGINT       NOT NULL REFERENCES courier_companies(courier_id) ON DELETE CASCADE,
    pincode              VARCHAR(10)  NOT NULL,
    city                 VARCHAR(100) NOT NULL,
    state                VARCHAR(100) NOT NULL,
    tier                 VARCHAR(20)  NOT NULL DEFAULT 'TIER_1', -- 'METRO', 'TIER_2', 'TIER_3', 'REMOTE'
    is_pickup            BOOLEAN      NOT NULL DEFAULT TRUE,
    is_delivery          BOOLEAN      NOT NULL DEFAULT TRUE,
    is_cod               BOOLEAN      NOT NULL DEFAULT TRUE,
    transit_days_offset  INT          NOT NULL DEFAULT 0,
    unserviceable_reason VARCHAR(255) NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_courier_pincode UNIQUE (courier_id, pincode)
);

CREATE INDEX IF NOT EXISTS idx_cps_pincode ON courier_pincode_serviceability(pincode);
CREATE INDEX IF NOT EXISTS idx_cps_courier_pincode ON courier_pincode_serviceability(courier_id, pincode);

-- Seed Pincode Coverage Matrix
INSERT INTO courier_pincode_serviceability 
    (courier_id, pincode, city, state, tier, is_pickup, is_delivery, is_cod, transit_days_offset, unserviceable_reason)
VALUES
    -- ========================================================================
    -- 1. TIER-1 METROS (All 4 couriers deliver & pick up seamlessly)
    -- ========================================================================
    -- 400001 (Mumbai Fort, MH)
    (1, '400001', 'Mumbai', 'Maharashtra', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (2, '400001', 'Mumbai', 'Maharashtra', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (3, '400001', 'Mumbai', 'Maharashtra', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (4, '400001', 'Mumbai', 'Maharashtra', 'METRO', TRUE, TRUE, TRUE, 0, NULL),

    -- 400051 (Bandra BKC, Mumbai, MH)
    (1, '400051', 'Mumbai', 'Maharashtra', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (2, '400051', 'Mumbai', 'Maharashtra', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (3, '400051', 'Mumbai', 'Maharashtra', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (4, '400051', 'Mumbai', 'Maharashtra', 'METRO', TRUE, TRUE, TRUE, 0, NULL),

    -- 110001 (Connaught Place, New Delhi)
    (1, '110001', 'New Delhi', 'Delhi', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (2, '110001', 'New Delhi', 'Delhi', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (3, '110001', 'New Delhi', 'Delhi', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (4, '110001', 'New Delhi', 'Delhi', 'METRO', TRUE, TRUE, TRUE, 0, NULL),

    -- 110037 (IGI Airport Cargo, New Delhi)
    (1, '110037', 'New Delhi', 'Delhi', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (2, '110037', 'New Delhi', 'Delhi', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (3, '110037', 'New Delhi', 'Delhi', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (4, '110037', 'New Delhi', 'Delhi', 'METRO', TRUE, TRUE, TRUE, 0, NULL),

    -- 560001 (MG Road, Bangalore, Karnataka)
    (1, '560001', 'Bangalore', 'Karnataka', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (2, '560001', 'Bangalore', 'Karnataka', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (3, '560001', 'Bangalore', 'Karnataka', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (4, '560001', 'Bangalore', 'Karnataka', 'METRO', TRUE, TRUE, TRUE, 0, NULL),

    -- 560103 (Bellandur Tech Park, Bangalore, Karnataka)
    (1, '560103', 'Bangalore', 'Karnataka', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (2, '560103', 'Bangalore', 'Karnataka', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (3, '560103', 'Bangalore', 'Karnataka', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (4, '560103', 'Bangalore', 'Karnataka', 'METRO', TRUE, TRUE, TRUE, 0, NULL),

    -- 500001 (Hyderabad GPO, Telangana)
    (1, '500001', 'Hyderabad', 'Telangana', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (2, '500001', 'Hyderabad', 'Telangana', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (3, '500001', 'Hyderabad', 'Telangana', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (4, '500001', 'Hyderabad', 'Telangana', 'METRO', TRUE, TRUE, TRUE, 0, NULL),

    -- 500081 (HITEC City, Hyderabad, Telangana)
    (1, '500081', 'Hyderabad', 'Telangana', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (2, '500081', 'Hyderabad', 'Telangana', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (3, '500081', 'Hyderabad', 'Telangana', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (4, '500081', 'Hyderabad', 'Telangana', 'METRO', TRUE, TRUE, TRUE, 0, NULL),

    -- 600001 (Chennai GPO, Tamil Nadu)
    (1, '600001', 'Chennai', 'Tamil Nadu', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (2, '600001', 'Chennai', 'Tamil Nadu', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (3, '600001', 'Chennai', 'Tamil Nadu', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (4, '600001', 'Chennai', 'Tamil Nadu', 'METRO', TRUE, TRUE, TRUE, 0, NULL),

    -- 700001 (Kolkata GPO, West Bengal)
    (1, '700001', 'Kolkata', 'West Bengal', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (2, '700001', 'Kolkata', 'West Bengal', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (3, '700001', 'Kolkata', 'West Bengal', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (4, '700001', 'Kolkata', 'West Bengal', 'METRO', TRUE, TRUE, TRUE, 0, NULL),

    -- 380001 (Ahmedabad, Gujarat)
    (1, '380001', 'Ahmedabad', 'Gujarat', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (2, '380001', 'Ahmedabad', 'Gujarat', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (3, '380001', 'Ahmedabad', 'Gujarat', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (4, '380001', 'Ahmedabad', 'Gujarat', 'METRO', TRUE, TRUE, TRUE, 0, NULL),

    -- 411001 (Pune Camp, Maharashtra)
    (1, '411001', 'Pune', 'Maharashtra', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (2, '411001', 'Pune', 'Maharashtra', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (3, '411001', 'Pune', 'Maharashtra', 'METRO', TRUE, TRUE, TRUE, 0, NULL),
    (4, '411001', 'Pune', 'Maharashtra', 'METRO', TRUE, TRUE, TRUE, 0, NULL),

    -- ========================================================================
    -- 2. TIER-2 COMMERCIAL CITIES (DTDC, Blue Dart, Delhivery: YES; FedEx: NO)
    -- ========================================================================
    -- 302001 (Jaipur, Rajasthan)
    (1, '302001', 'Jaipur', 'Rajasthan', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (2, '302001', 'Jaipur', 'Rajasthan', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (3, '302001', 'Jaipur', 'Rajasthan', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (4, '302001', 'Jaipur', 'Rajasthan', 'TIER_2', FALSE, FALSE, FALSE, 0, 'FedEx linehaul limited to metro airport cargo clusters'),

    -- 226001 (Lucknow, Uttar Pradesh)
    (1, '226001', 'Lucknow', 'Uttar Pradesh', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (2, '226001', 'Lucknow', 'Uttar Pradesh', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (3, '226001', 'Lucknow', 'Uttar Pradesh', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (4, '226001', 'Lucknow', 'Uttar Pradesh', 'TIER_2', FALSE, FALSE, FALSE, 0, 'FedEx linehaul limited to metro airport cargo clusters'),

    -- 452001 (Indore, Madhya Pradesh)
    (1, '452001', 'Indore', 'Madhya Pradesh', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (2, '452001', 'Indore', 'Madhya Pradesh', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (3, '452001', 'Indore', 'Madhya Pradesh', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (4, '452001', 'Indore', 'Madhya Pradesh', 'TIER_2', FALSE, FALSE, FALSE, 0, 'FedEx linehaul limited to metro airport cargo clusters'),

    -- 682001 (Kochi, Kerala)
    (1, '682001', 'Kochi', 'Kerala', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (2, '682001', 'Kochi', 'Kerala', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (3, '682001', 'Kochi', 'Kerala', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (4, '682001', 'Kochi', 'Kerala', 'TIER_2', FALSE, FALSE, FALSE, 0, 'FedEx linehaul limited to metro airport cargo clusters'),

    -- 751001 (Bhubaneswar, Odisha)
    (1, '751001', 'Bhubaneswar', 'Odisha', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (2, '751001', 'Bhubaneswar', 'Odisha', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (3, '751001', 'Bhubaneswar', 'Odisha', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (4, '751001', 'Bhubaneswar', 'Odisha', 'TIER_2', FALSE, FALSE, FALSE, 0, 'FedEx linehaul limited to metro airport cargo clusters'),

    -- 141001 (Ludhiana, Punjab)
    (1, '141001', 'Ludhiana', 'Punjab', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (2, '141001', 'Ludhiana', 'Punjab', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (3, '141001', 'Ludhiana', 'Punjab', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (4, '141001', 'Ludhiana', 'Punjab', 'TIER_2', FALSE, FALSE, FALSE, 0, 'FedEx linehaul limited to metro airport cargo clusters'),

    -- 800001 (Patna, Bihar)
    (1, '800001', 'Patna', 'Bihar', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (2, '800001', 'Patna', 'Bihar', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (3, '800001', 'Patna', 'Bihar', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (4, '800001', 'Patna', 'Bihar', 'TIER_2', FALSE, FALSE, FALSE, 0, 'FedEx linehaul limited to metro airport cargo clusters'),

    -- 395001 (Surat, Gujarat)
    (1, '395001', 'Surat', 'Gujarat', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (2, '395001', 'Surat', 'Gujarat', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (3, '395001', 'Surat', 'Gujarat', 'TIER_2', TRUE, TRUE, TRUE, 0, NULL),
    (4, '395001', 'Surat', 'Gujarat', 'TIER_2', FALSE, FALSE, FALSE, 0, 'FedEx linehaul limited to metro airport cargo clusters'),

    -- ========================================================================
    -- 3. TIER-3 / REGIONAL LANES (Delhivery & DTDC: YES; Blue Dart & FedEx: NO ODA)
    -- ========================================================================
    -- 842001 (Muzaffarpur, Bihar)
    (1, '842001', 'Muzaffarpur', 'Bihar', 'TIER_3', TRUE, TRUE, TRUE, 1, NULL),
    (2, '842001', 'Muzaffarpur', 'Bihar', 'TIER_3', FALSE, FALSE, FALSE, 0, 'ODA - Destination pincode outside Blue Dart express aviation grid'),
    (3, '842001', 'Muzaffarpur', 'Bihar', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (4, '842001', 'Muzaffarpur', 'Bihar', 'TIER_3', FALSE, FALSE, FALSE, 0, 'ODA - Outside FedEx domestic express delivery network'),

    -- 846001 (Darbhanga, Bihar)
    (1, '846001', 'Darbhanga', 'Bihar', 'TIER_3', TRUE, TRUE, TRUE, 1, NULL),
    (2, '846001', 'Darbhanga', 'Bihar', 'TIER_3', FALSE, FALSE, FALSE, 0, 'ODA - Destination pincode outside Blue Dart express aviation grid'),
    (3, '846001', 'Darbhanga', 'Bihar', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (4, '846001', 'Darbhanga', 'Bihar', 'TIER_3', FALSE, FALSE, FALSE, 0, 'ODA - Outside FedEx domestic express delivery network'),

    -- 273001 (Gorakhpur, Uttar Pradesh)
    (1, '273001', 'Gorakhpur', 'Uttar Pradesh', 'TIER_3', TRUE, TRUE, TRUE, 1, NULL),
    (2, '273001', 'Gorakhpur', 'Uttar Pradesh', 'TIER_3', FALSE, FALSE, FALSE, 0, 'ODA - Destination pincode outside Blue Dart express aviation grid'),
    (3, '273001', 'Gorakhpur', 'Uttar Pradesh', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (4, '273001', 'Gorakhpur', 'Uttar Pradesh', 'TIER_3', FALSE, FALSE, FALSE, 0, 'ODA - Outside FedEx domestic express delivery network'),

    -- 244001 (Moradabad, Uttar Pradesh)
    (1, '244001', 'Moradabad', 'Uttar Pradesh', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (2, '244001', 'Moradabad', 'Uttar Pradesh', 'TIER_3', FALSE, FALSE, FALSE, 0, 'ODA - Destination pincode outside Blue Dart express aviation grid'),
    (3, '244001', 'Moradabad', 'Uttar Pradesh', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (4, '244001', 'Moradabad', 'Uttar Pradesh', 'TIER_3', FALSE, FALSE, FALSE, 0, 'ODA - Outside FedEx domestic express delivery network'),

    -- 324001 (Kota, Rajasthan)
    (1, '324001', 'Kota', 'Rajasthan', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (2, '324001', 'Kota', 'Rajasthan', 'TIER_3', FALSE, FALSE, FALSE, 0, 'ODA - Destination pincode outside Blue Dart express aviation grid'),
    (3, '324001', 'Kota', 'Rajasthan', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (4, '324001', 'Kota', 'Rajasthan', 'TIER_3', FALSE, FALSE, FALSE, 0, 'ODA - Outside FedEx domestic express delivery network'),

    -- 422001 (Nashik, Maharashtra - semi-metro where Blue Dart delivers, but FedEx does not)
    (1, '422001', 'Nashik', 'Maharashtra', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (2, '422001', 'Nashik', 'Maharashtra', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (3, '422001', 'Nashik', 'Maharashtra', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (4, '422001', 'Nashik', 'Maharashtra', 'TIER_3', FALSE, FALSE, FALSE, 0, 'FedEx linehaul limited to metro airport cargo clusters'),

    -- 570001 (Mysore, Karnataka - semi-metro where Blue Dart delivers, but FedEx does not)
    (1, '570001', 'Mysore', 'Karnataka', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (2, '570001', 'Mysore', 'Karnataka', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (3, '570001', 'Mysore', 'Karnataka', 'TIER_3', TRUE, TRUE, TRUE, 0, NULL),
    (4, '570001', 'Mysore', 'Karnataka', 'TIER_3', FALSE, FALSE, FALSE, 0, 'FedEx linehaul limited to metro airport cargo clusters'),

    -- ========================================================================
    -- 4. REMOTE / NORTH-EAST / HIMALAYAN (Delhivery Exclusive; Others: ODA)
    -- ========================================================================
    -- 795001 (Imphal, Manipur)
    (1, '795001', 'Imphal', 'Manipur', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Out of service area for DTDC surface/franchise network'),
    (2, '795001', 'Imphal', 'Manipur', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Blue Dart express aviation network unavailable'),
    (3, '795001', 'Imphal', 'Manipur', 'REMOTE', TRUE, TRUE, TRUE, 2, NULL),
    (4, '795001', 'Imphal', 'Manipur', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Outside FedEx domestic delivery network'),

    -- 796001 (Aizawl, Mizoram)
    (1, '796001', 'Aizawl', 'Mizoram', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Out of service area for DTDC surface/franchise network'),
    (2, '796001', 'Aizawl', 'Mizoram', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Blue Dart express aviation network unavailable'),
    (3, '796001', 'Aizawl', 'Mizoram', 'REMOTE', TRUE, TRUE, TRUE, 2, NULL),
    (4, '796001', 'Aizawl', 'Mizoram', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Outside FedEx domestic delivery network'),

    -- 793001 (Shillong, Meghalaya)
    (1, '793001', 'Shillong', 'Meghalaya', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Mountain terrain restricted delivery area'),
    (2, '793001', 'Shillong', 'Meghalaya', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Blue Dart express aviation network unavailable'),
    (3, '793001', 'Shillong', 'Meghalaya', 'REMOTE', TRUE, TRUE, TRUE, 1, NULL),
    (4, '793001', 'Shillong', 'Meghalaya', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Outside FedEx domestic delivery network'),

    -- 194101 (Leh, Ladakh)
    (1, '194101', 'Leh', 'Ladakh', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Extreme high-altitude Himalayan sector unreachable'),
    (2, '194101', 'Leh', 'Ladakh', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Destination outside commercial aviation courier corridor'),
    (3, '194101', 'Leh', 'Ladakh', 'REMOTE', TRUE, TRUE, TRUE, 3, NULL),
    (4, '194101', 'Leh', 'Ladakh', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Outside FedEx domestic delivery network'),

    -- 172107 (Kalpa / Kinnaur, Himachal Pradesh)
    (1, '172107', 'Kalpa', 'Himachal Pradesh', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Extreme high-altitude hill sector unreachable'),
    (2, '172107', 'Kalpa', 'Himachal Pradesh', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Destination outside commercial aviation courier corridor'),
    (3, '172107', 'Kalpa', 'Himachal Pradesh', 'REMOTE', TRUE, TRUE, TRUE, 2, NULL),
    (4, '172107', 'Kalpa', 'Himachal Pradesh', 'REMOTE', FALSE, FALSE, FALSE, 0, 'ODA - Outside FedEx domestic delivery network')
ON CONFLICT (courier_id, pincode) DO NOTHING;
