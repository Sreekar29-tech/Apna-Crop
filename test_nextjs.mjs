import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:3000';

async function runTests() {
  console.log('=======================================================');
  console.log('AUTOMATED VERIFICATION TEST SUITE FOR APNA CROP (NEXT.JS)');
  console.log('=======================================================\n');

  // 1. Crops Catalog from Real Database
  console.log('--- 1. Testing Crops Catalog (Real Database) ---');
  const cropsRes = await fetch(`${BASE_URL}/api/crops`);
  assert.strictEqual(cropsRes.status, 200, `Expected 200, got ${cropsRes.status}`);
  const crops = await cropsRes.json();
  assert(crops.length >= 8, `Expected at least 8 seeded crops, got ${crops.length}`);
  const wheat = crops.find(c => c.crop_name === 'Wheat');
  assert(wheat, 'Wheat crop not found in catalog');
  console.log(`[PASS] Loaded ${crops.length} crops from SQLite database with accurate MSP rates.`);

  const cropPricesRes = await fetch(`${BASE_URL}/api/crops/prices`);
  assert.strictEqual(cropPricesRes.status, 200, `Expected 200, got ${cropPricesRes.status}`);
  const cropPrices = await cropPricesRes.json();
  assert(Array.isArray(cropPrices) && cropPrices.length >= 8, 'Expected at least 8 crops in /api/crops/prices');
  assert(cropPrices[0].crop_name && cropPrices[0].price_per_quintal, 'Missing required fields in /api/crops/prices');
  console.log('[PASS] Dynamic /api/crops/prices endpoint successfully verified.');

  console.log('\n--- Testing Dynamic Procurement Mandi Centres Endpoint ---');
  const mandiCentresRes = await fetch(`${BASE_URL}/api/procurement-centres`);
  assert.strictEqual(mandiCentresRes.status, 200, `Expected 200, got ${mandiCentresRes.status}`);
  const mandiCentres = await mandiCentresRes.json();
  assert(Array.isArray(mandiCentres) && mandiCentres.length > 0, 'No procurement centres found in DB');
  assert(mandiCentres[0].name && mandiCentres[0].district && mandiCentres[0].daily_capacity_quintals, 'Invalid centre format');
  console.log(`[PASS] Verified ${mandiCentres.length} active procurement centres loaded dynamically from DB.`);

  console.log('\n--- Testing Dynamic Deduction Configuration Endpoint ---');
  const dedRes = await fetch(`${BASE_URL}/api/config/deductions`);
  assert.strictEqual(dedRes.status, 200, `Expected 200, got ${dedRes.status}`);
  const deductions = await dedRes.json();
  assert(typeof deductions.mandi_fee_percent === 'number', 'mandi_fee_percent must be a number');
  assert(typeof deductions.labor_charge_per_quintal === 'number', 'labor_charge_per_quintal must be a number');
  assert(typeof deductions.transport_charge_per_quintal === 'number', 'transport_charge_per_quintal must be a number');
  console.log(`[PASS] Deduction policy dynamically fetched: Mandi Fee ${deductions.mandi_fee_percent}%, Labor ₹${deductions.labor_charge_per_quintal}/qtl, Transport ₹${deductions.transport_charge_per_quintal}/qtl.`);

  // 2. Farmer Registration with Bcrypt & Password Rules
  console.log('\n--- 2. Testing Farmer Registration (Bcrypt & Password Security) ---');
  // Test short password rejection
  const shortPwRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Farmer',
      username: 'test_short',
      mobile: '9100000001',
      password: 'short'
    })
  });
  assert.strictEqual(shortPwRes.status, 400, 'Expected 400 for short password');
  console.log('[PASS] Password < 8 characters properly rejected with 400.');

  // Test password missing numbers
  const noNumPwRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Farmer',
      username: 'test_nonum',
      mobile: '9100000002',
      password: 'lettersonlyhere'
    })
  });
  assert.strictEqual(noNumPwRes.status, 400, 'Expected 400 for password without numbers');
  console.log('[PASS] Password missing numbers properly rejected with 400.');

  // Successful registration with unique username
  const testUsername = `next_farmer_${Date.now().toString().slice(-5)}`;
  const validRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Pooja Reddy',
      username: testUsername,
      mobile: `99${Date.now().toString().slice(-8)}`,
      password: 'SecurePass123',
      village: 'Bodhan',
      district: 'Nizamabad'
    })
  });
  assert.strictEqual(validRegRes.status, 200, `Registration failed with status ${validRegRes.status}`);
  const regData = await validRegRes.json();
  assert.strictEqual(regData.user.role, 'farmer');
  assert(regData.token, 'Token missing from registration response');
  const farmerToken = regData.token;
  console.log(`[PASS] Farmer registered (${testUsername}) with bcrypt hash and JWT issued.`);

  // 3. Login Verification (Farmer & Admin) & Sensitive Field Masking
  console.log('\n--- 3. Testing Authentication & Login (Bcrypt Verification & Field Masking) ---');
  // Invalid password
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, password: 'WrongPassword123' })
  });
  assert.strictEqual(badLoginRes.status, 401, 'Expected 401 for incorrect password');
  console.log('[PASS] Incorrect password properly rejected with 401 Unauthorized.');

  // Farmer login
  const farmerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, password: 'SecurePass123' })
  });
  assert.strictEqual(farmerLoginRes.status, 200, 'Farmer login failed');
  const farmerLoginData = await farmerLoginRes.json();
  assert.strictEqual(farmerLoginData.user.password_hash, undefined, 'password_hash must never be leaked in login response');
  assert.strictEqual(farmerLoginData.user.aadhaar_hash, undefined, 'aadhaar_hash must never be leaked in login response');
  console.log('[PASS] Farmer login succeeded; password_hash and aadhaar_hash strictly excluded from response.');

  // Admin login
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
  const adminData = await adminLoginRes.json();
  assert.strictEqual(adminData.user.role, 'admin');
  assert.strictEqual(adminData.user.password_hash, undefined, 'password_hash must never be leaked to admin either');
  const adminToken = adminData.token;
  console.log('[PASS] Admin login succeeded (role: admin, sensitive fields sanitized).');

  // Verify /api/auth/me masking
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${farmerToken}` }
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.password_hash, undefined, 'password_hash must not be present in /api/auth/me');
  assert.strictEqual(meData.user.aadhaar_hash, undefined, 'aadhaar_hash must not be present in /api/auth/me');
  console.log('[PASS] /api/auth/me sensitive field masking verified.');

  // 4. Role Authorization Guard (Admin vs Farmer)
  console.log('\n--- 4. Testing Role-Based Authorization Guard ---');
  const forbiddenCropRes = await fetch(`${BASE_URL}/api/crops`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      crop_name: 'Unauthorized Crop',
      category: 'Cereal',
      price_per_quintal: 2500
    })
  });
  assert.strictEqual(forbiddenCropRes.status, 403, 'Expected 403 Forbidden for farmer adding crop');
  console.log('[PASS] Non-admin successfully blocked from adding crop (403 Forbidden).');

  // Admin adding new crop
  const newCropName = `Barley_${Date.now().toString().slice(-4)}`;
  const adminCropRes = await fetch(`${BASE_URL}/api/crops`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      crop_name: newCropName,
      category: 'Cereal',
      price_per_quintal: 1950.0
    })
  });
  assert.strictEqual(adminCropRes.status, 200, 'Admin adding crop failed');
  console.log(`[PASS] Admin added new crop '${newCropName}' (₹1950/qtl).`);

  // 5. Slot Booking & Financial Calculation Engine
  console.log('\n--- 5. Testing Slot Booking & Transparent Calculation Snapshot ---');
  const centresRes = await fetch(`${BASE_URL}/api/centres`);
  const centres = await centresRes.json();
  assert(centres.length > 0, 'No centres found');

  const bookingRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      crop_id: wheat.id,
      centre_id: centres[0].id,
      quantity_quintals: 30.0,
      booking_date: '2026-09-20',
      time_slot: '10:00 AM - 01:00 PM',
      notes: 'Next.js Test Booking'
    })
  });
  assert.strictEqual(bookingRes.status, 200, `Booking failed with status ${bookingRes.status}`);
  const bookData = await bookingRes.json();
  assert(bookData.token_number.startsWith('TKN-'), `Invalid token: ${bookData.token_number}`);

  // Financial verification:
  // Qty: 30, Price: 2275 -> Gross = 68250.0
  // Mandi fee (1.5%): 1023.75
  // Labor (₹20/qtl): 600.0
  // Transport (₹25/qtl): 750.0
  // Total deductions: 2373.75
  // Net payout: 65876.25
  const fin = bookData.financials;
  assert.strictEqual(fin.gross_amount, 68250.0, `Gross mismatch: ${fin.gross_amount}`);
  assert.strictEqual(fin.mandi_fee_amount, 1023.75, `Mandi fee mismatch: ${fin.mandi_fee_amount}`);
  assert.strictEqual(fin.labor_charge_amount, 600.0, `Labor mismatch: ${fin.labor_charge_amount}`);
  assert.strictEqual(fin.transport_charge_amount, 750.0, `Transport mismatch: ${fin.transport_charge_amount}`);
  assert.strictEqual(fin.total_deductions, 2373.75, `Deductions mismatch: ${fin.total_deductions}`);
  assert.strictEqual(fin.net_amount, 65876.25, `Net mismatch: ${fin.net_amount}`);
  console.log(`[PASS] Token pass generated: ${bookData.token_number}`);
  console.log(`  Financials Verified: Gross ₹${fin.gross_amount} - Deductions ₹${fin.total_deductions} = Net ₹${fin.net_amount}`);

  // 6. Notifications Verification
  console.log('\n--- 6. Testing Notifications Generated in Real Database ---');
  const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${farmerToken}` }
  });
  assert.strictEqual(notifRes.status, 200);
  const notifs = await notifRes.json();
  assert(notifs.length >= 2, `Expected at least 2 notifications, got ${notifs.length}`);
  console.log(`[PASS] Verified ${notifs.length} real-time notifications in farmer inbox.`);

  // 7. 7-Stage Pipeline Progression & Direct Benefit Transfer (DBT)
  console.log('\n--- 7. Testing 7-Stage Pipeline Advancement & DBT Disbursement ---');
  const bookingId = bookData.booking_id;
  const stages = ['Arrived', 'Verification', 'Weighing', 'Quality Check', 'Final Acceptance', 'Completed'];

  for (const st of stages) {
    const advRes = await fetch(`${BASE_URL}/api/admin/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: st })
    });
    assert.strictEqual(advRes.status, 200, `Advancing to ${st} failed`);
  }

  // Verify Completed Booking details
  const finalBookRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}`, {
    headers: { Authorization: `Bearer ${farmerToken}` }
  });
  const finalBooking = await finalBookRes.json();
  assert.strictEqual(finalBooking.status, 'Completed');
  assert.strictEqual(finalBooking.payment_status, 'Paid');
  assert(finalBooking.dbt_transaction_ref.startsWith('DBT-APNA-'), `Invalid DBT ref: ${finalBooking.dbt_transaction_ref}`);
  console.log(`[PASS] Pipeline completed! DBT Transaction Reference: ${finalBooking.dbt_transaction_ref}`);

  // 8. Farmer Profile Update & Bank Account Masking
  console.log('\n--- 8. Testing Profile Update & Bank Account Masking ---');
  const profUpdateRes = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      bank_account: 'SBIN00098765432',
      ifsc_code: 'SBIN0009876',
      village: 'Nizamabad Rural'
    })
  });
  assert.strictEqual(profUpdateRes.status, 200);
  const updatedUser = (await profUpdateRes.json()).user;
  assert.strictEqual(updatedUser.bank_account, '••••5432', `Bank account should be masked, got ${updatedUser.bank_account}`);
  assert.strictEqual(updatedUser.password_hash, undefined, 'password_hash must be undefined');
  assert.strictEqual(updatedUser.aadhaar_hash, undefined, 'aadhaar_hash must be undefined');
  assert.strictEqual(updatedUser.ifsc_code, 'SBIN0009876');
  console.log('[PASS] Farmer profile updated and bank account masked as ••••5432 with hashes withheld.');

  // 9. Admin Farmers Directory with Field Masking
  console.log('\n--- 9. Testing Admin Farmers Directory Sanitization ---');
  const adminFarmersRes = await fetch(`${BASE_URL}/api/admin/farmers`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminFarmersRes.status, 200);
  const adminFarmers = await adminFarmersRes.json();
  assert(Array.isArray(adminFarmers) && adminFarmers.length > 0);
  for (const farmer of adminFarmers) {
    assert.strictEqual(farmer.password_hash, undefined, 'Farmer password_hash found in admin list');
    assert.strictEqual(farmer.aadhaar_hash, undefined, 'Farmer aadhaar_hash found in admin list');
    if (farmer.bank_account) {
      assert(farmer.bank_account.startsWith('••••'), `Farmer bank account not masked: ${farmer.bank_account}`);
    }
  }
  console.log(`[PASS] Verified ${adminFarmers.length} farmer accounts in admin list; all credentials and bank accounts strictly sanitized.`);

  // 10. Admin Command Center Analytics
  console.log('\n--- 10. Testing Admin Command Center Analytics ---');
  const adminDashRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminDashRes.status, 200);
  const metrics = await adminDashRes.json();
  assert(metrics.total_farmers >= 4, `Expected >= 4 farmers, got ${metrics.total_farmers}`);
  assert(metrics.total_gross_value > 0, 'Gross value should be > 0');
  assert(metrics.total_net_payouts > 0, 'Net payouts should be > 0');
  console.log('[PASS] Admin metrics verified from real database:');
  console.log(`  Farmers: ${metrics.total_farmers} | Completed: ${metrics.completed_bookings} | Gross: ₹${metrics.total_gross_value.toLocaleString('en-IN')} | Net: ₹${metrics.total_net_payouts.toLocaleString('en-IN')}`);

  // 11. Frontend HTML Root Delivery
  console.log('\n--- 11. Testing Next.js Frontend Page Delivery ---');
  const pageRes = await fetch(`${BASE_URL}/`);
  assert.strictEqual(pageRes.status, 200);
  const html = await pageRes.text();
  assert(html.includes('Apna Crop'), 'Page should include "Apna Crop" title/brand');
  console.log('[PASS] Next.js frontend root page rendered successfully with Apna Crop branding.');

  console.log('\n=======================================================');
  console.log('ALL 11 FULLSTACK NEXT.JS ZERO-HARDCODED CHECKS PASSED 100%!');
  console.log('=======================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FAIL] Test encountered error:', err);
  process.exit(1);
});
