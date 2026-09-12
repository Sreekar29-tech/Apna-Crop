'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/common/Navbar';
import { Sidebar } from '@/components/common/Sidebar';
import { Footer } from '@/components/common/Footer';
import { ToastContainer, ToastMessage } from '@/components/common/Toast';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { FarmerDashboard } from '@/components/farmer/FarmerDashboard';
import { BookSlotView } from '@/components/farmer/BookSlotView';
import { DigitalTokenPass } from '@/components/farmer/DigitalTokenPass';
import { QueueTrackerView } from '@/components/farmer/QueueTrackerView';
import { PaymentsView } from '@/components/farmer/PaymentsView';
import { BookingHistoryView } from '@/components/farmer/BookingHistoryView';
import { ProfileView } from '@/components/farmer/ProfileView';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { PipelineManager } from '@/components/admin/PipelineManager';
import { CropsManager } from '@/components/admin/CropsManager';
import { SettingsManager } from '@/components/admin/SettingsManager';
import { NotificationsModal } from '@/components/modals/NotificationsModal';
import { User, Crop, MandiCentre, DeductionConfig, Booking, NotificationItem, AdminDashboardMetrics } from '@/lib/types';
import { SupportedLanguage, getTranslation } from '@/lib/i18n';
import { apiClient } from '@/lib/api-client';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Operational domain data dynamically loaded from real database
  const [crops, setCrops] = useState<Crop[]>([]);
  const [centres, setCentres] = useState<MandiCentre[]>([]);
  const [deductions, setDeductions] = useState<DeductionConfig | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [adminMetrics, setAdminMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // UI state
  const [isNotifsOpen, setIsNotifsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const t = getTranslation(language);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch Public / Shared Data dynamically from DB via apiClient
  const fetchSharedData = useCallback(async () => {
    try {
      const [cropsData, centresData, dedData] = await Promise.all([
        apiClient.getCropPrices(),
        apiClient.getProcurementCentres(),
        apiClient.getDeductionConfig()
      ]);

      setCrops(cropsData);
      setCentres(centresData);
      setDeductions(dedData);
    } catch {
      // Handled gracefully during initial server boot
    }
  }, []);

  // Fetch Authenticated Data (Bookings, Notifications, Admin Dashboard)
  const fetchAuthData = useCallback(async (authToken: string, userRole: string) => {
    try {
      apiClient.setToken(authToken);

      if (userRole === 'admin') {
        const [metricsData, bookingsData] = await Promise.all([
          apiClient.getAdminDashboard(),
          apiClient.getAdminBookings()
        ]);
        setAdminMetrics(metricsData);
        setBookings(bookingsData);
      } else {
        const [bookingsData, notifsData] = await Promise.all([
          apiClient.getBookings(),
          apiClient.getNotifications()
        ]);
        setBookings(bookingsData);
        if (bookingsData.length > 0 && !selectedBooking) {
          setSelectedBooking(bookingsData[0]);
        }
        setNotifications(notifsData);
      }
    } catch {
      // Handled silently
    }
  }, [selectedBooking]);

  // Initial Session Check
  useEffect(() => {
    const savedLang = (localStorage.getItem('portal_lang') as SupportedLanguage) || 'en';
    setLanguage(savedLang);

    const savedToken = sessionStorage.getItem('portal_token') || localStorage.getItem('portal_token');
    const savedUser = sessionStorage.getItem('portal_user') || localStorage.getItem('portal_user');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        apiClient.setToken(savedToken);
        setCurrentTab(parsedUser.role === 'admin' ? 'admin-dashboard' : 'dashboard');
        fetchAuthData(savedToken, parsedUser.role);
      } catch {
        sessionStorage.clear();
      }
    }

    fetchSharedData().finally(() => setInitialLoading(false));
  }, [fetchSharedData, fetchAuthData]);

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    localStorage.setItem('portal_lang', newLang);
  };

  const handleLoginSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    apiClient.setToken(newToken);
    sessionStorage.setItem('portal_token', newToken);
    sessionStorage.setItem('portal_user', JSON.stringify(newUser));
    setCurrentTab(newUser.role === 'admin' ? 'admin-dashboard' : 'dashboard');
    fetchAuthData(newToken, newUser.role);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    apiClient.logout();
    sessionStorage.removeItem('portal_token');
    sessionStorage.removeItem('portal_user');
    setCurrentTab('dashboard');
    showToast('Logged out successfully', 'info');
  };

  const handleBookingCreated = async (bookingId: string) => {
    if (!token || !user) return;
    await fetchAuthData(token, user.role);

    // Fetch newly created booking for direct pass preview
    try {
      const b = await apiClient.getBooking(bookingId);
      setSelectedBooking(b);
    } catch {
      // fallback
    }
    setCurrentTab('digital-token');
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!token || !user) return;
    try {
      const data = await apiClient.cancelBooking(bookingId);
      showToast(data.message || 'Booking cancelled', 'warning');
      fetchAuthData(token, user.role);
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel booking', 'error');
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    if (!token) return;
    try {
      await apiClient.markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: 1 } : n))
      );
    } catch {
      // Ignored
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7f5]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#16823b]/20 border-t-[#16823b] rounded-full animate-spin mx-auto" />
          <div className="text-sm font-semibold text-[#123b25]">Loading Apna Crop Portal...</div>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Auth Screen
  if (!user || !token) {
    return (
      <>
        <AuthScreen onLoginSuccess={handleLoginSuccess} showToast={showToast} t={t} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const unreadNotifs = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f5]">
      {/* Top Navbar */}
      <Navbar
        user={user}
        language={language}
        onLanguageChange={handleLanguageChange}
        onLogout={handleLogout}
        unreadNotifsCount={unreadNotifs}
        onOpenNotifications={() => setIsNotifsOpen(true)}
        t={t}
      />

      {/* Main Layout (Sidebar + Content) */}
      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar
          role={user.role}
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          t={t}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Farmer Portal Views */}
          {user.role === 'farmer' && (
            <>
              {currentTab === 'dashboard' && (
                <FarmerDashboard
                  user={user}
                  bookings={bookings}
                  onNavigate={setCurrentTab}
                  onSelectBooking={setSelectedBooking}
                  t={t}
                />
              )}
              {currentTab === 'book-slot' && (
                <BookSlotView
                  crops={crops}
                  centres={centres}
                  deductions={deductions}
                  token={token}
                  onBookingSuccess={handleBookingCreated}
                  showToast={showToast}
                  t={t}
                />
              )}
              {currentTab === 'digital-token' && (
                <DigitalTokenPass
                  booking={selectedBooking || bookings[0] || null}
                  onNavigate={setCurrentTab}
                  t={t}
                />
              )}
              {currentTab === 'queue-tracking' && (
                <QueueTrackerView
                  booking={selectedBooking || bookings[0] || null}
                  onNavigate={setCurrentTab}
                  t={t}
                />
              )}
              {currentTab === 'payments' && (
                <PaymentsView bookings={bookings} t={t} />
              )}
              {currentTab === 'history' && (
                <BookingHistoryView
                  bookings={bookings}
                  onSelectBooking={setSelectedBooking}
                  onNavigate={setCurrentTab}
                  onCancelBooking={handleCancelBooking}
                  t={t}
                />
              )}
              {currentTab === 'profile' && (
                <ProfileView
                  user={user}
                  token={token}
                  onProfileUpdated={(up) => {
                    setUser(up);
                    sessionStorage.setItem('portal_user', JSON.stringify(up));
                  }}
                  showToast={showToast}
                  t={t}
                />
              )}
            </>
          )}

          {/* Admin Portal Views */}
          {user.role === 'admin' && (
            <>
              {currentTab === 'admin-dashboard' && (
                <AdminDashboard
                  metrics={adminMetrics}
                  onNavigate={setCurrentTab}
                  t={t}
                />
              )}
              {currentTab === 'admin-pipeline' && (
                <PipelineManager
                  bookings={bookings}
                  token={token}
                  onRefresh={() => fetchAuthData(token, user.role)}
                  showToast={showToast}
                  t={t}
                />
              )}
              {currentTab === 'admin-crops' && (
                <CropsManager
                  crops={crops}
                  token={token}
                  onRefresh={fetchSharedData}
                  showToast={showToast}
                  t={t}
                />
              )}
              {currentTab === 'admin-settings' && (
                <SettingsManager
                  deductions={deductions}
                  centres={centres}
                  token={token}
                  onRefresh={fetchSharedData}
                  showToast={showToast}
                  t={t}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Footer */}
      <Footer />

      {/* Notifications Drawer */}
      <NotificationsModal
        notifications={notifications}
        isOpen={isNotifsOpen}
        onClose={() => setIsNotifsOpen(false)}
        onMarkRead={handleMarkNotificationRead}
        t={t}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
