'use client';

import React from 'react';
import {
  LayoutDashboard,
  CalendarPlus,
  Ticket,
  ListOrdered,
  CreditCard,
  History,
  UserCheck,
  Wheat,
  SlidersHorizontal,
  Workflow
} from 'lucide-react';
import { UserRole } from '@/lib/types';

interface SidebarProps {
  role: UserRole;
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  t: Record<string, string>;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, currentTab, onSelectTab, t }) => {
  const farmerTabs = [
    { id: 'dashboard', label: t.navDashboard || 'Dashboard', icon: LayoutDashboard },
    { id: 'book-slot', label: t.navBookSlot || 'Book Slot', icon: CalendarPlus },
    { id: 'digital-token', label: t.navDigitalToken || 'Digital Token', icon: Ticket },
    { id: 'queue-tracking', label: t.navQueueTracking || 'Queue Tracking', icon: ListOrdered },
    { id: 'payments', label: t.navPayments || 'Payments & Profit', icon: CreditCard },
    { id: 'history', label: t.navHistory || 'History', icon: History },
    { id: 'profile', label: t.navProfile || 'My Profile', icon: UserCheck }
  ];

  const adminTabs = [
    { id: 'admin-dashboard', label: t.navAdminDashboard || 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'admin-pipeline', label: t.navProcurementPipeline || 'Procurement Pipeline', icon: Workflow },
    { id: 'admin-crops', label: t.navCropManagement || 'Crop & Pricing', icon: Wheat },
    { id: 'admin-settings', label: t.navCentresSettings || 'Centres & Deductions', icon: SlidersHorizontal }
  ];

  const tabs = role === 'admin' ? adminTabs : farmerTabs;

  return (
    <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-3 md:p-4 flex flex-col justify-between shrink-0 shadow-sm">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
          {role === 'admin' ? (t.adminPortalTitle || 'ADMINISTRATION') : (t.farmerPortalTitle || 'FARMER SERVICES')}
        </div>

        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive
                    ? 'bg-[#16823b] text-white shadow-md shadow-emerald-700/20'
                    : 'text-gray-700 hover:bg-[#e9f7ee] hover:text-[#16823b]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-[#16823b]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-8 p-3 bg-[#e9f7ee] rounded-xl border border-[#86efac]/40 text-center hidden md:block">
        <div className="text-xs font-semibold text-[#123b25]">Kisan Helpline • 1800-180-1551</div>
        <div className="text-[10px] text-gray-600 mt-0.5">Toll-free 24x7 Government Assistance</div>
      </div>
    </aside>
  );
};
