'use client';

import React from 'react';
import {
  Users,
  Calendar,
  ListOrdered,
  Scale,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Workflow,
  Wheat,
  SlidersHorizontal
} from 'lucide-react';
import { AdminDashboardMetrics } from '@/lib/types';

interface AdminDashboardProps {
  metrics: AdminDashboardMetrics | null;
  onNavigate: (tabId: string) => void;
  t: Record<string, string>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ metrics, onNavigate, t }) => {
  const m = metrics || {
    total_farmers: 0,
    today_bookings: 0,
    queue_active_count: 0,
    total_quintals: 0,
    total_gross_value: 0,
    total_net_payouts: 0,
    completed_bookings: 0
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {t.adminDashboardHeading || 'State Procurement Command Center'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {t.adminDashboardSub ||
              'Aggregate analytics, procurement value, gross disbursements, and capacity tracking.'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('admin-pipeline')}
            className="px-3.5 py-2 bg-[#16823b] hover:bg-[#0f5c29] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Mandi Pipeline</span>
          </button>
          <button
            onClick={() => onNavigate('admin-crops')}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Wheat className="w-3.5 h-3.5" />
            <span>Manage MSP</span>
          </button>
        </div>
      </div>

      {/* 7 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>{t.admStatFarmers || 'Registered Farmers'}</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{m.total_farmers}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Active verified profiles</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>{t.admStatToday || "Today's Bookings"}</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{m.today_bookings}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Scheduled for today</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>{t.admStatQueue || 'Currently in Pipeline'}</span>
            <ListOrdered className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{m.queue_active_count}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Active stages 1 to 6</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>{t.admStatQuintals || 'Total Qty Procured'}</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {m.total_quintals.toLocaleString('en-IN')} <span className="text-xs text-gray-500 font-normal">qtl</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Total weighment calibrated</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>{t.admStatGross || 'Total Gross MSP'}</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-gray-900 mt-2">
            ₹{m.total_gross_value.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Pre-deduction value</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs bg-gradient-to-tr from-white to-emerald-50/50">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>{t.admStatNet || 'Total Net Farmer Payouts'}</span>
            <CreditCard className="w-4 h-4 text-[#16823b]" />
          </div>
          <div className="text-xl font-bold text-[#16823b] mt-2">
            ₹{m.total_net_payouts.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Direct Benefit Transfer</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs col-span-2 sm:col-span-3 lg:col-span-2">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>{t.admStatCompleted || 'Completed Procurements'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{m.completed_bookings}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Successfully audited & settled</div>
        </div>

      </div>
    </div>
  );
};
