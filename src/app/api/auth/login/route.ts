import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { comparePassword, createJwtToken } from '@/lib/auth';
import { sanitizeUser } from '@/lib/masking';
import { User } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ detail: 'Username and password are required.' }, { status: 400 });
    }

    const cleanInput = String(username).trim();

    // Query user by username or mobile
    const user = await queryOne<User>(
      'SELECT * FROM farmers WHERE (username = ? OR mobile = ?) AND is_active = 1',
      [cleanInput, cleanInput]
    );

    if (!user || !user.password_hash) {
      return NextResponse.json({ detail: 'Invalid credentials. User not found.' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ detail: 'Invalid credentials. Incorrect password.' }, { status: 401 });
    }

    const token = createJwtToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      district: user.district,
      village: user.village
    });

    const sanitized = sanitizeUser(user);

    return NextResponse.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      token_type: 'bearer',
      user: sanitized
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Login failed.' }, { status: 500 });
  }
}
