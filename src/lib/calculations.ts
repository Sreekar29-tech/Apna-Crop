import { FinancialBreakdown } from './types';

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculatePayout(
  quantityQuintals: number,
  pricePerQuintal: number,
  mandiFeePercent: number = 1.5,
  laborChargePerQuintal: number = 20.0,
  transportChargePerQuintal: number = 25.0
): FinancialBreakdown {
  const qty = Number(quantityQuintals) || 0;
  const price = Number(pricePerQuintal) || 0;

  const grossAmount = round2(qty * price);
  const mandiFeeAmount = round2((grossAmount * mandiFeePercent) / 100);
  const laborChargeAmount = round2(qty * laborChargePerQuintal);
  const transportChargeAmount = round2(qty * transportChargePerQuintal);

  const totalDeductions = round2(mandiFeeAmount + laborChargeAmount + transportChargeAmount);
  const netAmount = round2(Math.max(0, grossAmount - totalDeductions));

  return {
    quantity_quintals: qty,
    price_per_quintal: price,
    gross_amount: grossAmount,
    mandi_fee_percent: mandiFeePercent,
    mandi_fee_amount: mandiFeeAmount,
    labor_charge_per_quintal: laborChargePerQuintal,
    labor_charge_amount: laborChargeAmount,
    transport_charge_per_quintal: transportChargePerQuintal,
    transport_charge_amount: transportChargeAmount,
    total_deductions: totalDeductions,
    net_amount: netAmount
  };
}

export const PIPELINE_STAGES = [
  'Booked',
  'Arrived',
  'Verification',
  'Weighing',
  'Quality Check',
  'Final Acceptance',
  'Completed'
] as const;
