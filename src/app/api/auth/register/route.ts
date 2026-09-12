import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { hashPassword, validatePasswordRules, createJwtToken } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, username, mobile, password, village = 'Bodhan', district = 'Nizamabad', state = 'Telangana' } = body;

    if (!name || !username || !mobile || !password) {
      return NextResponse.json({ detail: 'Name, username, mobile, and password are required.' }, { status: 400 });
    }

    const cleanUsername = String(username).trim();
    const cleanMobile = String(mobile).trim();

    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      return NextResponse.json({ detail: 'Username must be between 3 and 50 characters.' }, { status: 400 });
    }

    const pwValidation = validatePasswordRules(password);
    if (!pwValidation.valid) {
      return NextResponse.json({ detail: pwValidation.error }, { status: 400 });
    }

    // Check existing username
    const existingUser = await queryOne('SELECT id FROM farmers WHERE username = ?', [cleanUsername]);
    if (existingUser) {
      return NextResponse.json({ detail: `Username '${cleanUsername}' is already taken. Please choose another.` }, { status: 400 });
    }

    // Check existing mobile
    const existingMobile = await queryOne('SELECT id FROM farmers WHERE mobile = ?', [cleanMobile]);
    if (existingMobile) {
      return NextResponse.json({ detail: `Mobile number '${cleanMobile}' is already registered.` }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    await execute(
      `INSERT INTO farmers (id, name, username, mobile, role, password_hash, district, state, village, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'farmer', ?, ?, ?, ?, 1, ?, ?)`,
      [userId, name.trim(), cleanUsername, cleanMobile, passwordHash, district, state, village, nowIso, nowIso]
    );

    // Create welcome notification
    await execute(
      `INSERT INTO notifications (id, farmer_id, title, message, type, is_read, is_active, created_at)
       VALUES (?, ?, ?, ?, 'info', 0, 1, ?)`,
      [
        crypto.randomUUID(),
        userId,
        'Welcome to Apna Crop!',
        `Namaste ${name}! Your farmer account is active. You can now book official APMC procurement slots.`,
        nowIso
      ]
    );

    const token = createJwtToken({
      sub: userId,
      username: cleanUsername,
      role: 'farmer',
      name: name.trim(),
      district,
      village
    });

    return NextResponse.json({
      success: true,
      message: `Welcome to Apna Crop, ${name}! Registration successful.`,
      token,
      token_type: 'bearer',
      user: {
        id: userId,
        name: name.trim(),
        username: cleanUsername,
        mobile: cleanMobile,
        role: 'farmer',
        district,
        village,
        state
      }
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Registration failed.' }, { status: 500 });
  }
}
