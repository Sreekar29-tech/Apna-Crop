'use client';

import React, { useState } from 'react';
import {
  Workflow,
  CheckCircle,
  ArrowRight,
  Filter,
  XCircle,
  Search,
  User,
  Building
} from 'lucide-react';
import { Booking } from '@/lib/types';
import { PIPELINE_STAGES } from '@/lib/calculations';
import { apiClient } from '@/lib/api-client';

interface PipelineManagerProps {
  bookings: Booking[];
  token: string;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  t: Record<string, string>;
}

export const PipelineManager: React.FC<PipelineManagerProps> = ({
  bookings,
  token,
  onRefresh,
  showToast,
  t
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = bookings.filter((b) => {
    const matchesFilter = filterStatus === 'All' || b.status === filterStatus;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      b.token_number?.toLowerCase().includes(term) ||
      b.farmer_name?.toLowerCase().includes(term) ||
      b.crop_name?.toLowerCase().includes(term) ||
      b.centre_name?.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const getNextStage = (currentStatus: string): string | null => {
    const idx = PIPELINE_STAGES.indexOf(currentStatus as any);
    if (idx >= 0 && idx < PIPELINE_STAGES.length - 1) {
      return PIPELINE_STAGES[idx + 1];
    }
    return null;
  };

  const handleAdvanceStage = async (bookingId: string, nextStatus: string) => {
    setUpdatingId(bookingId);
    try {
      const data = await apiClient.advanceBookingStatus(bookingId, nextStatus);
      showToast(data.message || `Booking advanced to ${nextStatus}`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update stage', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this procurement slot?')) return;
    setUpdatingId(bookingId);
    try {
      const data = await apiClient.cancelBooking(bookingId);
      showToast(data.message || 'Booking cancelled', 'warning');
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {t.adminPipelineHeading || 'Mandi Operations & Queue Pipeline'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {t.adminPipelineSub ||
              'Update booking stages through the 7-step procurement lifecycle.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search token or farmer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#16823b]"
            />
          </div>

          {/* Filter Status Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-gray-700 outline-none cursor-pointer"
            >
              <option value="All">All Stages ({bookings.length})</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s} ({bookings.filter((b) => b.status === s).length})
                </option>
              ))}
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No pipeline bookings match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3">Token & Center</th>
                  <th className="px-4 py-3">{t.colFarmer || 'Farmer'}</th>
                  <th className="px-4 py-3">Crop & Qty</th>
                  <th className="px-4 py-3">Net Payout</th>
                  <th className="px-4 py-3">{t.colStage || 'Pipeline Stage'}</th>
                  <th className="px-4 py-3 text-right">Action / Progression</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filtered.map((b) => {
                  const nextStage = getNextStage(b.status);
                  const isUpdating = updatingId === b.id;

                  return (
                    <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 font-mono">{b.token_number}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-gray-400" />
                          <span>{b.centre_name || 'APMC Mandi'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{b.farmer_name || 'Farmer'}</div>
                        <div className="text-[11px] text-gray-500">{b.farmer_mobile} &bull; {b.farmer_village}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{b.crop_name}</div>
                        <div className="text-[11px] text-gray-500">{b.quantity_quintals} quintals</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#16823b]">
                          ₹{Number(b.net_amount).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {b.dbt_transaction_ref ? 'DBT Credited' : 'Pending Stage 7'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge badge-${b.status.toLowerCase().replace(/\s+/g, '')}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        {nextStage ? (
                          <button
                            onClick={() => handleAdvanceStage(b.id, nextStage)}
                            disabled={isUpdating}
                            className="px-3 py-1.5 bg-[#16823b] hover:bg-[#0f5c29] text-white font-semibold rounded-lg text-xs transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <span>Advance to {nextStage}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : b.status === 'Completed' ? (
                          <span className="text-[11px] font-semibold text-[#16823b] inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Completed & Disbursed
                          </span>
                        ) : (
                          <span className="text-[11px] text-red-500 font-semibold">Cancelled</span>
                        )}

                        {b.status !== 'Completed' && b.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={isUpdating}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
