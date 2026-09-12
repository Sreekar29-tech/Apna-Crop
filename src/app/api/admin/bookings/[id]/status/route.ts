import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import crypto from 'crypto';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser || tokenUser.role !== 'admin') {
    return NextResponse.json({ detail: 'Forbidden. Admin privileges required.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ detail: 'New status is required.' }, { status: 400 });
    }

    const booking = await queryOne<any>(
      'SELECT id, token_number, farmer_id, crop_name, quantity_quintals, net_amount, status FROM bookings WHERE id = ?',
      [id]
    );

    if (!booking) {
      return NextResponse.json({ detail: 'Booking not found.' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    // Update booking status
    await execute('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?', [status, nowIso, id]);

    // Update queue current_stage
    await execute('UPDATE queues SET current_stage = ?, updated_at = ? WHERE booking_id = ?', [status, nowIso, id]);

    // If completed, trigger DBT payment
    let dbtRef = null;
    if (status === 'Completed') {
      const datePart = nowIso.slice(0, 10).replace(/-/g, '');
      const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
      dbtRef = `DBT-APNA-${datePart}-${hex}`;

      await execute(
        `UPDATE payments
         SET payment_status = 'Paid', payment_reference = ?, paid_at = ?, updated_at = ?
         WHERE booking_id = ?`,
        [dbtRef, nowIso, nowIso, id]
      );

      // Notification for completed & DBT payment
      await execute(
        `INSERT INTO notifications (id, farmer_id, title, message, type, is_read, is_active, created_at)
         VALUES (?, ?, ?, ?, 'success', 0, 1, ?)`,
        [
          crypto.randomUUID(),
          booking.farmer_id,
          `Procurement Completed & DBT Payout: ₹${booking.net_amount.toLocaleString('en-IN')}`,
          `Your ${booking.quantity_quintals} quintals of ${booking.crop_name} (Token ${booking.token_number}) has been accepted. Net payout of ₹${booking.net_amount.toLocaleString('en-IN')} has been disbursed via DBT (Ref: ${dbtRef}).`,
          nowIso
        ]
      );
    } else {
      // Notification for stage advance
      await execute(
        `INSERT INTO notifications (id, farmer_id, title, message, type, is_read, is_active, created_at)
         VALUES (?, ?, ?, ?, 'info', 0, 1, ?)`,
        [
          crypto.randomUUID(),
          booking.farmer_id,
          `Stage Updated: ${status}`,
          `Your procurement slot ${booking.token_number} has advanced to the '${status}' stage at the mandi yard.`,
          nowIso
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${booking.token_number} stage updated to '${status}'.`,
      status,
      dbt_transaction_ref: dbtRef
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Failed to update booking status.' }, { status: 500 });
  }
}
