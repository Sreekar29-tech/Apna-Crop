import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Crop } from '@/lib/types';

export async function GET() {
  try {
    const crops = await query<Crop>(
      `SELECT id, crop_name, category, price_per_quintal, is_active, updated_at
       FROM crop_prices
       WHERE is_active = 1
       ORDER BY crop_name ASC`
    );
    return NextResponse.json(crops);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Failed to fetch crop MSP prices' }, { status: 500 });
  }
}
