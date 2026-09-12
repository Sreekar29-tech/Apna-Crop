import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { MandiCentre } from '@/lib/types';

export async function GET() {
  try {
    const centres = await query<MandiCentre>(
      `SELECT id, name, code, district, state, daily_capacity_quintals, operating_status, contact_number, address
       FROM procurement_centres
       WHERE is_active = 1
       ORDER BY name ASC`
    );
    return NextResponse.json(centres);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Failed to fetch procurement centres' }, { status: 500 });
  }
}
