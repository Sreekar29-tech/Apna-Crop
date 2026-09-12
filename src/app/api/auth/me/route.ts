import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { sanitizeUser } from '@/lib/masking';
import { User } from '@/lib/types';

export async function GET(req: NextRequest) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) {
    return NextResponse.json({ detail: 'Unauthorized. Invalid or missing token.' }, { status: 401 });
  }

  const user = await queryOne<User>(
    'SELECT id, name, username, mobile, district, state, village, bank_account, ifsc_code, role, is_active, created_at FROM farmers WHERE id = ? AND is_active = 1',
    [tokenUser.sub]
  );

  if (!user) {
    return NextResponse.json({ detail: 'User not found or inactive.' }, { status: 404 });
  }

  return NextResponse.json({
    user: sanitizeUser(user)
  });
}
