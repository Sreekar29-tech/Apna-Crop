import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { NotificationItem } from '@/lib/types';

export async function GET(req: NextRequest) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });
  }

  const notifs = await query<NotificationItem>(
    `SELECT id, farmer_id, title, message, type, is_read, created_at
     FROM notifications
     WHERE farmer_id = ? AND is_active = 1
     ORDER BY created_at DESC
     LIMIT 50`,
    [tokenUser.sub]
  );

  return NextResponse.json(notifs);
}
