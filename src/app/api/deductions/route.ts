import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { DeductionConfig } from '@/lib/types';

export async function GET() {
  const config = await queryOne<DeductionConfig>(
    'SELECT id, mandi_fee_percent, labor_charge_per_quintal, transport_charge_per_quintal, updated_at FROM deduction_config WHERE is_active = 1 LIMIT 1'
  );

  if (!config) {
    return NextResponse.json({ detail: 'Active deduction configuration not found in database.' }, { status: 404 });
  }

  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser || tokenUser.role !== 'admin') {
    return NextResponse.json({ detail: 'Forbidden. Admin privileges required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { mandi_fee_percent, labor_charge_per_quintal, transport_charge_per_quintal } = body;

    const fee = Number(mandi_fee_percent);
    const labor = Number(labor_charge_per_quintal);
    const transport = Number(transport_charge_per_quintal);

    if (isNaN(fee) || fee < 0 || isNaN(labor) || labor < 0 || isNaN(transport) || transport < 0) {
      return NextResponse.json({ detail: 'Deduction values must be non-negative numbers.' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    await execute(
      `UPDATE deduction_config
       SET mandi_fee_percent = ?, labor_charge_per_quintal = ?, transport_charge_per_quintal = ?, updated_by = ?, updated_at = ?
       WHERE is_active = 1`,
      [fee, labor, transport, tokenUser.sub, nowIso]
    );

    const updated = await queryOne<DeductionConfig>(
      'SELECT id, mandi_fee_percent, labor_charge_per_quintal, transport_charge_per_quintal, updated_at FROM deduction_config WHERE is_active = 1 LIMIT 1'
    );

    return NextResponse.json({
      success: true,
      message: 'State deduction policy rates updated successfully.',
      config: updated
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Failed to update deductions.' }, { status: 500 });
  }
}
