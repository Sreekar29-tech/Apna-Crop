import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { sanitizeBooking } from '@/lib/masking';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = await params;

  const sql = `
    SELECT 
      b.id, b.token_number, b.farmer_id, b.centre_id, b.crop_name, b.quantity_quintals,
      b.booking_date, b.time_slot, b.status, b.price_per_quintal_at_booking as price_per_quintal,
      b.gross_amount, b.mandi_fee as mandi_fee_amount, b.labor_charge as labor_charge_amount,
      b.transport_charge as transport_charge_amount, b.total_deductions, b.net_amount,
      b.notes, b.created_at,
      p.payment_status, p.payment_reference as dbt_transaction_ref,
      q.queue_number, q.estimated_wait_minutes, q.current_stage,
      c.name as centre_name, c.district as centre_district, c.address as centre_address, c.contact_number as centre_contact,
      f.name as farmer_name, f.username as farmer_username, f.mobile as farmer_mobile,
      f.district as farmer_district, f.village as farmer_village, f.bank_account, f.ifsc_code
    FROM bookings b
    LEFT JOIN procurement_centres c ON b.centre_id = c.id
    LEFT JOIN farmers f ON b.farmer_id = f.id
    LEFT JOIN queues q ON b.id = q.booking_id
    LEFT JOIN payments p ON b.id = p.booking_id
    WHERE (b.id = ? OR b.token_number = ?)
    ${tokenUser.role === 'admin' ? '' : 'AND b.farmer_id = ?'}
    LIMIT 1
  `;

  const args = tokenUser.role === 'admin' ? [id, id] : [id, id, tokenUser.sub];
  const booking = await queryOne<any>(sql, args);

  if (!booking) {
    return NextResponse.json({ detail: 'Booking not found or unauthorized.' }, { status: 404 });
  }

  return NextResponse.json(sanitizeBooking(booking));
}
