import urllib.request
import json

def test_route(orig, dest):
    data = json.dumps({'origin_pincode': orig, 'destination_pincode': dest, 'weight_kg': 1.5}).encode()
    req = urllib.request.Request('http://localhost:8000/api/rates/compare', data=data, headers={'Content-Type': 'application/json'})
    res = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"\n=== Route: {orig} -> {dest} ===")
    print(f"Recommended Carrier ID: {res.get('recommended_courier_id')}")
    for q in res['quotes']:
        status = 'SERVICEABLE' if q['is_serviceable'] else 'UNSERVICEABLE'
        reason = f" ({q['unserviceable_reason']})" if q.get('unserviceable_reason') else ''
        print(f"  - {q['courier_name']} ({q['courier_code']}): {status}{reason} | Days: {q['estimated_transit_days']} | Cost: Rs.{q['total_cost']} | Badge: {q.get('badge')}")

if __name__ == '__main__':
    test_route('400001', '110001') # Metro Run (Mumbai -> Delhi)
    test_route('560001', '842001') # Tier-3 (Bangalore -> Muzaffarpur)
    test_route('110001', '795001') # Remote North-East (Delhi -> Imphal)
    test_route('110001', '194101') # Remote Himalayan (Delhi -> Leh)
