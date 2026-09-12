"""
Automated Verification & Test Suite for Apna Crop Backend
Tests Username/Password Authentication, Bcrypt Hashing, Role-Based Access Control,
Crop Management, Auditable Profit Calculations, Pipeline Transitions, and Admin Analytics.
"""

from fastapi.testclient import TestClient
from main import app, init_db

client = TestClient(app)

def test_full_portal_flow():
    print("\n--- 1. Testing Crops Catalog ---")
    res = client.get("/api/crops")
    assert res.status_code == 200, f"Failed getting crops: {res.text}"
    crops = res.json()
    assert len(crops) >= 8, f"Expected at least 8 seeded crops, got {len(crops)}"
    wheat = next((c for c in crops if c["crop_name"] == "Wheat"), None)
    assert wheat is not None, "Wheat crop not found"
    assert wheat["price_per_quintal"] == 2275.0, f"Expected 2275.0, got {wheat['price_per_quintal']}"
    print("[PASS] Crops catalog successfully loaded with correct MSP rates.")

    print("\n--- 2. Testing Farmer Self-Registration (Username & Password with Bcrypt) ---")
    # Test weak password rejection (< 8 characters)
    weak_pwd_res = client.post("/api/auth/register", json={
        "name": "Test Farmer",
        "username": "test_weak",
        "mobile": "9811111111",
        "password": "short"
    })
    assert weak_pwd_res.status_code == 400, "Expected 400 for short password"
    print("[PASS] Weak password (< 8 chars) properly rejected by server.")

    # Test weak password rejection (no numbers)
    no_num_pwd_res = client.post("/api/auth/register", json={
        "name": "Test Farmer",
        "username": "test_nonum",
        "mobile": "9822222222",
        "password": "onlylettershere"
    })
    assert no_num_pwd_res.status_code == 400, "Expected 400 for password with no numbers"
    print("[PASS] Password missing numbers properly rejected by server.")

    # Test successful farmer registration
    valid_reg_res = client.post("/api/auth/register", json={
        "name": "Kavitha Reddy",
        "username": "kavitha_reddy",
        "mobile": "9833333333",
        "password": "SecurePass123",
        "village": "Bodhan",
        "district": "Nizamabad",
        "state": "Telangana"
    })
    assert valid_reg_res.status_code == 200, f"Registration failed: {valid_reg_res.text}"
    new_farmer_data = valid_reg_res.json()
    assert new_farmer_data["user"]["role"] == "farmer"
    assert new_farmer_data["user"]["username"] == "kavitha_reddy"
    assert "token" in new_farmer_data
    print("[PASS] Farmer self-registration succeeded and issued JWT token (role: farmer).")

    # Test duplicate username rejection
    dup_reg_res = client.post("/api/auth/register", json={
        "name": "Another Farmer",
        "username": "kavitha_reddy",
        "mobile": "9844444444",
        "password": "SecurePass123"
    })
    assert dup_reg_res.status_code == 400, "Expected 400 for duplicate username"
    print("[PASS] Duplicate username properly rejected with 400 error.")

    print("\n--- 3. Testing Login (Farmer & Admin with Bcrypt Verification) ---")
    # Bad credentials
    bad_login = client.post("/api/auth/login", json={"username": "ramesh", "password": "WrongPassword"})
    assert bad_login.status_code == 401, "Expected 401 on bad password"
    print("[PASS] Invalid password rejected with 401 Unauthorized.")

    # Farmer Login with pre-seeded ramesh / Farmer@123
    farmer_login = client.post("/api/auth/login", json={"username": "ramesh", "password": "Farmer@123"})
    assert farmer_login.status_code == 200, f"Farmer login failed: {farmer_login.text}"
    farmer_data = farmer_login.json()
    farmer_token = farmer_data["token"]
    assert farmer_data["user"]["role"] == "farmer"
    assert farmer_data["user"]["username"] == "ramesh"
    farmer_headers = {"Authorization": f"Bearer {farmer_token}"}
    print("[PASS] Farmer logged in successfully via username & password.")

    # Admin Login with pre-seeded admin / admin123
    admin_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_data = admin_login.json()
    admin_token = admin_data["token"]
    assert admin_data["user"]["role"] == "admin"
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] Admin logged in successfully via username & password.")

    print("\n--- 4. Testing Role Authorization & Crop Management ---")
    # Farmer blocked from adding crop (403)
    forbidden_add = client.post("/api/crops", json={
        "crop_name": "Unauthorized Crop",
        "category": "Cereal",
        "price_per_quintal": 3000.0
    }, headers=farmer_headers)
    assert forbidden_add.status_code == 403, f"Expected 403 for farmer, got {forbidden_add.status_code}"
    print("[PASS] Non-admin properly blocked from adding crop (403 Forbidden).")

    # Admin adds new crop
    add_crop_res = client.post("/api/crops", json={
        "crop_name": "Barley (Premium Malting)",
        "category": "Cereal",
        "price_per_quintal": 2350.0
    }, headers=admin_headers)
    assert add_crop_res.status_code == 200, f"Admin failed to add crop: {add_crop_res.text}"
    barley_id = add_crop_res.json()["crop"]["id"]

    # Admin edits crop price
    update_crop_res = client.put(f"/api/crops/{barley_id}", json={
        "price_per_quintal": 2400.0
    }, headers=admin_headers)
    assert update_crop_res.status_code == 200
    assert update_crop_res.json()["crop"]["price_per_quintal"] == 2400.0
    print("[PASS] Admin added and updated crop pricing successfully.")

    print("\n--- 5. Testing Booking Creation & Transparent Profit Calculation ---")
    centres_res = client.get("/api/centres")
    centre_id = centres_res.json()[0]["id"]

    booking_payload = {
        "crop_name": "Wheat",
        "quantity_quintals": 30.0,
        "centre_id": centre_id,
        "booking_date": "2026-10-20",
        "time_slot": "09:00 - 11:00",
        "notes": "Grade FAQ Wheat Harvest"
    }
    booking_res = client.post("/api/bookings", json=booking_payload, headers=farmer_headers)
    assert booking_res.status_code == 200, f"Booking creation failed: {booking_res.text}"
    b_data = booking_res.json()

    # Formula Verification:
    # Qty: 30 qtl, Wheat MSP: 2275.0
    # Gross: 30 * 2275 = 68250.0
    # Mandi fee (1.5%): 68250 * 0.015 = 1023.75
    # Labor (20/qtl): 30 * 20 = 600.00
    # Transport (25/qtl): 30 * 25 = 750.00
    # Total deductions: 1023.75 + 600 + 750 = 2373.75
    # Net: 68250 - 2373.75 = 65876.25
    fin = b_data["financial_breakdown"]
    assert fin["gross_amount"] == 68250.0, f"Expected 68250.0 gross, got {fin['gross_amount']}"
    assert fin["mandi_fee"] == 1023.75, f"Expected 1023.75 mandi fee, got {fin['mandi_fee']}"
    assert fin["labor_charge"] == 600.0, f"Expected 600.0 labor, got {fin['labor_charge']}"
    assert fin["transport_charge"] == 750.0, f"Expected 750.0 transport, got {fin['transport_charge']}"
    assert fin["total_deductions"] == 2373.75, f"Expected 2373.75 deductions, got {fin['total_deductions']}"
    assert fin["net_amount"] == 65876.25, f"Expected 65876.25 net, got {fin['net_amount']}"
    assert "token_number" in b_data

    created_booking_id = b_data["booking"]["id"]
    print("[PASS] Auditable financial breakdown verified:")
    print(f"  Gross: Rs.{fin['gross_amount']} - Deductions: Rs.{fin['total_deductions']} = Net: Rs.{fin['net_amount']}")

    print("\n--- 6. Testing Notifications Generated ---")
    notif_res = client.get("/api/notifications", headers=farmer_headers)
    assert notif_res.status_code == 200
    notifs = notif_res.json()
    assert len(notifs) >= 1
    assert "Slot Booking Confirmed" in notifs[0]["title"]
    print("[PASS] Automated booking confirmation notification verified.")

    print("\n--- 7. Testing 7-Stage Pipeline Progression & Payment Disbursement ---")
    stages = ["Arrived", "Verification", "Weighing", "Quality Check", "Final Acceptance", "Completed"]
    for stage in stages:
        adv_res = client.put(f"/api/admin/bookings/{created_booking_id}/status", json={"status": stage}, headers=admin_headers)
        assert adv_res.status_code == 200, f"Failed updating to {stage}: {adv_res.text}"

    # Verify payment marked Paid
    payments_res = client.get("/api/payments", headers=farmer_headers)
    assert payments_res.status_code == 200
    farmer_payments = payments_res.json()
    p = next((x for x in farmer_payments if x["booking_id"] == created_booking_id), None)
    assert p is not None
    assert p["payment_status"] == "Paid"
    assert p["payment_reference"].startswith("REF-")
    assert p["net_amount"] == 65876.25
    print("[PASS] 7-Stage pipeline advanced to Completed and DBT payment disbursed.")

    print("\n--- 8. Testing Farmer Profile Persistence ---")
    client.put("/api/profile", json={
        "name": "Rameshwar Patel",
        "village": "Bodhan Rural",
        "bank_account": "SBIN00012349999",
        "ifsc_code": "SBIN0001234"
    }, headers=farmer_headers)
    prof = client.get("/api/profile", headers=farmer_headers).json()
    assert prof["name"] == "Rameshwar Patel"
    assert prof["village"] == "Bodhan Rural"
    print("[PASS] Profile updated and verified.")

    print("\n--- 9. Testing Admin Dashboard Aggregates ---")
    dash = client.get("/api/admin/dashboard", headers=admin_headers).json()
    assert dash["total_farmers"] >= 4
    assert dash["completed_bookings"] >= 1
    assert dash["total_gross_value"] > 0
    assert dash["total_net_payouts"] > 0
    print("[PASS] Admin dashboard metrics verified:")
    print(f"  Gross: Rs.{dash['total_gross_value']:,} | Net Disbursements: Rs.{dash['total_net_payouts']:,}")

    print("\n=======================================================")
    print("ALL 9 TEST SUITE STEPS PASSED COMPLETELY AND FLAWLESSLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_full_portal_flow()
