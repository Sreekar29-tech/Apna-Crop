'use client';

import React from 'react';
import { Sprout, Globe, Bell, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { User } from '@/lib/types';
import { SupportedLanguage } from '@/lib/i18n';

interface NavbarProps {
  user: User | null;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onLogout: () => void;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  t: Record<string, string>;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  language,
  onLanguageChange,
  onLogout,
  unreadNotifsCount,
  onOpenNotifications,
  t
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#123b25] text-white px-4 md:px-8 py-3 shadow-md flex items-center justify-between border-b border-[#1b5335]">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#16823b] to-[#22c55e] flex items-center justify-center text-white shadow-md">
          <Sprout className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white m-0 leading-tight">Apna Crop</h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#16823b] text-[#bbf7d0] border border-[#22c55e]/30">
              {t.smartPortalBadge || 'Apna Crop • SIH'}
            </span>
          </div>
          <p className="text-[11px] text-[#86efac] m-0 leading-tight hidden md:block">
            Government of India • Ministry of Agriculture
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Language Selector */}
        <div className="flex items-center gap-1.5 bg-[#0b2718] px-3 py-1.5 rounded-lg border border-[#1b5335] text-xs">
          <Globe className="w-4 h-4 text-[#86efac]" />
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            aria-label="Language selection"
            className="bg-transparent text-white text-xs outline-none cursor-pointer pr-1"
          >
            <option value="en" className="bg-[#123b25] text-white">English</option>
            <option value="te" className="bg-[#123b25] text-white">తెలుగు (Telugu)</option>
            <option value="hi" className="bg-[#123b25] text-white">हिंदी (Hindi)</option>
          </select>
        </div>

        {/* Notifications Button */}
        {user && user.role === 'farmer' && (
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg bg-[#0b2718] border border-[#1b5335] hover:bg-[#16823b]/40 text-gray-200 hover:text-white transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotifsCount}
              </span>
            )}
          </button>
        )}

        {/* User Info & Logout */}
        {user && (
          <div className="flex items-center gap-3 pl-2 border-l border-[#1b5335]">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#16823b] flex items-center justify-center font-semibold text-xs border border-[#86efac]/40">
                {user.role === 'admin' ? <ShieldCheck className="w-4 h-4 text-amber-300" /> : <UserIcon className="w-4 h-4 text-white" />}
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
                <div className="text-[10px] text-gray-300 capitalize flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                  {user.role} &bull; {user.district}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium transition-all shadow-sm"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.logoutBtn || 'Logout'}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
