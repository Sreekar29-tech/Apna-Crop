'use client';

import React, { useState } from 'react';
import {
  Wheat,
  Plus,
  Edit2,
  TrendingUp,
  CheckCircle2,
  X
} from 'lucide-react';
import { Crop } from '@/lib/types';
import { apiClient } from '@/lib/api-client';

interface CropsManagerProps {
  crops: Crop[];
  token: string;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  t: Record<string, string>;
}

export const CropsManager: React.FC<CropsManagerProps> = ({
  crops,
  token,
  onRefresh,
  showToast,
  t
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);

  // Add form state
  const [newCropName, setNewCropName] = useState('');
  const [newCategory, setNewCategory] = useState('Cereal');
  const [newPrice, setNewPrice] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit form state
  const [editPrice, setEditPrice] = useState('');
  const [editing, setEditing] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCropName || !newPrice) {
      showToast('Crop name and price are required.', 'error');
      return;
    }

    setAdding(true);
    try {
      const data = await apiClient.addCrop({
        crop_name: newCropName,
        category: newCategory,
        price_per_quintal: Number(newPrice)
      });

      showToast(data.message || 'Crop added successfully', 'success');
      setShowAddModal(false);
      setNewCropName('');
      setNewPrice('');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to add crop', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrop || !editPrice) return;

    setEditing(true);
    try {
      const data = await apiClient.updateCropPrice(selectedCrop.id, Number(editPrice));

      showToast(data.message || 'Price updated successfully', 'success');
      setShowEditModal(false);
      setSelectedCrop(null);
      setEditPrice('');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update price', 'error');
    } finally {
      setEditing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {t.adminCropsHeading || 'MSP & Mandi Crop Pricing Management'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {t.adminCropsSub ||
              'Admin-only: Configure crop catalog and official procurement rates per quintal.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#16823b] hover:bg-[#0f5c29] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addCropBtn || 'Add New Crop'}</span>
        </button>
      </div>

      {/* Crops Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200 text-[11px]">
              <tr>
                <th className="px-4 py-3">{t.colCropName || 'Crop Name'}</th>
                <th className="px-4 py-3">{t.colCategory || 'Category'}</th>
                <th className="px-4 py-3">{t.colPriceQtl || 'Current MSP (₹ / quintal)'}</th>
                <th className="px-4 py-3">{t.colLastUpdated || 'Last Updated'}</th>
                <th className="px-4 py-3 text-right">{t.colAction || 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {crops.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#e9f7ee] text-[#16823b] flex items-center justify-center text-sm">
                      🌾
                    </span>
                    <span>{c.crop_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium">
                      {c.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-base text-[#16823b]">
                    ₹{c.price_per_quintal.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : 'Initial Baseline'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedCrop(c);
                        setEditPrice(String(c.price_per_quintal));
                        setShowEditModal(true);
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-[#e9f7ee] text-gray-700 hover:text-[#16823b] font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Price</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Crop Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {t.modalAddCropTitle || 'Add New Crop to Catalog'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.cropNameInput || 'Crop Name'} *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Barley, Sunflower"
                  value={newCropName}
                  onChange={(e) => setNewCropName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.cropCategoryInput || 'Category'}
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b] bg-white"
                >
                  <option value="Cereal">Cereal</option>
                  <option value="Coarse Cereals">Coarse Cereals</option>
                  <option value="Pulses">Pulses</option>
                  <option value="Oilseeds">Oilseeds</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.cropPriceInput || 'Procurement Rate (₹ / quintal)'} *
                </label>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  placeholder="e.g. 2350"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  {t.cancelBtn || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2 bg-[#16823b] hover:bg-[#0f5c29] text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  {adding ? 'Saving...' : t.saveCropBtn || 'Save Crop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Price Modal */}
      {showEditModal && selectedCrop && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {t.modalEditPriceTitle || 'Update Crop Procurement Price'}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Crop</label>
                <input
                  type="text"
                  value={selectedCrop.crop_name}
                  disabled
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  New MSP Rate (₹ / quintal) *
                </label>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  {t.cancelBtn || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="px-5 py-2 bg-[#16823b] hover:bg-[#0f5c29] text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  {editing ? 'Updating...' : t.updatePriceBtn || 'Update Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
