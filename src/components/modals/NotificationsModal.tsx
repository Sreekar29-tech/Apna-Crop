'use client';

import React from 'react';
import {
  Bell,
  X,
  CheckCircle,
  Calendar,
  AlertTriangle,
  Info,
  Clock
} from 'lucide-react';
import { NotificationItem } from '@/lib/types';

interface NotificationsModalProps {
  notifications: NotificationItem[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  t: Record<string, string>;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkRead,
  t
}) => {
  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'booking':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-[#16823b]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#16823b]" />
            <h3 className="text-base font-bold text-gray-900">
              {t.modalNotifTitle || 'Notifications & Alerts'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No notifications yet. You will be alerted when bookings advance or payments disburse.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border text-xs transition-all ${
                  n.is_read
                    ? 'bg-gray-50/70 border-gray-100 opacity-80'
                    : 'bg-[#e9f7ee]/50 border-[#86efac]/60 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0">{getIcon(n.type)}</span>
                    <span className="font-bold text-gray-900">{n.title}</span>
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={() => onMarkRead(n.id)}
                      className="text-[10px] text-[#16823b] font-semibold hover:underline shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>

                <p className="text-gray-600 mt-1 pl-6 leading-relaxed">{n.message}</p>
                <div className="text-[10px] text-gray-400 mt-1.5 pl-6 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
          >
            {t.closeBtn || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
