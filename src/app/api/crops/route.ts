import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { Crop } from '@/lib/types';
import crypto from 'crypto';

export async function GET() {
  const crops = await query<Crop>(
    'SELECT id, crop_name, category, price_per_quintal, is_active, updated_at FROM crop_prices WHERE is_active = 1 ORDER BY crop_name ASC'
  );
  return NextResponse.json(crops);
}

export async function POST(req: NextRequest) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser || tokenUser.role !== 'admin') {
    return NextResponse.json({ detail: 'Forbidden. Admin privileges required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { crop_name, category = 'Cereal', price_per_quintal } = body;

    if (!crop_name || !price_per_quintal) {
      return NextResponse.json({ detail: 'Crop name and price per quintal are required.' }, { status: 400 });
    }

    const price = Number(price_per_quintal);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ detail: 'Price per quintal must be a positive number.' }, { status: 400 });
    }

    const cleanName = String(crop_name).trim();
    const existing = await queryOne('SELECT id FROM crop_prices WHERE LOWER(crop_name) = LOWER(?)', [cleanName]);
    if (existing) {
      return NextResponse.json({ detail: `Crop '${cleanName}' already exists in the catalog.` }, { status: 400 });
    }

    const cropId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    await execute(
      `INSERT INTO crop_prices (id, crop_name, category, price_per_quintal, is_active, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      [cropId, cleanName, category, price, tokenUser.sub, nowIso, nowIso]
    );

    const created = await queryOne<Crop>('SELECT * FROM crop_prices WHERE id = ?', [cropId]);
    return NextResponse.json({
      success: true,
      message: `Crop '${cleanName}' added successfully.`,
      crop: created
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Failed to add crop.' }, { status: 500 });
  }
}
