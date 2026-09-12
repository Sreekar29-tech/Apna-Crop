import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { sanitizeFarmersList } from '@/lib/masking';

export async function GET(req: NextRequest) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser || tokenUser.role !== 'admin') {
    return NextResponse.json({ detail: 'Forbidden. Admin privileges required.' }, { status: 403 });
  }

  const sql = `
    SELECT 
      f.id, f.name, f.username, f.mobile, f.district, f.state, f.village,
      f.bank_account, f.ifsc_code, f.created_at,
      COUNT(b.id) as total_bookings,
      COALESCE(SUM(b.net_amount), 0) as total_payouts
    FROM farmers f
    LEFT JOIN bookings b ON f.id = b.farmer_id
    WHERE f.role = 'farmer' AND f.is_active = 1
    GROUP BY f.id
    ORDER BY f.created_at DESC
  `;

  const farmers = await query<any>(sql);
  return NextResponse.json(sanitizeFarmersList(farmers));
}
