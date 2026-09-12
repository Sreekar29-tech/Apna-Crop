'use client';

import React, { useState } from 'react';
import {
  History,
  Ticket,
  Search,
  Building,
  Calendar,
  Eye,
  XCircle
} from 'lucide-react';
import { Booking } from '@/lib/types';

interface BookingHistoryViewProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onNavigate: (tabId: string) => void;
  onCancelBooking: (bookingId: string) => void;
  t: Record<string, string>;
}

export const BookingHistoryView: React.FC<BookingHistoryViewProps> = ({
  bookings,
  onSelectBooking,
  onNavigate,
  onCancelBooking,
  t
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = bookings.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.token_number?.toLowerCase().includes(term) ||
      b.crop_name?.toLowerCase().includes(term) ||
      b.centre_name?.toLowerCase().includes(term) ||
      b.status?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {t.historyHeading || 'Procurement History & Archives'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {t.historySub ||
              'Comprehensive log of all your previous crop sale bookings and net earnings.'}
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by token, crop, centre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b] bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No booking records match your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3">{t.colToken || 'Token #'}</th>
                  <th className="px-4 py-3">{t.colDate || 'Date'}</th>
                  <th className="px-4 py-3">{t.colCentre || 'Centre'}</th>
                  <th className="px-4 py-3">{t.colCrop || 'Crop'}</th>
                  <th className="px-4 py-3">{t.colQty || 'Quantity (qtl)'}</th>
                  <th className="px-4 py-3">{t.colStatus || 'Status'}</th>
                  <th className="px-4 py-3">{t.colNetAmount || 'Net Amount (₹)'}</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900 font-mono">
                      {b.token_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {b.booking_date}
                      <div className="text-[10px] text-gray-400">{b.time_slot}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {b.centre_name || 'APMC Mandi'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {b.crop_name}
                    </td>
                    <td className="px-4 py-3">{b.quantity_quintals} qtl</td>
                    <td className="px-4 py-3">
                      <span className={`badge badge-${b.status.toLowerCase().replace(/\s+/g, '')}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#16823b]">
                      ₹{Number(b.net_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          onSelectBooking(b);
                          onNavigate('digital-token');
                        }}
                        className="px-2.5 py-1 bg-[#e9f7ee] hover:bg-[#d0f0de] text-[#16823b] font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="View Token Pass"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Pass</span>
                      </button>

                      {b.status === 'Booked' && (
                        <button
                          onClick={() => onCancelBooking(b.id)}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Cancel Slot"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
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
