'use client';

import React, { useState, useEffect } from 'react';
import {
  Wheat,
  Calendar,
  Clock,
  Building,
  Scale,
  Calculator,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Crop, MandiCentre, DeductionConfig, Booking } from '@/lib/types';
import { calculatePayout } from '@/lib/calculations';
import { apiClient } from '@/lib/api-client';

interface BookSlotViewProps {
  crops: Crop[];
  centres: MandiCentre[];
  deductions: DeductionConfig | null;
  token: string;
  onBookingSuccess: (bookingId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  t: Record<string, string>;
}

const CROP_GLYPHS: Record<string, string> = {
  Wheat: '🌾',
  'Paddy (Common)': '🌾',
  'Paddy (Grade A)': '🌾',
  Maize: '🌽',
  'Cotton (Medium Staple)': '⚪',
  'Soybean (Yellow)': '🟡',
  Mustard: '🌼',
  Groundnut: '🥜'
};

export const BookSlotView: React.FC<BookSlotViewProps> = ({
  crops,
  centres,
  deductions,
  token,
  onBookingSuccess,
  showToast,
  t
}) => {
  const [selectedCropId, setSelectedCropId] = useState<string>('');
  const [selectedCentreId, setSelectedCentreId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(25);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [bookingDate, setBookingDate] = useState<string>(tomorrowStr);
  const [timeSlot, setTimeSlot] = useState<string>('10:00 AM - 01:00 PM');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedCropId && crops.length > 0) {
      setSelectedCropId(crops[0].id);
    }
  }, [crops, selectedCropId]);

  useEffect(() => {
    if (!selectedCentreId && centres.length > 0) {
      setSelectedCentreId(centres[0].id);
    }
  }, [centres, selectedCentreId]);

  if (crops.length === 0 || centres.length === 0 || !deductions) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#16823b]/20 border-t-[#16823b] rounded-full animate-spin mx-auto" />
        <div className="text-sm font-semibold text-gray-800">
          Loading live APMC mandi catalog & deduction parameters...
        </div>
      </div>
    );
  }

  const selectedCrop = crops.find((c) => c.id === selectedCropId) || crops[0];
  const selectedPrice = selectedCrop ? selectedCrop.price_per_quintal : 0;

  const feePercent = deductions.mandi_fee_percent;
  const laborRate = deductions.labor_charge_per_quintal;
  const transportRate = deductions.transport_charge_per_quintal;

  const breakdown = calculatePayout(quantity, selectedPrice, feePercent, laborRate, transportRate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCropId || !selectedCentreId || !bookingDate || !timeSlot || quantity <= 0) {
      showToast('Please fill all required booking parameters.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiClient.bookSlot({
        crop_id: selectedCropId,
        centre_id: selectedCentreId,
        quantity_quintals: quantity,
        booking_date: bookingDate,
        time_slot: timeSlot,
        notes
      });

      showToast(data.message || 'Slot successfully booked!', 'success');
      onBookingSuccess(data.booking_id);
    } catch (err: any) {
      showToast(err.message || 'Booking failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {t.bookSlotHeading || 'Procurement Slot Reservation'}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {t.bookSlotSub ||
            'Select your crop and center. Transparent rate calculation snapshot at time of booking.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form (7 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          
          {/* Crop Selector with Glyphs */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>{t.selectCropLabel || 'Select Crop'} *</span>
              {selectedCrop && (
                <span className="text-[11px] font-bold text-[#16823b] bg-[#e9f7ee] px-2 py-0.5 rounded-md">
                  Official MSP: ₹{selectedCrop.price_per_quintal}/qtl
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {crops.map((crop) => {
                const glyph = CROP_GLYPHS[crop.crop_name] || '🌾';
                const isSelected = selectedCropId === crop.id;
                return (
                  <button
                    type="button"
                    key={crop.id}
                    onClick={() => setSelectedCropId(crop.id)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#16823b] bg-[#e9f7ee] shadow-xs'
                        : 'border-gray-200 hover:border-[#16823b]/40 bg-white'
                    }`}
                  >
                    <div className="text-lg mb-1">{glyph}</div>
                    <div className="text-xs font-semibold text-gray-900 truncate">{crop.crop_name}</div>
                    <div className="text-[11px] text-[#16823b] font-bold mt-1">₹{crop.price_per_quintal}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity in Quintals */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
              <span>{t.quantityLabel || 'Quantity in Quintals'} (1 Quintal = 100 kg) *</span>
              <span className="text-[11px] text-gray-500 font-medium">
                {quantity ? `${(quantity * 100).toLocaleString('en-IN')} kg` : '0 kg'}
              </span>
            </label>
            <div className="relative">
              <Scale className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="number"
                min={1}
                max={1000}
                step={0.5}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
              />
            </div>
          </div>

          {/* Mandi Centre */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t.centreLabel || 'Procurement Mandi / Centre'} *
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <select
                value={selectedCentreId}
                onChange={(e) => setSelectedCentreId(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b] bg-white cursor-pointer"
              >
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.district}) &bull; Daily Cap: {c.daily_capacity_quintals} qtl
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date and Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t.bookingDateLabel || 'Preferred Date'} *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t.timeSlotLabel || 'Time Slot'} *
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b] bg-white cursor-pointer"
                >
                  <option value="09:00 AM - 12:00 PM">09:00 AM - 12:00 PM (Morning Slot 1)</option>
                  <option value="12:00 PM - 03:00 PM">12:00 PM - 03:00 PM (Afternoon Slot 2)</option>
                  <option value="03:00 PM - 06:00 PM">03:00 PM - 06:00 PM (Evening Slot 3)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Special Notes / Vehicle #</label>
            <div className="relative">
              <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Tractor TS-07-EA-1234"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#16823b] hover:bg-[#0f5c29] text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
          >
            {submitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{t.confirmBookingBtn || 'Confirm & Generate Digital Token'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Right Column: Dynamic Financial Breakdown Preview (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-[#e9f7ee] text-[#16823b] flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {t.calculationPreviewTitle || 'Transparent Payout Calculation Preview'}
                </h3>
                <p className="text-[11px] text-gray-500">Government audited MSP formula</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between text-gray-700">
                <span>
                  {t.grossValueRow || 'Gross Procurement Value'} ({quantity} qtl &times; ₹{selectedPrice})
                </span>
                <span className="font-semibold text-gray-900">₹{breakdown.gross_amount.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 border-t border-dashed border-gray-200 space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>{t.mandiFeeRow || 'Mandi Development Fee'} ({feePercent}%)</span>
                  <span className="text-red-600 font-medium">− ₹{breakdown.mandi_fee_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t.laborRow || 'Handling & Labor'} (₹{laborRate}/qtl)</span>
                  <span className="text-red-600 font-medium">− ₹{breakdown.labor_charge_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t.transportRow || 'Transport Charge'} (₹{transportRate}/qtl)</span>
                  <span className="text-red-600 font-medium">− ₹{breakdown.transport_charge_amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between text-gray-700 font-medium">
                <span>Total Deductions</span>
                <span className="text-red-700 font-semibold">− ₹{breakdown.total_deductions.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Net Highlight Box */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-tr from-[#123b25] to-[#16823b] text-white">
            <div className="text-[11px] text-[#a7f3d0] uppercase tracking-wider font-semibold">
              {t.netEstimatedLabel || 'Estimated Net Payable Payout'}
            </div>
            <div className="text-2xl font-bold text-white mt-0.5">
              ₹{breakdown.net_amount.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-gray-200 mt-1">
              Direct Benefit Transfer (DBT) directly into your linked bank account.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
