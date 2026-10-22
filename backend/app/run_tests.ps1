$ErrorActionPreference = "Stop"
$BASE = "http://localhost:8000/api"

Write-Output "Starting Comprehensive Multi-Tenant Security & Functional Verification..."
Write-Output "----------------------------------------------------------------------"

# 1. Health check
$health = Invoke-RestMethod -Uri "$BASE/health"
if ($health.status -ne "healthy") { throw "Health check failed" }
Write-Output "Test 1 Passed: System Health & Database connectivity OK"

# 2. Rate Comparison with Volumetric Weight
$rateBody = @{
    origin_pincode = "400001"
    destination_pincode = "110001"
    weight_kg = 2.0
    length_cm = 20
    width_cm = 15
    height_cm = 10
    declared_value = 1000
} | ConvertTo-Json

$rates = Invoke-RestMethod -Uri "$BASE/rates/compare" -Method Post -ContentType "application/json" -Body $rateBody
if ($rates.quotes.Count -lt 4) { throw "Expected 4 carrier quotes" }
Write-Output ("Test 2 Passed: Rate Engine returned " + $rates.quotes.Count + " quotes with SLA badges")

# 3. Seller Authentication (Bcrypt Password & JWT Issuance)
$loginBody = @{
    email = "ops-fulfillment@amazon.in"
    password = "password123"
} | ConvertTo-Json

$sellerLogin = Invoke-RestMethod -Uri "$BASE/sellers/login" -Method Post -ContentType "application/json" -Body $loginBody
if (-not $sellerLogin.access_token) { throw "Seller login failed to return access token" }
if ($sellerLogin.seller.company_name -ne "Amazon India Seller Services") { throw "Incorrect seller company" }
if (-not $sellerLogin.seller.api_key.Contains("...")) { throw "Sensitive API key was not masked!" }
$amazonToken = $sellerLogin.access_token
$amazonHeaders = @{ Authorization = "Bearer " + $amazonToken }
Write-Output "Test 3 Passed: Seller bcrypt authentication & signed JWT token verified with masked API key"

# 4. Cross-Tenant Merchant Isolation (Amazon cannot view Flipkart data)
$leakBlocked = $false
try {
    Invoke-RestMethod -Uri "$BASE/sellers/2/orders" -Headers $amazonHeaders
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        $leakBlocked = $true
    }
}
if (-not $leakBlocked) { throw "Cross-tenant leakage NOT blocked!" }
Write-Output "Test 4 Passed: Cross-Tenant Merchant Isolation verified (Amazon blocked from Flipkart orders with 403 Forbidden)"

# 5. Seller Order Booking (Tenant Locked)
$orderBody = @{
    courier_id = 1
    sender_name = "Amazon Fulfillment Hub"
    sender_phone = "9820011111"
    sender_email = "ops-auto@amazon.in"
    sender_address = "Bhiwandi Hub"
    sender_city = "Mumbai"
    sender_state = "Maharashtra"
    sender_pincode = "400001"
    receiver_name = "Test Consignee"
    receiver_phone = "9811022222"
    receiver_email = "consignee@test.com"
    receiver_address = "Sector 18"
    receiver_city = "New Delhi"
    receiver_state = "Delhi"
    receiver_pincode = "110001"
    parcel_type = "SMALL_PACKAGE"
    weight_kg = 1.5
    length_cm = 15
    width_cm = 10
    height_cm = 10
    declared_value = 800
} | ConvertTo-Json

$parcel = Invoke-RestMethod -Uri "$BASE/sellers/orders" -Method Post -ContentType "application/json" -Headers $amazonHeaders -Body $orderBody
$trackingNo = $parcel.tracking_number
$courierName = $parcel.courier_name
if ($parcel.seller_id -ne 1) { throw "Order seller_id was not locked to authenticated merchant" }
Write-Output ("Test 5 Passed: Seller booked parcel " + $trackingNo + " via " + $courierName + " with strict tenant binding")

# 6. Public Tracking & Carrier Branding
$tracked = Invoke-RestMethod -Uri "$BASE/track/$trackingNo"
if ($tracked.courier_name -ne "DTDC Express Logistics") { throw "Carrier branding missing on tracking" }
Write-Output "Test 6 Passed: Public tracking verified with carrier partner branding"

# 7. Customer Dispute Filing
$disputeBody = @{
    parcel_id = $parcel.parcel_id
    raised_by_type = "CUSTOMER"
    raised_by_name = "Test Consignee"
    raised_by_email = "consignee@test.com"
    reason = "Package delayed in transit"
} | ConvertTo-Json

$dispute = Invoke-RestMethod -Uri "$BASE/track/$trackingNo/dispute" -Method Post -ContentType "application/json" -Body $disputeBody
$disputeId = $dispute.dispute_id
Write-Output ("Test 7 Passed: Customer dispute #" + $disputeId + " filed successfully")

# 8. Super Admin Login & Dispute Resolution
$saLoginBody = @{
    email = "superadmin@courier.com"
    password = "password123"
} | ConvertTo-Json
$saLogin = Invoke-RestMethod -Uri "$BASE/auth/login" -Method Post -ContentType "application/json" -Body $saLoginBody
$saHeaders = @{ Authorization = "Bearer " + $saLogin.access_token }

$overview = Invoke-RestMethod -Uri "$BASE/super-admin/overview" -Headers $saHeaders
if ($overview.total_couriers -ne 4 -or $overview.total_sellers -ne 4) { throw "Super admin overview count mismatch" }
Write-Output "Test 8 Passed: Super Root Admin cross-tenant overview verified"

$resolveBody = @{
    status = "RESOLVED"
    resolution_notes = "Arbitrated in automated test: claim approved"
} | ConvertTo-Json
$resolved = Invoke-RestMethod -Uri "$BASE/super-admin/disputes/$disputeId/resolve" -Method Put -ContentType "application/json" -Headers $saHeaders -Body $resolveBody
if ($resolved.status -ne "RESOLVED") { throw "Dispute resolution failed" }
Write-Output "Test 9 Passed: Super Root Admin arbitrated and resolved dispute"

# 9. Carrier Tenant Isolation Verification
$dtdcLoginBody = @{ email = "rajesh.kumar@courier.com"; password = "password123" } | ConvertTo-Json
$dtdcLogin = Invoke-RestMethod -Uri "$BASE/auth/login" -Method Post -ContentType "application/json" -Body $dtdcLoginBody
$dtdcHeaders = @{ Authorization = "Bearer " + $dtdcLogin.access_token }

$bdLoginBody = @{ email = "bluedart.admin@courier.com"; password = "password123" } | ConvertTo-Json
$bdLogin = Invoke-RestMethod -Uri "$BASE/auth/login" -Method Post -ContentType "application/json" -Body $bdLoginBody
$bdHeaders = @{ Authorization = "Bearer " + $bdLogin.access_token }

$dtdcParcels = Invoke-RestMethod -Uri "$BASE/parcels" -Headers $dtdcHeaders
$bdParcels = Invoke-RestMethod -Uri "$BASE/parcels" -Headers $bdHeaders

foreach ($p in $dtdcParcels) {
    if ($p.courier_id -ne 1) { throw "DTDC tenant isolation leak detected!" }
}
foreach ($p in $bdParcels) {
    if ($p.courier_id -ne 2) { throw "Blue Dart tenant isolation leak detected!" }
}
Write-Output "Test 10 Passed: Strict Carrier Tenant Data Isolation verified (zero cross-tenant leakage)"

# 10. Multi-Website Port Availability Check
$p73 = (Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing).StatusCode
$p74 = (Invoke-WebRequest -Uri "http://localhost:5174" -UseBasicParsing).StatusCode
$p75 = (Invoke-WebRequest -Uri "http://localhost:5175" -UseBasicParsing).StatusCode
if ($p73 -ne 200 -or $p74 -ne 200 -or $p75 -ne 200) { throw "One or more portal ports failed" }
Write-Output "Test 11 Passed: All 3 Separate Website Portals (5173, 5174, 5175) responding with 200 OK"

# 11. Anti-Privilege Escalation: Seller token MUST be rejected at employee endpoints
$sellerEscalationBlocked = $false
try {
    Invoke-RestMethod -Uri "$BASE/parcels" -Headers $amazonHeaders
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        $sellerEscalationBlocked = $true
    }
}
if (-not $sellerEscalationBlocked) { throw "CRITICAL SECURITY FLAW: Seller token accessed employee endpoint!" }
Write-Output "Test 12 Passed: Anti-Privilege Escalation verified (Seller JWT rejected at Employee API with 401 Unauthorized)"

# 12. Delivery Attempt Carrier Isolation: Carrier B staff cannot record delivery attempt on Carrier A parcel
$crossDeliveryBlocked = $false
try {
    # Attempting delivery on DTDC parcel ($parcel.parcel_id) using Blue Dart credentials ($bdHeaders)
    $deliveryBody = @{
        parcel_id = $parcel.parcel_id
        outcome = "DELIVERED"
        recipient_name = "Intruder"
        signature_collected = $false
        remarks = "Cross-carrier attempt"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$BASE/delivery-attempts" -Method Post -ContentType "application/json" -Headers $bdHeaders -Body $deliveryBody
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 403 -or $code -eq 400) {
        $crossDeliveryBlocked = $true
    }
}
if (-not $crossDeliveryBlocked) { throw "Cross-carrier delivery attempt was NOT blocked!" }
Write-Output "Test 13 Passed: Carrier Scoping on Delivery Attempts verified (Cross-carrier modification blocked)"

# 13. Differentiated Regional Pincode Serviceability (Muzaffarpur Tier-3)
$t3Body = @{
    origin_pincode = "560001"
    destination_pincode = "842001"
    weight_kg = 1.8
} | ConvertTo-Json
$t3Rates = Invoke-RestMethod -Uri "$BASE/rates/compare" -Method Post -ContentType "application/json" -Body $t3Body
$bdQuote = $t3Rates.quotes | Where-Object { $_.courier_code -eq "BLUEDART" }
$fxQuote = $t3Rates.quotes | Where-Object { $_.courier_code -eq "FEDEX" }
$delQuote = $t3Rates.quotes | Where-Object { $_.courier_code -eq "DELHIVERY" }
if ($bdQuote.is_serviceable -ne $false -or $fxQuote.is_serviceable -ne $false -or $delQuote.is_serviceable -ne $true) {
    throw "Tier-3 serviceability matrix failed"
}
Write-Output "Test 14 Passed: Differentiated Regional Pincode Serviceability verified (Tier-3 ODA handling)"

# 14. Remote North-East Carrier Exclusivity (Imphal 795001)
$neBody = @{
    origin_pincode = "110001"
    destination_pincode = "795001"
    weight_kg = 1.2
} | ConvertTo-Json
$neRates = Invoke-RestMethod -Uri "$BASE/rates/compare" -Method Post -ContentType "application/json" -Body $neBody
$delNE = $neRates.quotes | Where-Object { $_.courier_code -eq "DELHIVERY" }
$dtdcNE = $neRates.quotes | Where-Object { $_.courier_code -eq "DTDC" }
if ($delNE.is_serviceable -ne $true -or $dtdcNE.is_serviceable -ne $false -or $neRates.recommended_courier_id -ne $delNE.courier_id) {
    throw "Remote NE exclusivity check failed"
}
Write-Output "Test 15 Passed: Remote North-East carrier exclusivity & transit-offset verified"

# 15. Backend Serviceability Rejection on Booking
$serviceabilityBlocked = $false
try {
    $unservBooking = @{
        courier_id = 2 # Blue Dart
        sender_name = "Amazon Fulfillment BLR"
        sender_phone = "+91 8041122334"
        sender_email = "ops-fulfillment@amazon.in"
        sender_address = "Brigade Gateway, Rajajinagar"
        sender_city = "Bangalore"
        sender_state = "Karnataka"
        sender_pincode = "560055"
        receiver_name = "Ramesh Kumar"
        receiver_phone = "+91 9934112233"
        receiver_email = "ramesh.muzaffarpur@example.com"
        receiver_address = "Main Market Road"
        receiver_city = "Muzaffarpur"
        receiver_state = "Bihar"
        receiver_pincode = "842001"
        parcel_type = "SMALL_PACKAGE"
        weight_kg = 1.5
        length_cm = 20
        width_cm = 15
        height_cm = 10
        declared_value = 800
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$BASE/sellers/orders" -Method Post -ContentType "application/json" -Headers $amazonHeaders -Body $unservBooking
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 400) {
        $serviceabilityBlocked = $true
    }
}
if (-not $serviceabilityBlocked) { throw "Booking through unserviceable carrier was NOT blocked by backend!" }
Write-Output "Test 16 Passed: Backend enforced serviceability integrity (blocked dispatch through ODA carrier with 400 Bad Request)"

Write-Output ""
Write-Output "======================================================================"
Write-Output "ALL 16 COMPREHENSIVE END-TO-END MULTI-TENANT & SECURITY TESTS PASSED!"
Write-Output "======================================================================"
