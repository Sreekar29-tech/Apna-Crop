'use client';

import React from 'react';
import {
  Sun,
  Ticket,
  ListOrdered,
  CreditCard,
  Calendar,
  Building,
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { User, Booking } from '@/lib/types';

interface FarmerDashboardProps {
  user: User;
  bookings: Booking[];
  onNavigate: (tabId: string) => void;
  onSelectBooking: (booking: Booking) => void;
  t: Record<string, string>;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  user,
  bookings,
  onNavigate,
  onSelectBooking,
  t
}) => {
  const activeBookings = bookings.filter((b) => b.status !== 'Completed' && b.status !== 'Cancelled');
  const latestBooking = activeBookings[0] || bookings[0];

  const totalDisbursed = bookings
    .filter((b) => b.status === 'Completed' || b.payment_status === 'Paid')
    .reduce((sum, b) => sum + (Number(b.net_amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Welcome Hero Banner */}
      <div
        className="relative rounded-2xl p-6 sm:p-8 text-white shadow-lg overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(18, 59, 37, 0.94), rgba(22, 130, 59, 0.82)), url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80')`
        }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl sm:text-2xl font-bold">
                {t.dashGreeting || 'Namaste'}, {user.name}! 🌾
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-200 max-w-xl leading-relaxed">
              {t.dashWelcomeSub ||
                'Your direct gateway to guaranteed Minimum Support Prices (MSP), expedited biometric mandi appointments, and real-time digital pass verification.'}
            </p>
          </div>

          <div className="bg-[#0b2718]/80 backdrop-blur-xs border border-[#86efac]/30 px-4 py-2.5 rounded-xl flex items-center gap-3 shrink-0">
            <Sun className="w-6 h-6 text-amber-300 animate-pulse" />
            <div className="text-left">
              <div className="text-xs font-semibold text-white">
                {t.weatherLoc || 'Telangana Mandi Network • Sunny'}
              </div>
              <div className="text-[11px] text-[#86efac]">31°C &bull; Optimal Harvesting Weather</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('book-slot')}
            className="px-4 py-2 bg-white text-[#16823b] hover:bg-[#e9f7ee] text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>{t.navBookSlot || 'Book Slot'}</span>
          </button>
          <button
            onClick={() => onNavigate('queue-tracking')}
            className="px-4 py-2 bg-[#123b25] text-white hover:bg-[#0e311f] border border-white/20 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ListOrdered className="w-4 h-4" />
            <span>{t.navQueueTracking || 'Queue Tracking'}</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">{t.statActiveTokens || 'Active Slot Tokens'}</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{activeBookings.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">{t.statQueueStatus || 'Current Queue Position'}</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">
              {latestBooking ? `#${latestBooking.queue_number || 1}` : 'None'}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">{t.statTotalDisbursed || 'Total Disbursed Payouts'}</div>
            <div className="text-2xl font-bold text-[#16823b] mt-0.5">
              ₹{totalDisbursed.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Current Scheduled Procurement Card */}
      {latestBooking ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-gray-900">
                  {t.latestBookingTitle || 'Current Scheduled Procurement'}
                </h4>
                <span className={`badge badge-${latestBooking.status.toLowerCase().replace(/\s+/g, '')}`}>
                  {latestBooking.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Token: <strong className="text-gray-800">{latestBooking.token_number}</strong> &bull; Booked on{' '}
                {latestBooking.created_at ? new Date(latestBooking.created_at).toLocaleDateString() : 'Recent'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onSelectBooking(latestBooking);
                  onNavigate('digital-token');
                }}
                className="px-3.5 py-2 bg-[#16823b] hover:bg-[#0f5c29] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>{t.navDigitalToken || 'Digital Token'}</span>
              </button>
              <button
                onClick={() => {
                  onSelectBooking(latestBooking);
                  onNavigate('queue-tracking');
                }}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t.navQueueTracking || 'Track Queue'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <div>
              <div className="text-[11px] text-gray-400 font-medium uppercase">{t.colCrop || 'Crop'}</div>
              <div className="text-sm font-semibold text-gray-800 mt-0.5">{latestBooking.crop_name}</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400 font-medium uppercase">{t.colQty || 'Quantity'}</div>
              <div className="text-sm font-semibold text-gray-800 mt-0.5">
                {latestBooking.quantity_quintals} Quintals
              </div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400 font-medium uppercase">{t.colCentre || 'Mandi Centre'}</div>
              <div className="text-sm font-semibold text-gray-800 mt-0.5 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-gray-400" />
                <span>{latestBooking.centre_name || 'APMC Mandi'}</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400 font-medium uppercase">{t.netEstimatedLabel || 'Net DBT Payable'}</div>
              <div className="text-sm font-bold text-[#16823b] mt-0.5">
                ₹{Number(latestBooking.net_amount).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#e9f7ee] text-[#16823b] flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-gray-800 mb-1">No Active Bookings Yet</h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
            Book your guaranteed Minimum Support Price (MSP) mandi slot to sell your harvested crops with digital queue pass.
          </p>
          <button
            onClick={() => onNavigate('book-slot')}
            className="px-5 py-2.5 bg-[#16823b] hover:bg-[#0f5c29] text-white text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <span>Reserve Your First Mandi Slot</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* APMC Mandi Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <h5 className="text-xs font-bold text-amber-900">
            {t.mandiNoticeTitle || 'Official State APMC Mandi Procurement'}
          </h5>
          <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
            {t.mandiNoticeSub ||
              'All grain weighment is digitally calibrated using electronic weighbridges with automated moisture analyzers. Ensure your grain meets Fair Average Quality (FAQ) standards.'}
          </p>
        </div>
      </div>
    </div>
  );
};
