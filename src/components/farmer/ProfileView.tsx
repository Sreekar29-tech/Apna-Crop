'use client';

import React, { useState } from 'react';
import {
  UserCheck,
  User,
  Phone,
  MapPin,
  Building,
  CreditCard,
  Save,
  ShieldCheck
} from 'lucide-react';
import { User as UserType } from '@/lib/types';
import { apiClient } from '@/lib/api-client';

interface ProfileViewProps {
  user: UserType;
  token: string;
  onProfileUpdated: (updatedUser: UserType) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  t: Record<string, string>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  token,
  onProfileUpdated,
  showToast,
  t
}) => {
  const [name, setName] = useState(user.name || '');
  const [village, setVillage] = useState(user.village || '');
  const [district, setDistrict] = useState(user.district || '');
  const [state, setState] = useState(user.state || 'Telangana');
  const [bankAccount, setBankAccount] = useState(user.bank_account || '');
  const [ifscCode, setIfscCode] = useState(user.ifsc_code || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await apiClient.updateProfile({
        name,
        village,
        district,
        state,
        bank_account: bankAccount,
        ifsc_code: ifscCode
      });

      showToast(data.message || 'Profile saved successfully!', 'success');
      onProfileUpdated(data.user);
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {t.profileHeading || 'Farmer Identity & Banking Profile'}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {t.profileSub ||
            'Keep your village, district, and bank account details up to date for seamless DBT payments.'}
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs space-y-6">
        
        {/* Personal Details */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
            <User className="w-4 h-4 text-[#16823b]" />
            <span>Personal Identification</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t.profileNameLabel || 'Full Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t.profileMobileLabel || 'Mobile Number'} (Verified)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={user.mobile}
                  disabled
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t.profileVillageLabel || 'Village / Mandal'}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t.profileDistrictLabel || 'District'}
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Banking DBT Details */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#16823b]" />
            <span>Direct Benefit Transfer (DBT) Bank Credentials</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t.profileBankLabel || 'Bank Account Number (DBT)'}
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="e.g. SBIN00012345678"
                className="w-full px-3 py-2.5 text-sm font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t.profileIfscLabel || 'Bank IFSC Code'}
              </label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                maxLength={11}
                className="w-full px-3 py-2.5 text-sm font-mono uppercase rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 bg-[#16823b] hover:bg-[#0f5c29] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{t.saveProfileBtn || 'Save Profile Changes'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
