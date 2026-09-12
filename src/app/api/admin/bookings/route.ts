import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { sanitizeBooking } from '@/lib/masking';

export async function GET(req: NextRequest) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser || tokenUser.role !== 'admin') {
    return NextResponse.json({ detail: 'Forbidden. Admin privileges required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let sql = `
    SELECT 
      b.id, b.token_number, b.farmer_id, b.centre_id, b.crop_name, b.quantity_quintals,
      b.booking_date, b.time_slot, b.status, b.price_per_quintal_at_booking as price_per_quintal,
      b.gross_amount, b.mandi_fee as mandi_fee_amount, b.labor_charge as labor_charge_amount,
      b.transport_charge as transport_charge_amount, b.total_deductions, b.net_amount,
      b.created_at,
      p.payment_status, p.payment_reference as dbt_transaction_ref,
      q.queue_number, q.estimated_wait_minutes, q.current_stage,
      c.name as centre_name, c.district as centre_district,
      f.name as farmer_name, f.username as farmer_username, f.mobile as farmer_mobile,
      f.district as farmer_district, f.village as farmer_village
    FROM bookings b
    LEFT JOIN procurement_centres c ON b.centre_id = c.id
    LEFT JOIN farmers f ON b.farmer_id = f.id
    LEFT JOIN queues q ON b.id = q.booking_id
    LEFT JOIN payments p ON b.id = p.booking_id
  `;

  const args: any[] = [];
  if (status && status !== 'All') {
    sql += ' WHERE b.status = ?';
    args.push(status);
  }

  sql += ' ORDER BY b.created_at DESC';

  const bookings = await query<any>(sql, args);
  return NextResponse.json(bookings.map(sanitizeBooking));
}
