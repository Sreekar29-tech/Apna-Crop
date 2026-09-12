import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { Crop } from '@/lib/types';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser || tokenUser.role !== 'admin') {
    return NextResponse.json({ detail: 'Forbidden. Admin privileges required.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { price_per_quintal, category } = body;

    const existing = await queryOne<Crop>('SELECT * FROM crop_prices WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ detail: 'Crop not found.' }, { status: 404 });
    }

    const price = price_per_quintal !== undefined ? Number(price_per_quintal) : existing.price_per_quintal;
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ detail: 'Price per quintal must be greater than 0.' }, { status: 400 });
    }

    const newCategory = category || existing.category;
    const nowIso = new Date().toISOString();

    await execute(
      `UPDATE crop_prices
       SET price_per_quintal = ?, category = ?, updated_by = ?, updated_at = ?
       WHERE id = ?`,
      [price, newCategory, tokenUser.sub, nowIso, id]
    );

    const updated = await queryOne<Crop>('SELECT * FROM crop_prices WHERE id = ?', [id]);
    return NextResponse.json({
      success: true,
      message: `Procurement rate for ${existing.crop_name} updated to ₹${price}/qtl.`,
      crop: updated
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Failed to update crop.' }, { status: 500 });
  }
}
