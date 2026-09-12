import {
  User,
  Crop,
  MandiCentre,
  DeductionConfig,
  Booking,
  NotificationItem,
  AdminDashboardMetrics,
  FinancialBreakdown
} from './types';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = sessionStorage.getItem('portal_token') || localStorage.getItem('portal_token');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        sessionStorage.setItem('portal_token', token);
      } else {
        sessionStorage.removeItem('portal_token');
        localStorage.removeItem('portal_token');
      }
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = sessionStorage.getItem('portal_token') || localStorage.getItem('portal_token');
    }
    return this.token;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    const authToken = this.getToken();
    if (authToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.detail || data.message || `Request failed with status ${res.status}`);
    }

    return data as T;
  }

  // ==========================================
  // Operational Data (Dynamically Loaded from DB)
  // ==========================================

  public async getProcurementCentres(): Promise<MandiCentre[]> {
    return this.request<MandiCentre[]>('/api/procurement-centres');
  }

  public async getCropPrices(): Promise<Crop[]> {
    return this.request<Crop[]>('/api/crops/prices');
  }

  public async getDeductionConfig(): Promise<DeductionConfig> {
    return this.request<DeductionConfig>('/api/config/deductions');
  }

  // ==========================================
  // Authentication & Profile
  // ==========================================

  public async login(username: string, password: string): Promise<{ success: boolean; token: string; user: User; message: string }> {
    const res = await this.request<{ success: boolean; token: string; user: User; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  public async register(formData: {
    name: string;
    username: string;
    mobile: string;
    password: string;
    village?: string;
    district?: string;
    state?: string;
  }): Promise<{ success: boolean; token: string; user: User; message: string }> {
    const res = await this.request<{ success: boolean; token: string; user: User; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  public async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  public async getProfile(): Promise<User> {
    return this.request<User>('/api/profile');
  }

  public async updateProfile(profileData: Partial<User>): Promise<{ success: boolean; message: string; user: User }> {
    return this.request<{ success: boolean; message: string; user: User }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  public logout(): void {
    this.setToken(null);
  }

  // ==========================================
  // Farmer Slot Bookings & Calculations
  // ==========================================

  public async getBookings(): Promise<Booking[]> {
    return this.request<Booking[]>('/api/bookings');
  }

  public async getBooking(id: string): Promise<Booking> {
    return this.request<Booking>(`/api/bookings/${id}`);
  }

  public async bookSlot(data: {
    crop_id: string;
    centre_id: string;
    quantity_quintals: number;
    booking_date: string;
    time_slot: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    message: string;
    booking_id: string;
    token_number: string;
    queue_number: number;
    estimated_wait_minutes: number;
    financials: FinancialBreakdown;
  }> {
    return this.request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async cancelBooking(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/bookings/${id}/cancel`, {
      method: 'POST'
    });
  }

  public async getQueueStatus(id: string): Promise<any> {
    return this.request(`/api/queue/${id}`);
  }

  public async getPayments(): Promise<any[]> {
    return this.request<any[]>('/api/payments');
  }

  public async getNotifications(): Promise<NotificationItem[]> {
    return this.request<NotificationItem[]>('/api/notifications');
  }

  public async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'POST'
    });
  }

  // ==========================================
  // Admin Operations
  // ==========================================

  public async getAdminDashboard(): Promise<AdminDashboardMetrics> {
    return this.request<AdminDashboardMetrics>('/api/admin/dashboard');
  }

  public async getAdminBookings(status?: string): Promise<Booking[]> {
    const query = status && status !== 'All' ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<Booking[]>(`/api/admin/bookings${query}`);
  }

  public async advanceBookingStatus(id: string, status: string): Promise<{ success: boolean; message: string; status: string; dbt_transaction_ref?: string }> {
    return this.request(`/api/admin/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  public async addCrop(data: { crop_name: string; category: string; price_per_quintal: number }): Promise<{ success: boolean; message: string; crop: Crop }> {
    return this.request('/api/crops', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async updateCropPrice(id: string, price_per_quintal: number): Promise<{ success: boolean; message: string; crop: Crop }> {
    return this.request(`/api/crops/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ price_per_quintal })
    });
  }

  public async updateDeductions(data: {
    mandi_fee_percent: number;
    labor_charge_per_quintal: number;
    transport_charge_per_quintal: number;
  }): Promise<{ success: boolean; message: string; config: DeductionConfig }> {
    return this.request('/api/deductions', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  public async getAdminFarmers(): Promise<any[]> {
    return this.request<any[]>('/api/admin/farmers');
  }
}

export const apiClient = new ApiClient();
