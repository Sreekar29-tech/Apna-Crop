import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { DeductionConfig } from '@/lib/types';

export async function GET() {
  try {
    const config = await queryOne<DeductionConfig>(
      `SELECT id, mandi_fee_percent, labor_charge_per_quintal, transport_charge_per_quintal, updated_at
       FROM deduction_config
       WHERE is_active = 1
       LIMIT 1`
    );

    if (!config) {
      return NextResponse.json({ detail: 'Active deduction configuration not found in database. Please run database migrations or seed.' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Failed to fetch deduction config' }, { status: 500 });
  }
}
