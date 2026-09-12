'use client';

import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Building,
  Save,
  CheckCircle2,
  Scale
} from 'lucide-react';
import { DeductionConfig, MandiCentre } from '@/lib/types';
import { apiClient } from '@/lib/api-client';

interface SettingsManagerProps {
  deductions: DeductionConfig | null;
  centres: MandiCentre[];
  token: string;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  t: Record<string, string>;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  deductions,
  centres,
  token,
  onRefresh,
  showToast,
  t
}) => {
  const [feePercent, setFeePercent] = useState(String(deductions?.mandi_fee_percent ?? ''));
  const [laborCharge, setLaborCharge] = useState(String(deductions?.labor_charge_per_quintal ?? ''));
  const [transportCharge, setTransportCharge] = useState(String(deductions?.transport_charge_per_quintal ?? ''));
  const [saving, setSaving] = useState(false);

  const handleSaveDeductions = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await apiClient.updateDeductions({
        mandi_fee_percent: Number(feePercent),
        labor_charge_per_quintal: Number(laborCharge),
        transport_charge_per_quintal: Number(transportCharge)
      });

      showToast(data.message || 'Deduction policy updated', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update deduction policy', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {t.adminSettingsHeading || 'Procurement Mandis & Deduction Policy'}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {t.adminSettingsSub ||
            'Configure standard state deductions (Mandi fee %, handling charges, transport rates).'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Deduction Parameters Form (5 cols) */}
        <form
          onSubmit={handleSaveDeductions}
          className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4"
        >
          <div className="pb-3 border-b border-gray-100 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#16823b]" />
            <h3 className="text-sm font-bold text-gray-900">
              {t.deductionConfigTitle || 'State Deduction Parameters'}
            </h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t.mandiFeePercentLabel || 'Mandi Development Fee (%)'}
            </label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              Statutory mandi cess levied by State APMC Board.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t.laborRateLabel || 'Labor & Handling Charge (₹ / quintal)'}
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={laborCharge}
              onChange={(e) => setLaborCharge(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              Unloading, stacking, and sampling labor charges.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t.transportRateLabel || 'Transport / Freight Surcharge (₹ / quintal)'}
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={transportCharge}
              onChange={(e) => setTransportCharge(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              Standard transit from rural aggregation center to central silo.
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-[#16823b] hover:bg-[#0f5c29] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t.saveDeductionsBtn || 'Update Deduction Rates'}</span>
              </>
            )}
          </button>
        </form>

        {/* Right Column: APMC Mandi Centres (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#16823b]" />
              <h3 className="text-sm font-bold text-gray-900">
                {t.centresListTitle || 'Active Procurement Mandis & Capacities'}
              </h3>
            </div>
            <span className="text-xs text-gray-400">{centres.length} Mandi Locations</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-3 py-2.5">Centre Name</th>
                  <th className="px-3 py-2.5">{t.colCode || 'Code'}</th>
                  <th className="px-3 py-2.5">District</th>
                  <th className="px-3 py-2.5">{t.colCapacity || 'Daily Capacity'}</th>
                  <th className="px-3 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {centres.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-3 py-2.5 font-semibold text-gray-900 flex items-center gap-1.5">
                      <span>🏛️</span>
                      <span>{c.name}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-500">{c.code}</td>
                    <td className="px-3 py-2.5 text-gray-600">{c.district}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">
                      {c.daily_capacity_quintals} qtl
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="badge badge-completed">{c.operating_status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
