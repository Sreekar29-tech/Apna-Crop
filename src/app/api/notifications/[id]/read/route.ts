import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = await params;
  await execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND farmer_id = ?', [id, tokenUser.sub]);

  return NextResponse.json({ success: true });
}
