import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { calculatePayout } from '@/lib/calculations';
import { sanitizeBooking } from '@/lib/masking';
import { Booking, Crop, DeductionConfig } from '@/lib/types';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });
  }

  const sql = `
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
      f.district as farmer_district, f.village as farmer_village, f.bank_account, f.ifsc_code
    FROM bookings b
    LEFT JOIN procurement_centres c ON b.centre_id = c.id
    LEFT JOIN farmers f ON b.farmer_id = f.id
    LEFT JOIN queues q ON b.id = q.booking_id
    LEFT JOIN payments p ON b.id = p.booking_id
    ${tokenUser.role === 'admin' ? '' : 'WHERE b.farmer_id = ?'}
    ORDER BY b.created_at DESC
  `;

  const args = tokenUser.role === 'admin' ? [] : [tokenUser.sub];
  const bookings = await query<any>(sql, args);

  return NextResponse.json(bookings.map(sanitizeBooking));
}

export async function POST(req: NextRequest) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { crop_id, centre_id, quantity_quintals, booking_date, time_slot, notes = '' } = body;

    const qty = Number(quantity_quintals);
    if (!crop_id || !centre_id || !booking_date || !time_slot || isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { detail: 'Crop, Centre, Booking Date, Time Slot, and a positive quantity in quintals are required.' },
        { status: 400 }
      );
    }

    // Look up crop
    const crop = await queryOne<Crop>(
      'SELECT id, crop_name, category, price_per_quintal FROM crop_prices WHERE (id = ? OR crop_name = ?) AND is_active = 1',
      [crop_id, crop_id]
    );

    if (!crop) {
      return NextResponse.json({ detail: 'Selected crop was not found in catalog.' }, { status: 404 });
    }

    // Look up centre
    const centre = await queryOne(
      'SELECT id, name, code, district, daily_capacity_quintals FROM procurement_centres WHERE id = ? AND is_active = 1',
      [centre_id]
    );

    if (!centre) {
      return NextResponse.json({ detail: 'Selected procurement mandi was not found.' }, { status: 404 });
    }

    // Look up current deduction configuration
    const dedConfig = await queryOne<DeductionConfig>(
      'SELECT mandi_fee_percent, labor_charge_per_quintal, transport_charge_per_quintal FROM deduction_config WHERE is_active = 1 LIMIT 1'
    );

    if (!dedConfig) {
      return NextResponse.json({ detail: 'Active deduction rates are not configured in the database.' }, { status: 500 });
    }

    const feePercent = dedConfig.mandi_fee_percent;
    const laborRate = dedConfig.labor_charge_per_quintal;
    const transportRate = dedConfig.transport_charge_per_quintal;

    // Calculate immutable financial breakdown
    const breakdown = calculatePayout(qty, crop.price_per_quintal, feePercent, laborRate, transportRate);

    // Generate unique token number
    const dateStr = booking_date.replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const tokenNumber = `TKN-${dateStr}-${randPart}`;

    // Calculate queue number for centre on date
    const qCount = await queryOne<{ cnt: number }>(
      'SELECT count(*) as cnt FROM bookings WHERE centre_id = ? AND booking_date = ?',
      [centre_id, booking_date]
    );
    const queueNumber = (qCount ? Number(qCount.cnt) : 0) + 1;
    const estWait = Math.min(180, Math.max(15, queueNumber * 12));

    const bookingId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 1. Insert booking
    await execute(
      `INSERT INTO bookings (
        id, token_number, farmer_id, centre_id, crop_name, quantity_quintals,
        booking_date, time_slot, status, price_per_quintal_at_booking,
        gross_amount, mandi_fee, labor_charge, transport_charge, total_deductions,
        net_amount, notes, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Booked', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        bookingId,
        tokenNumber,
        tokenUser.sub,
        centre_id,
        crop.crop_name,
        qty,
        booking_date,
        time_slot,
        crop.price_per_quintal,
        breakdown.gross_amount,
        breakdown.mandi_fee_amount,
        breakdown.labor_charge_amount,
        breakdown.transport_charge_amount,
        breakdown.total_deductions,
        breakdown.net_amount,
        notes,
        nowIso,
        nowIso
      ]
    );

    // 2. Insert queue
    const queueId = crypto.randomUUID();
    await execute(
      `INSERT INTO queues (id, booking_id, centre_id, queue_number, estimated_wait_minutes, current_stage, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'Booked', 1, ?, ?)`,
      [queueId, bookingId, centre_id, queueNumber, estWait, nowIso, nowIso]
    );

    // 3. Insert pending payment record
    const paymentId = crypto.randomUUID();
    await execute(
      `INSERT INTO payments (id, booking_id, farmer_id, gross_amount, deductions, net_amount, payment_status, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending', 1, ?, ?)`,
      [paymentId, bookingId, tokenUser.sub, breakdown.gross_amount, breakdown.total_deductions, breakdown.net_amount, nowIso, nowIso]
    );

    // 4. Create notification
    await execute(
      `INSERT INTO notifications (id, farmer_id, title, message, type, is_read, is_active, created_at)
       VALUES (?, ?, ?, ?, 'booking', 0, 1, ?)`,
      [
        crypto.randomUUID(),
        tokenUser.sub,
        `Slot Reserved: Token ${tokenNumber}`,
        `Your procurement slot for ${qty} quintals of ${crop.crop_name} on ${booking_date} (${time_slot}) at ${centre.name} is confirmed. Net payable: ₹${breakdown.net_amount.toLocaleString('en-IN')}.`,
        nowIso
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Procurement slot booked successfully! Token: ${tokenNumber}`,
      booking_id: bookingId,
      token_number: tokenNumber,
      queue_number: queueNumber,
      estimated_wait_minutes: estWait,
      financials: breakdown
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Failed to create booking.' }, { status: 500 });
  }
}
