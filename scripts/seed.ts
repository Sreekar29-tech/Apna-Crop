import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Load environment variables strictly from .env.local or .env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { getDb, initDatabase } from '../src/lib/db';

async function seed() {
  console.log('🌱 Starting secure server-side database seeding...');
  const db = await initDatabase();
  const nowIso = new Date().toISOString();

  // 1. Seed Initial Administrator Account (Strictly from Environment Variables)
  const adminUsername = process.env.ADMIN_INITIAL_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';
  const adminMobile = process.env.ADMIN_INITIAL_MOBILE || '9999999999';
  const adminName = process.env.ADMIN_INITIAL_NAME || 'District Procurement Admin';
  const adminDistrict = process.env.ADMIN_INITIAL_DISTRICT || 'Nizamabad';
  const adminState = process.env.ADMIN_INITIAL_STATE || 'Telangana';
  const adminVillage = process.env.ADMIN_INITIAL_VILLAGE || 'Collectorate HQ';

  if (!adminPassword) {
    throw new Error('FATAL: ADMIN_INITIAL_PASSWORD environment variable is not configured in .env');
  }

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const existingAdmin = await db.execute({
    sql: 'SELECT id FROM farmers WHERE username = ? OR mobile = ?',
    args: [adminUsername, adminMobile]
  });

  if (existingAdmin.rows.length === 0) {
    const adminId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO farmers (id, name, username, mobile, role, password_hash, district, state, village, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'admin', ?, ?, ?, ?, 1, ?, ?)`,
      args: [adminId, adminName, adminUsername, adminMobile, adminHash, adminDistrict, adminState, adminVillage, nowIso, nowIso]
    });
    console.log(`✅ Seeded System Administrator account ('${adminUsername}') with dynamic bcrypt hash.`);
  } else {
    await db.execute({
      sql: 'UPDATE farmers SET password_hash = ?, updated_at = ? WHERE id = ?',
      args: [adminHash, nowIso, existingAdmin.rows[0].id]
    });
    console.log(`ℹ️ Administrator '${adminUsername}' already exists; updated credentials.`);
  }

  // 2. Seed Baseline State Deduction Parameters if empty
  const dedCount = await db.execute({ sql: 'SELECT count(*) as cnt FROM deduction_config', args: [] });
  if (Number(dedCount.rows[0].cnt) === 0) {
    const fee = Number(process.env.DEFAULT_MANDI_FEE_PERCENT || 1.5);
    const labor = Number(process.env.DEFAULT_LABOR_CHARGE_PER_QUINTAL || 20.0);
    const transport = Number(process.env.DEFAULT_TRANSPORT_CHARGE_PER_QUINTAL || 25.0);

    await db.execute({
      sql: `INSERT INTO deduction_config (id, mandi_fee_percent, labor_charge_per_quintal, transport_charge_per_quintal, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)`,
      args: [crypto.randomUUID(), fee, labor, transport, nowIso, nowIso]
    });
    console.log(`✅ Seeded baseline deduction policy (${fee}% fee, ₹${labor}/qtl labor, ₹${transport}/qtl freight).`);
  } else {
    console.log('ℹ️ Deduction configuration already present in database.');
  }

  // 3. Seed Official MSP Crops if empty
  const cropCount = await db.execute({ sql: 'SELECT count(*) as cnt FROM crop_prices', args: [] });
  if (Number(cropCount.rows[0].cnt) === 0) {
    const officialBaselineCrops = [
      ['Wheat', 'Cereal', 2275.0],
      ['Paddy (Common)', 'Cereal', 2183.0],
      ['Paddy (Grade A)', 'Cereal', 2203.0],
      ['Maize', 'Coarse Cereals', 2090.0],
      ['Cotton (Medium Staple)', 'Commercial', 6620.0],
      ['Soybean (Yellow)', 'Oilseeds', 4600.0],
      ['Mustard', 'Oilseeds', 5650.0],
      ['Groundnut', 'Oilseeds', 6377.0]
    ];

    for (const [name, category, price] of officialBaselineCrops) {
      await db.execute({
        sql: `INSERT INTO crop_prices (id, crop_name, category, price_per_quintal, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, 1, ?, ?)`,
        args: [crypto.randomUUID(), name, category, price, nowIso, nowIso]
      });
    }
    console.log(`✅ Seeded ${officialBaselineCrops.length} official MSP crops.`);
  } else {
    console.log(`ℹ️ Crops catalog already populated (${cropCount.rows[0].cnt} crops present).`);
  }

  // 4. Seed Active APMC Mandi Centres if empty
  const centreCount = await db.execute({ sql: 'SELECT count(*) as cnt FROM procurement_centres', args: [] });
  if (Number(centreCount.rows[0].cnt) === 0) {
    const defaultCentres = [
      ['Nizamabad Main APMC Mandi', 'NZB-01', 'Nizamabad', 'Telangana', 800.0, '08462-220111', 'Market Yard, Nizamabad'],
      ['Bodhan Agricultural Market Yard', 'BDN-02', 'Nizamabad', 'Telangana', 500.0, '08467-222333', 'Station Road, Bodhan'],
      ['Warangal Grain Market Yard', 'WGL-01', 'Warangal', 'Telangana', 1200.0, '0870-2445566', 'Enumamula Market Yard, Warangal'],
      ['Karimnagar Agriculture Mandi', 'KRM-01', 'Karimnagar', 'Telangana', 650.0, '0878-2233445', 'Collectorate Bypass, Karimnagar']
    ];

    for (const [name, code, district, state, cap, phone, address] of defaultCentres) {
      await db.execute({
        sql: `INSERT INTO procurement_centres (id, name, code, district, state, daily_capacity_quintals, operating_status, contact_number, address, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, 1, ?, ?)`,
        args: [crypto.randomUUID(), name, code, district, state, cap, phone, address, nowIso, nowIso]
      });
    }
    console.log(`✅ Seeded ${defaultCentres.length} APMC procurement centres.`);
  } else {
    console.log(`ℹ️ APMC centres already populated (${centreCount.rows[0].cnt} centres present).`);
  }

  console.log('🎉 Database seeding completed successfully with zero hardcoded code secrets.\n');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
