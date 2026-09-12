import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = await params;

  const booking = await queryOne<{ id: string; farmer_id: string; status: string; token_number: string }>(
    'SELECT id, farmer_id, status, token_number FROM bookings WHERE id = ? OR token_number = ?',
    [id, id]
  );

  if (!booking) {
    return NextResponse.json({ detail: 'Booking not found.' }, { status: 404 });
  }

  if (tokenUser.role !== 'admin' && booking.farmer_id !== tokenUser.sub) {
    return NextResponse.json({ detail: 'Forbidden. You can only cancel your own bookings.' }, { status: 403 });
  }

  if (booking.status === 'Completed' || booking.status === 'Final Acceptance') {
    return NextResponse.json({ detail: 'Cannot cancel a booking that has reached final acceptance or completion.' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  await execute('UPDATE bookings SET status = "Cancelled", updated_at = ? WHERE id = ?', [nowIso, booking.id]);
  await execute('UPDATE queues SET current_stage = "Cancelled", updated_at = ? WHERE booking_id = ?', [nowIso, booking.id]);

  await execute(
    `INSERT INTO notifications (id, farmer_id, title, message, type, is_read, is_active, created_at)
     VALUES (?, ?, ?, ?, 'warning', 0, 1, ?)`,
    [
      crypto.randomUUID(),
      booking.farmer_id,
      `Booking Cancelled: ${booking.token_number}`,
      `Your procurement appointment ${booking.token_number} has been cancelled.`,
      nowIso
    ]
  );

  return NextResponse.json({
    success: true,
    message: `Booking ${booking.token_number} has been successfully cancelled.`
  });
}
