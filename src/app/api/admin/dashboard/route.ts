import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { AdminDashboardMetrics } from '@/lib/types';

export async function GET(req: NextRequest) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser || tokenUser.role !== 'admin') {
    return NextResponse.json({ detail: 'Forbidden. Admin privileges required.' }, { status: 403 });
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const totalFarmers = await queryOne<{ cnt: number }>("SELECT count(*) as cnt FROM farmers WHERE role = 'farmer' AND is_active = 1", []);
    const todayBookings = await queryOne<{ cnt: number }>('SELECT count(*) as cnt FROM bookings WHERE booking_date = ?', [todayStr]);
    const activeQueue = await queryOne<{ cnt: number }>(
      "SELECT count(*) as cnt FROM bookings WHERE status NOT IN ('Completed', 'Cancelled')", []
    );
    const completed = await queryOne<{ cnt: number }>("SELECT count(*) as cnt FROM bookings WHERE status = 'Completed'", []);

    const aggregates = await queryOne<{ total_qty: number; gross: number; net: number }>(`
      SELECT 
        COALESCE(SUM(quantity_quintals), 0) as total_qty,
        COALESCE(SUM(gross_amount), 0) as gross,
        COALESCE(SUM(net_amount), 0) as net
      FROM bookings
      WHERE status != 'Cancelled'
    `, []);

    const metrics: AdminDashboardMetrics = {
      total_farmers: totalFarmers ? Number(totalFarmers.cnt) : 0,
      today_bookings: todayBookings ? Number(todayBookings.cnt) : 0,
      queue_active_count: activeQueue ? Number(activeQueue.cnt) : 0,
      total_quintals: aggregates ? Math.round(Number(aggregates.total_qty) * 10) / 10 : 0,
      total_gross_value: aggregates ? Math.round(Number(aggregates.gross)) : 0,
      total_net_payouts: aggregates ? Math.round(Number(aggregates.net)) : 0,
      completed_bookings: completed ? Number(completed.cnt) : 0
    };

    return NextResponse.json(metrics);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Failed to fetch dashboard metrics' }, { status: 500 });
  }
}
