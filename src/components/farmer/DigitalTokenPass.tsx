'use client';

import React from 'react';
import {
  Printer,
  QrCode,
  CheckCircle,
  Building,
  User,
  Wheat,
  Scale,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { Booking } from '@/lib/types';

interface DigitalTokenPassProps {
  booking: Booking | null;
  onNavigate: (tabId: string) => void;
  t: Record<string, string>;
}

export const DigitalTokenPass: React.FC<DigitalTokenPassProps> = ({ booking, onNavigate, t }) => {
  if (!booking) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">No Active Token Pass Selected</h3>
        <p className="text-xs text-gray-500">
          Please reserve a procurement slot or select an existing booking from your history to view its official digital e-Pass.
        </p>
        <button
          onClick={() => onNavigate('book-slot')}
          className="px-4 py-2 bg-[#16823b] text-white rounded-xl text-xs font-semibold hover:bg-[#0f5c29] transition-colors cursor-pointer"
        >
          Book a Mandi Slot
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {t.digitalTokenHeading || 'Digital Procurement Token Pass'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {t.digitalTokenSub ||
              'Present this e-Token at the Mandi entry gate for fast-track biometric verification.'}
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-[#123b25] hover:bg-[#0e311f] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>{t.printPassBtn || 'Print Token Pass'}</span>
        </button>
      </div>

      {/* Official Printable E-Pass Card */}
      <div className="bg-white rounded-3xl border-2 border-[#16823b] shadow-xl overflow-hidden print:border print:shadow-none">
        
        {/* Pass Header */}
        <div className="bg-[#123b25] text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-[#16823b]">
          <div>
            <span className="text-[10px] tracking-widest uppercase bg-[#16823b] px-2.5 py-0.5 rounded-full font-bold text-[#bbf7d0]">
              Official Mandi Pass
            </span>
            <h3 className="text-xl font-bold text-white mt-1">Government Procurement E-Pass</h3>
            <p className="text-xs text-[#86efac]">Department of Agriculture &bull; SIH Apna Crop</p>
          </div>

          <div className="flex flex-col sm:items-end">
            <span className={`badge badge-${booking.status.toLowerCase().replace(/\s+/g, '')} text-xs px-3 py-1 bg-white text-[#123b25] shadow-xs`}>
              {booking.status}
            </span>
            <span className="text-[11px] text-gray-300 mt-1">
              Issued: {new Date(booking.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Pass Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* QR Code and Token Number */}
          <div className="flex flex-col items-center justify-center p-6 bg-[#f4f7f5] rounded-2xl border border-dashed border-[#16823b]/40">
            <div className="w-32 h-32 bg-white p-3 rounded-2xl shadow-inner border border-gray-200 flex items-center justify-center">
              <QrCode className="w-24 h-24 text-gray-900" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-wider font-mono mt-3">
              {booking.token_number}
            </div>
            <div className="text-xs text-gray-600 font-medium mt-1 flex items-center gap-3">
              <span className="font-semibold text-[#16823b]">Queue Priority #{booking.queue_number || 1}</span>
              <span>&bull;</span>
              <span>Est. Wait: {booking.estimated_wait_minutes || 20} mins</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Farmer Info */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="font-bold text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-200">
                <User className="w-4 h-4 text-[#16823b]" />
                <span>Farmer Identification</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Farmer Name:</span>
                <span className="font-semibold text-gray-800">{booking.farmer_name || 'Farmer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Registered Mobile:</span>
                <span className="font-semibold text-gray-800">{booking.farmer_mobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span className="font-semibold text-gray-800">
                  {booking.farmer_village}, {booking.farmer_district}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">DBT Bank Account:</span>
                <span className="font-semibold text-gray-800 font-mono">
                  {booking.bank_account ? `••••${booking.bank_account.slice(-4)}` : 'Verified on File'}
                </span>
              </div>
            </div>

            {/* Mandi & Schedule */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="font-bold text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-200">
                <Building className="w-4 h-4 text-[#16823b]" />
                <span>Procurement Center & Time</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Center:</span>
                <span className="font-semibold text-gray-800">{booking.centre_name || 'APMC Mandi Yard'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Appointment Date:</span>
                <span className="font-bold text-[#16823b]">{booking.booking_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Allocated Slot:</span>
                <span className="font-semibold text-gray-800">{booking.time_slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verification Gate:</span>
                <span className="font-semibold text-gray-800">Gate #2 (Electronic Weighbridge)</span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="p-4 rounded-xl bg-[#e9f7ee] border border-[#86efac] space-y-2">
            <div className="font-bold text-[#123b25] flex items-center justify-between pb-2 border-b border-[#86efac]/50">
              <span className="flex items-center gap-1.5">
                <Wheat className="w-4 h-4 text-[#16823b]" />
                <span>Crop: {booking.crop_name} ({booking.quantity_quintals} Quintals)</span>
              </span>
              <span className="text-xs text-[#16823b] font-bold">
                Rate: ₹{booking.price_per_quintal}/qtl
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div>
                <span className="text-gray-500 text-[11px] block">Gross MSP Value</span>
                <span className="font-semibold text-gray-900">
                  ₹{Number(booking.gross_amount).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-[11px] block">Total Deductions</span>
                <span className="font-semibold text-red-600">
                  − ₹{Number(booking.total_deductions).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 text-[11px] block">Net Payable Payout (DBT)</span>
                <span className="font-bold text-lg text-[#16823b]">
                  ₹{Number(booking.net_amount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Guidelines footer */}
          <div className="text-[11px] text-gray-500 border-t border-gray-200 pt-4 leading-relaxed">
            <strong>Farmer Instructions:</strong> Bring your physical Aadhaar Card and vehicle RC. Ensure crop moisture meets APMC Fair Average Quality (FAQ) limit (typically &le;12-14%). In case of delay, contact Mandi Yard Manager.
          </div>
        </div>

      </div>
    </div>
  );
};
