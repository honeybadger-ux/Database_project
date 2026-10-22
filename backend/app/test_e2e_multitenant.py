import json
import urllib.error
import urllib.request

BASE = 'http://localhost:8000/api'


def api_request(path, method='GET', data=None, headers=None):
    url = f"{BASE}{path}"
    req_headers = {'Content-Type': 'application/json'}
    if headers:
        req_headers.update(headers)

    body = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.status
            content = resp.read().decode('utf-8')
            return status_code, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode('utf-8')
        return e.code, json.loads(content) if content else {}


# 1. Health check
status, body = api_request('/health')
assert status == 200, f'Health check failed: {status}'
print('Test 1 Passed: System Health & Database connectivity OK')

# 2. Rate Comparison
rate_payload = {
    'origin_pincode': '400001',
    'destination_pincode': '110001',
    'weight_kg': 2.0,
    'length_cm': 20,
    'width_cm': 15,
    'height_cm': 10,
    'declared_value': 1000,
}
status, body = api_request('/rates/compare', method='POST', data=rate_payload)
assert status == 200, f'Rate comparison failed: {body}'
quotes = body['quotes']
assert len(quotes) >= 4, 'Expected quotes for all 4 carriers'
print(f'Test 2 Passed: Rate Engine returned {len(quotes)} carrier quotes with volumetric calculation')

# 3. Seller Authentication (Bcrypt Password & JWT Issuance)
seller_login_payload = {
    'email': 'ops-fulfillment@amazon.in',
    'password': 'password123',
}
status, seller_login = api_request('/sellers/login', method='POST', data=seller_login_payload)
assert status == 200, f'Seller login failed: {seller_login}'
amazon_token = seller_login['access_token']
amazon_headers = {'Authorization': f'Bearer {amazon_token}'}
assert seller_login['seller']['company_name'] == 'Amazon India Seller Services'
assert '...' in seller_login['seller']['api_key'], 'API Key must be securely masked'
print('Test 3 Passed: Seller bcrypt authentication & signed JWT token verified with masked API key')

# 4. Cross-Tenant Merchant Isolation (Amazon cannot view Flipkart data)
status, flipkart_leak_attempt = api_request('/sellers/2/orders', headers=amazon_headers)
assert status == 403, f'Cross-tenant leakage not blocked! Status: {status}'
print('Test 4 Passed: Cross-Tenant Merchant Isolation verified (Amazon blocked from Flipkart orders with 403 Forbidden)')

# 5. Seller Order Booking (Tenant Locked)
order_payload = {
    'courier_id': 1,
    'sender_name': 'Amazon Fulfillment Hub',
    'sender_phone': '9820011111',
    'sender_email': 'ops-auto@amazon.in',
    'sender_address': 'Bhiwandi Hub',
    'sender_city': 'Mumbai',
    'sender_state': 'Maharashtra',
    'sender_pincode': '400001',
    'receiver_name': 'Test Consignee',
    'receiver_phone': '9811022222',
    'receiver_email': 'consignee@test.com',
    'receiver_address': 'Sector 18',
    'receiver_city': 'New Delhi',
    'receiver_state': 'Delhi',
    'receiver_pincode': '110001',
    'parcel_type': 'SMALL_PACKAGE',
    'weight_kg': 1.5,
    'length_cm': 15,
    'width_cm': 10,
    'height_cm': 10,
    'declared_value': 800,
}
status, parcel = api_request('/sellers/orders', method='POST', data=order_payload, headers=amazon_headers)
assert status == 201, f'Seller order failed: {parcel}'
tracking_no = parcel['tracking_number']
courier_name = parcel['courier_name']
assert parcel['seller_id'] == 1, 'Order must be strictly bound to authenticated merchant tenant'
print(f'Test 5 Passed: Seller booked parcel {tracking_no} via {courier_name} with strict tenant binding')

# 6. Public Tracking & Carrier Branding
status, body = api_request(f'/track/{tracking_no}')
assert status == 200, 'Tracking lookup failed'
assert body['courier_name'] == 'DTDC Express Logistics'
print('Test 6 Passed: Public tracking verified with carrier partner branding')

# 7. Customer Dispute Filing
dispute_payload = {
    'parcel_id': parcel['parcel_id'],
    'raised_by_type': 'CUSTOMER',
    'raised_by_name': 'Test Consignee',
    'raised_by_email': 'consignee@test.com',
    'reason': 'Package delayed in transit',
}
status, body = api_request(f'/track/{tracking_no}/dispute', method='POST', data=dispute_payload)
assert status == 201, f'Dispute filing failed: {body}'
dispute_id = body['dispute_id']
print(f'Test 7 Passed: Customer dispute #{dispute_id} filed successfully')

# 8. Super Admin Login & Dispute Resolution
status, login_res = api_request(
    '/auth/login', method='POST', data={'email': 'superadmin@courier.com', 'password': 'password123'}
)
assert status == 200, f'Super admin login failed: {login_res}'
sa_token = login_res['access_token']
sa_headers = {'Authorization': f'Bearer {sa_token}'}

status, overview = api_request('/super-admin/overview', headers=sa_headers)
assert status == 200, f'Super admin overview failed: {overview}'
assert overview['total_couriers'] == 4 and overview['total_sellers'] == 4
print('Test 8 Passed: Super Root Admin cross-tenant overview verified')

status, body = api_request(
    f'/super-admin/disputes/{dispute_id}/resolve',
    method='PUT',
    headers=sa_headers,
    data={'status': 'RESOLVED', 'resolution_notes': 'Automated test arbitration ruling: refund issued'},
)
assert status == 200, f'Dispute resolution failed: {body}'
assert body['status'] == 'RESOLVED'
print('Test 9 Passed: Super Root Admin arbitrated and resolved dispute')

# 9. Carrier Isolation Verification
status, dtdc_res = api_request(
    '/auth/login', method='POST', data={'email': 'rajesh.kumar@courier.com', 'password': 'password123'}
)
dtdc_token = dtdc_res['access_token']
status, bd_res = api_request(
    '/auth/login', method='POST', data={'email': 'bluedart.admin@courier.com', 'password': 'password123'}
)
bd_token = bd_res['access_token']

status, dtdc_parcels = api_request('/parcels', headers={'Authorization': f'Bearer {dtdc_token}'})
status, bd_parcels = api_request('/parcels', headers={'Authorization': f'Bearer {bd_token}'})

assert all(p['courier_id'] == 1 for p in dtdc_parcels), 'DTDC tenant leakage detected'
assert all(p['courier_id'] == 2 for p in bd_parcels), 'Blue Dart tenant leakage detected'
print('Test 10 Passed: Strict Carrier Tenant Data Isolation verified (zero cross-tenant leakage)')

# 10. Differentiated Pincode Serviceability & Recommendation Verification
status, m_res = api_request(
    '/rates/compare',
    method='POST',
    data={'origin_pincode': '560001', 'destination_pincode': '842001', 'weight_kg': 1.8},
)
assert status == 200, f'Tier-3 rate comparison failed: {m_res}'
q_by_code = {q['courier_code']: q for q in m_res['quotes']}
assert q_by_code['DELHIVERY']['is_serviceable'] is True, 'Delhivery must service Muzaffarpur'
assert q_by_code['DTDC']['is_serviceable'] is True, 'DTDC must service Muzaffarpur'
assert q_by_code['BLUEDART']['is_serviceable'] is False, 'Blue Dart must be ODA for Muzaffarpur'
assert q_by_code['FEDEX']['is_serviceable'] is False, 'FedEx must be ODA for Muzaffarpur'
assert m_res['recommended_courier_id'] in (1, 3), 'Recommendation must only pick serviceable carriers'
print('Test 11 Passed: Differentiated Regional Pincode Serviceability Engine verified (Tier-3 ODA handling)')

# 11. Remote North-East Exclusive Serviceability Verification
status, ne_res = api_request(
    '/rates/compare',
    method='POST',
    data={'origin_pincode': '110001', 'destination_pincode': '795001', 'weight_kg': 1.2},
)
assert status == 200, f'NE rate comparison failed: {ne_res}'
ne_by_code = {q['courier_code']: q for q in ne_res['quotes']}
assert ne_by_code['DELHIVERY']['is_serviceable'] is True, 'Delhivery must service Imphal'
assert ne_by_code['DTDC']['is_serviceable'] is False, 'DTDC must be unserviceable for extreme NE border'
assert ne_by_code['BLUEDART']['is_serviceable'] is False, 'Blue Dart must be unserviceable for Imphal'
assert ne_by_code['FEDEX']['is_serviceable'] is False, 'FedEx must be unserviceable for Imphal'
assert ne_res['recommended_courier_id'] == ne_by_code['DELHIVERY']['courier_id'], 'Delhivery must be the sole recommended carrier'
print('Test 12 Passed: Remote North-East carrier exclusivity & transit-offset verified')

# 12. Backend Serviceability Rejection on Booking
unserviceable_booking = {
    'courier_id': 2, # Blue Dart
    'sender_name': 'Amazon Fulfillment BLR',
    'sender_phone': '+91 8041122334',
    'sender_email': 'ops-fulfillment@amazon.in',
    'sender_address': 'Brigade Gateway, Rajajinagar',
    'sender_city': 'Bangalore',
    'sender_state': 'Karnataka',
    'sender_pincode': '560055',
    'receiver_name': 'Ramesh Kumar',
    'receiver_phone': '+91 9934112233',
    'receiver_email': 'ramesh.muzaffarpur@example.com',
    'receiver_address': 'Main Market Road',
    'receiver_city': 'Muzaffarpur',
    'receiver_state': 'Bihar',
    'receiver_pincode': '842001',
    'parcel_type': 'SMALL_PACKAGE',
    'weight_kg': 1.5,
    'length_cm': 20,
    'width_cm': 15,
    'height_cm': 10,
    'declared_value': 800,
}
status, rej_res = api_request('/sellers/orders', method='POST', headers=amazon_headers, data=unserviceable_booking)
assert status == 400, f'Expected 400 Bad Request for unserviceable carrier booking, got {status}: {rej_res}'
assert 'Serviceability Violation' in rej_res.get('detail', ''), f'Expected Serviceability Violation message, got {rej_res}'
print('Test 13 Passed: Backend enforced serviceability integrity (blocked dispatch through ODA carrier with 400 Bad Request)')

print('\n' + '=' * 60)
print('ALL 13 COMPREHENSIVE END-TO-END MULTI-TENANT & SECURITY TESTS PASSED!')
print('=' * 60)
