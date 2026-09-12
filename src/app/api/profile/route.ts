import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { sanitizeUser } from '@/lib/masking';
import { User } from '@/lib/types';

export async function GET(req: NextRequest) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });
  }

  const user = await queryOne<User>(
    'SELECT id, name, username, mobile, district, state, village, bank_account, ifsc_code, role FROM farmers WHERE id = ?',
    [tokenUser.sub]
  );

  if (!user) {
    return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json(sanitizeUser(user));
}

export async function PUT(req: NextRequest) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, village, district, state, bank_account, ifsc_code } = body;

    const nowIso = new Date().toISOString();
    await execute(
      `UPDATE farmers
       SET name = COALESCE(?, name),
           village = COALESCE(?, village),
           district = COALESCE(?, district),
           state = COALESCE(?, state),
           bank_account = COALESCE(?, bank_account),
           ifsc_code = COALESCE(?, ifsc_code),
           updated_at = ?
       WHERE id = ?`,
      [
        name ?? null,
        village ?? null,
        district ?? null,
        state ?? null,
        bank_account ?? null,
        ifsc_code ?? null,
        nowIso,
        tokenUser.sub
      ]
    );

    const updated = await queryOne<User>(
      'SELECT id, name, username, mobile, district, state, village, bank_account, ifsc_code, role FROM farmers WHERE id = ?',
      [tokenUser.sub]
    );

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: sanitizeUser(updated)
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Failed to update profile.' }, { status: 500 });
  }
}
