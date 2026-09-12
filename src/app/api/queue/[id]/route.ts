import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { PIPELINE_STAGES } from '@/lib/calculations';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = await params;

  const sql = `
    SELECT 
      b.id as booking_id, b.token_number, b.status, b.farmer_id, b.quantity_quintals, b.crop_name,
      q.queue_number, q.estimated_wait_minutes, q.current_stage,
      c.name as centre_name, c.district as centre_district
    FROM bookings b
    LEFT JOIN queues q ON b.id = q.booking_id
    LEFT JOIN procurement_centres c ON b.centre_id = c.id
    WHERE b.id = ? OR b.token_number = ?
    LIMIT 1
  `;

  const item = await queryOne<any>(sql, [id, id]);
  if (!item) {
    return NextResponse.json({ detail: 'Queue tracking record not found.' }, { status: 404 });
  }

  const stageIndex = PIPELINE_STAGES.indexOf(item.status as any);

  return NextResponse.json({
    booking_id: item.booking_id,
    token_number: item.token_number,
    crop_name: item.crop_name,
    centre_name: item.centre_name,
    centre_district: item.centre_district,
    status: item.status,
    current_stage: item.current_stage || item.status,
    stage_index: stageIndex >= 0 ? stageIndex : 0,
    queue_number: item.queue_number || 1,
    estimated_wait_minutes: item.estimated_wait_minutes || 20,
    stages: PIPELINE_STAGES
  });
}
