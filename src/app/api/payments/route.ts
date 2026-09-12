import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });
  }

  const sql = `
    SELECT 
      p.id, p.booking_id, p.farmer_id, p.gross_amount, p.deductions, p.net_amount,
      p.payment_status, p.payment_reference, p.paid_at, p.created_at,
      b.token_number, b.crop_name, b.quantity_quintals, b.status as booking_status,
      b.mandi_fee as mandi_fee_amount, b.labor_charge as labor_charge_amount, b.transport_charge as transport_charge_amount,
      f.name as farmer_name, f.mobile as farmer_mobile, f.bank_account, f.ifsc_code,
      c.name as centre_name
    FROM payments p
    LEFT JOIN bookings b ON p.booking_id = b.id
    LEFT JOIN farmers f ON p.farmer_id = f.id
    LEFT JOIN procurement_centres c ON b.centre_id = c.id
    ${tokenUser.role === 'admin' ? '' : 'WHERE p.farmer_id = ?'}
    ORDER BY p.created_at DESC
  `;

  const args = tokenUser.role === 'admin' ? [] : [tokenUser.sub];
  const payments = await query<any>(sql, args);

  return NextResponse.json(payments);
}
