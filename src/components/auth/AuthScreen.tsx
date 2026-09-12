'use client';

import React, { useState } from 'react';
import {
  Sprout,
  Tractor,
  ShieldAlert,
  UserCheck,
  CheckCircle,
  Lock,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  MapPin,
  Building,
  Shield
} from 'lucide-react';
import { User, UserRole } from '@/lib/types';
import { apiClient } from '@/lib/api-client';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: User) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  t: Record<string, string>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, showToast, t }) => {
  const [authRole, setAuthRole] = useState<UserRole>('farmer');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regVillage, setRegVillage] = useState('Bodhan');
  const [regDistrict, setRegDistrict] = useState('Nizamabad');
  const [regLoading, setRegLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      showToast('Please enter both username/mobile and password.', 'error');
      return;
    }

    setLoginLoading(true);
    try {
      const data = await apiClient.login(loginUsername, loginPassword);
      showToast(data.message || 'Login successful!', 'success');
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regUsername || !regMobile || !regPassword) {
      showToast('Please complete all required fields.', 'error');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (regPassword.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error');
      return;
    }

    if (!/\d/.test(regPassword)) {
      showToast('Password must contain at least one number.', 'error');
      return;
    }

    setRegLoading(true);
    try {
      const data = await apiClient.register({
        name: regName,
        username: regUsername,
        mobile: regMobile,
        password: regPassword,
        village: regVillage,
        district: regDistrict,
        state: 'Telangana'
      });

      showToast(data.message || 'Registration successful!', 'success');
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 bg-gradient-to-br from-[#0e311f] via-[#123b25] to-[#16823b]">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-[#22c55e]/20">
        
        {/* Left Column: Rich Agricultural Hero Banner */}
        <div
          className="relative md:w-5/12 p-8 text-white flex flex-col justify-between overflow-hidden bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(18, 59, 37, 0.88), rgba(18, 59, 37, 0.94)), url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80')`
          }}
        >
          {/* Top Brand */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#16823b] to-[#22c55e] flex items-center justify-center shadow-lg border border-[#86efac]/30">
              <Sprout className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white m-0">Apna Crop</h1>
              <span className="text-[11px] text-[#a7f3d0] font-semibold tracking-wider uppercase">
                Government of India • SIH
              </span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="my-8">
            <h2 className="text-xl font-bold leading-snug text-white mb-3">
              {t.heroTitle || 'Smart Agricultural Procurement & Mandi Management'}
            </h2>
            <p className="text-xs text-gray-200 leading-relaxed mb-6">
              {t.heroDesc ||
                'Direct farmer-to-government procurement with guaranteed Minimum Support Price (MSP), instant e-Tokens, transparent deductions, and direct bank account payouts.'}
            </p>

            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-xs text-[#f0fdf4]">
                <CheckCircle className="w-4 h-4 text-[#86efac] shrink-0" />
                <span>{t.heroFeat1 || 'Guaranteed MSP Rates for 8+ Essential Crops'}</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs text-[#f0fdf4]">
                <CheckCircle className="w-4 h-4 text-[#86efac] shrink-0" />
                <span>{t.heroFeat2 || 'Direct Benefit Transfer (DBT) with Zero Hidden Cuts'}</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs text-[#f0fdf4]">
                <CheckCircle className="w-4 h-4 text-[#86efac] shrink-0" />
                <span>{t.heroFeat3 || 'Live 7-Stage Mandi Queue Tracking & Instant e-Pass'}</span>
              </li>
            </ul>
          </div>

          {/* Bottom Security Badge */}
          <div className="pt-4 border-t border-white/20 flex items-center justify-between text-[11px] text-[#a7f3d0]">
            <span>&copy; 2026 SIH &bull; Ministry of Agriculture</span>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-[#86efac]" /> 256-bit Encrypted
            </span>
          </div>
        </div>

        {/* Right Column: Forms Container */}
        <div className="md:w-7/12 p-6 sm:p-10 flex flex-col justify-center bg-white">
          
          {/* Portal Switcher (Farmer vs Admin) */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6 border border-gray-200">
            <button
              onClick={() => {
                setAuthRole('farmer');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                authRole === 'farmer'
                  ? 'bg-white text-[#16823b] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Tractor className="w-4 h-4" />
              <span>{t.farmerPortalTab || 'Farmer Portal'}</span>
            </button>
            <button
              onClick={() => {
                setAuthRole('admin');
                setAuthMode('login'); // Admins cannot self-register
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                authRole === 'admin'
                  ? 'bg-white text-[#123b25] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{t.adminPortalTab || 'Admin Portal'}</span>
            </button>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {authMode === 'login'
                ? authRole === 'admin'
                  ? 'District Administrator Sign In'
                  : t.loginHeading || 'Farmer Sign In'
                : t.registerHeading || 'Farmer Registration'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {authMode === 'login'
                ? t.loginSub || 'Enter your registered username and password to access your portal.'
                : t.registerSub || 'Join the official state procurement network to reserve guaranteed mandi slots.'}
            </p>
          </div>

          {/* LOGIN FORM */}
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.usernameLabel || 'Username or Mobile Number'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="e.g. ramesh or 9876543210"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.passwordLabel || 'Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your account password"
                    required
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 px-4 bg-[#16823b] hover:bg-[#0f5c29] text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {loginLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t.signInBtn || 'Sign In to Portal'}</span>
                    <UserCheck className="w-4 h-4" />
                  </>
                )}
              </button>

              {authRole === 'farmer' && (
                <div className="text-center text-xs text-gray-500 pt-2">
                  <span>{t.noAccountText || 'New farmer?'} </span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className="text-[#16823b] font-semibold hover:underline cursor-pointer"
                  >
                    {t.registerHereLink || 'Create Farmer Account'}
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.fullNameLabel || 'Full Name'} *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.chooseUsernameLabel || 'Choose Username'} *
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. ramesh_patel"
                    required
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.mobileLabel || 'Mobile Number'} (10 digits) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.villageLabel || 'Village / Mandal'}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={regVillage}
                      onChange={(e) => setRegVillage(e.target.value)}
                      placeholder="e.g. Bodhan"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.districtLabel || 'District'}
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={regDistrict}
                      onChange={(e) => setRegDistrict(e.target.value)}
                      placeholder="e.g. Nizamabad"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.passwordLabel || 'Password'} (&gt;= 8 chars) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 8 chars + number"
                      required
                      className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-2.5 text-gray-400"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.confirmPasswordLabel || 'Confirm Password'} *
                  </label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16823b]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-3 px-4 bg-[#16823b] hover:bg-[#0f5c29] text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
              >
                {regLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t.createAccountBtn || 'Register & Enter Portal'}</span>
                    <CheckCircle className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center text-xs text-gray-500 pt-1">
                <span>{t.alreadyRegisteredText || 'Already have an account?'} </span>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-[#16823b] font-semibold hover:underline cursor-pointer"
                >
                  {t.signInHereLink || 'Sign In Here'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
