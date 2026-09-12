'use client';

import React from 'react';
import {
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  Banknote
} from 'lucide-react';
import { Booking } from '@/lib/types';

interface PaymentsViewProps {
  bookings: Booking[];
  t: Record<string, string>;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ bookings, t }) => {
  const paidBookings = bookings.filter(
    (b) => b.status === 'Completed' || b.payment_status === 'Paid'
  );

  const totalPaid = paidBookings.reduce((sum, b) => sum + (Number(b.net_amount) || 0), 0);
  const pendingBookings = bookings.filter(
    (b) => b.status !== 'Completed' && b.status !== 'Cancelled'
  );
  const totalPending = pendingBookings.reduce((sum, b) => sum + (Number(b.net_amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {t.paymentsHeading || 'Direct Benefit Transfer & Payment Slips'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {t.paymentsSub ||
              'Transparent financial breakdown with zero hidden deductions. Audited & immutable.'}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs no-print cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Financial Summary</span>
        </button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-tr from-[#123b25] to-[#16823b] text-white shadow-md">
          <div className="text-[11px] uppercase tracking-wider text-[#a7f3d0] font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Disbursed Direct Benefit Transfer (DBT)</span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-1">
            ₹{totalPaid.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-gray-200 mt-1">
            Credited directly to farmer bank accounts
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <div className="text-[11px] uppercase tracking-wider text-amber-600 font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>In-Pipeline Procurement Value</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900 mt-1">
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {pendingBookings.length} scheduled / active mandi appointments
          </div>
        </div>
      </div>

      {/* Payment Slips Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-[#16823b]" />
            <span>Itemized Payment Vouchers</span>
          </h3>
          <span className="text-xs text-gray-400">{bookings.length} Total Records</span>
        </div>

        {bookings.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No procurement bookings recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3">Token & Date</th>
                  <th className="px-4 py-3">Crop & Qty</th>
                  <th className="px-4 py-3">Gross MSP</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net Payout</th>
                  <th className="px-4 py-3">DBT Ref #</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{b.token_number}</div>
                      <div className="text-[11px] text-gray-400">{b.booking_date}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{b.crop_name}</div>
                      <div className="text-[11px] text-gray-500">{b.quantity_quintals} qtl</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      ₹{Number(b.gross_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-red-600">
                      − ₹{Number(b.total_deductions).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-sm text-[#16823b]">
                        ₹{Number(b.net_amount).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-600">
                      {b.dbt_transaction_ref || 'Pending Acceptance'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`badge ${
                          b.status === 'Completed' || b.payment_status === 'Paid'
                            ? 'badge-completed'
                            : 'badge-booked'
                        }`}
                      >
                        {b.status === 'Completed' ? 'PAID (DBT)' : b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
