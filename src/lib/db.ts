import { createClient, Client } from '@libsql/client';
import path from 'path';

let client: Client | null = null;
let initialized = false;

export function getDb(): Client {
  if (!client) {
    const dbUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'procurement.db')}`;
    client = createClient({
      url: dbUrl
    });
  }
  return client;
}

export async function query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const db = await initDatabase();
  const res = await db.execute({ sql, args });
  return res.rows as unknown as T[];
}

export async function queryOne<T = any>(sql: string, args: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, args: any[] = []) {
  const db = await initDatabase();
  return db.execute({ sql, args });
}

export async function initDatabase(): Promise<Client> {
  const db = getDb();
  if (initialized) return db;

  // 1. Farmers table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS farmers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      aadhaar_hash TEXT,
      district TEXT NOT NULL DEFAULT 'Nizamabad',
      state TEXT NOT NULL DEFAULT 'Telangana',
      village TEXT DEFAULT 'Bodhan',
      bank_account TEXT,
      ifsc_code TEXT,
      role TEXT NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 2. Procurement Centres table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS procurement_centres (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      district TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'Telangana',
      daily_capacity_quintals REAL NOT NULL DEFAULT 500.0,
      operating_status TEXT NOT NULL DEFAULT 'active' CHECK (operating_status IN ('active', 'inactive', 'maintenance')),
      contact_number TEXT,
      address TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 3. Crop Prices table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS crop_prices (
      id TEXT PRIMARY KEY,
      crop_name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL DEFAULT 'Cereal',
      price_per_quintal REAL NOT NULL CHECK (price_per_quintal > 0),
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (updated_by) REFERENCES farmers (id)
    )
  `);

  // 4. Deduction Config table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS deduction_config (
      id TEXT PRIMARY KEY,
      mandi_fee_percent REAL NOT NULL DEFAULT 1.5,
      labor_charge_per_quintal REAL NOT NULL DEFAULT 20.0,
      transport_charge_per_quintal REAL NOT NULL DEFAULT 25.0,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (updated_by) REFERENCES farmers (id)
    )
  `);

  // 5. Bookings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      token_number TEXT UNIQUE NOT NULL,
      farmer_id TEXT NOT NULL,
      centre_id TEXT NOT NULL,
      crop_name TEXT NOT NULL,
      quantity_quintals REAL NOT NULL CHECK (quantity_quintals > 0),
      booking_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Booked' CHECK (
        status IN ('Booked', 'Arrived', 'Verification', 'Weighing', 'Quality Check', 'Final Acceptance', 'Completed', 'Cancelled')
      ),
      price_per_quintal_at_booking REAL NOT NULL,
      gross_amount REAL NOT NULL,
      mandi_fee REAL NOT NULL DEFAULT 0.0,
      labor_charge REAL NOT NULL DEFAULT 0.0,
      transport_charge REAL NOT NULL DEFAULT 0.0,
      total_deductions REAL NOT NULL DEFAULT 0.0,
      net_amount REAL NOT NULL,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (farmer_id) REFERENCES farmers (id),
      FOREIGN KEY (centre_id) REFERENCES procurement_centres (id)
    )
  `);

  // 6. Queues table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS queues (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      centre_id TEXT NOT NULL,
      queue_number INTEGER NOT NULL,
      estimated_wait_minutes INTEGER NOT NULL DEFAULT 30,
      current_stage TEXT NOT NULL DEFAULT 'Booked',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings (id),
      FOREIGN KEY (centre_id) REFERENCES procurement_centres (id)
    )
  `);

  // 7. Payments table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      farmer_id TEXT NOT NULL,
      gross_amount REAL NOT NULL,
      deductions REAL NOT NULL,
      net_amount REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Processing', 'Paid', 'Failed')),
      payment_reference TEXT,
      paid_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings (id),
      FOREIGN KEY (farmer_id) REFERENCES farmers (id)
    )
  `);

  // 8. Notifications table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      farmer_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (farmer_id) REFERENCES farmers (id)
    )
  `);

  initialized = true;
  return db;
}
