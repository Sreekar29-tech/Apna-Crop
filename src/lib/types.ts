export type UserRole = 'farmer' | 'admin';

export interface User {
  id: string;
  name: string;
  username: string;
  mobile: string;
  password_hash?: string;
  aadhaar_hash?: string | null;
  district: string;
  state: string;
  village: string;
  bank_account?: string | null;
  ifsc_code?: string | null;
  role: UserRole;
  is_active: boolean | number;
  created_at?: string;
}

export interface Crop {
  id: string;
  crop_name: string;
  category: string;
  price_per_quintal: number;
  is_active: boolean | number;
  updated_at?: string;
  updated_by?: string;
}

export interface DeductionConfig {
  id: string;
  mandi_fee_percent: number;
  labor_charge_per_quintal: number;
  transport_charge_per_quintal: number;
  updated_at?: string;
  updated_by?: string;
}

export interface MandiCentre {
  id: string;
  name: string;
  code: string;
  district: string;
  daily_capacity_quintals: number;
  operating_status: string;
}

export type PipelineStage = 
  | 'Booked'
  | 'Arrived'
  | 'Verification'
  | 'Weighing'
  | 'Quality Check'
  | 'Final Acceptance'
  | 'Completed'
  | 'Cancelled';

export interface Booking {
  id: string;
  farmer_id: string;
  crop_id: string;
  centre_id: string;
  quantity_quintals: number;
  price_per_quintal: number;
  gross_amount: number;
  mandi_fee_percent: number;
  mandi_fee_amount: number;
  labor_charge_per_quintal: number;
  labor_charge_amount: number;
  transport_charge_per_quintal: number;
  transport_charge_amount: number;
  total_deductions: number;
  net_amount: number;
  booking_date: string;
  time_slot: string;
  token_number: string;
  queue_number: number;
  estimated_wait_minutes: number;
  status: PipelineStage;
  stage_index: number;
  payment_status: string;
  dbt_transaction_ref?: string | null;
  created_at: string;
  
  // Joined display fields
  crop_name?: string;
  crop_category?: string;
  centre_name?: string;
  farmer_name?: string;
  farmer_username?: string;
  farmer_mobile?: string;
  farmer_district?: string;
  farmer_village?: string;
  bank_account?: string | null;
  ifsc_code?: string | null;
}

export interface NotificationItem {
  id: string;
  farmer_id: string;
  booking_id?: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean | number;
  created_at: string;
}

export interface AdminDashboardMetrics {
  total_farmers: number;
  today_bookings: number;
  queue_active_count: number;
  total_quintals: number;
  total_gross_value: number;
  total_net_payouts: number;
  completed_bookings: number;
}

export interface FinancialBreakdown {
  quantity_quintals: number;
  price_per_quintal: number;
  gross_amount: number;
  mandi_fee_percent: number;
  mandi_fee_amount: number;
  labor_charge_per_quintal: number;
  labor_charge_amount: number;
  transport_charge_per_quintal: number;
  transport_charge_amount: number;
  total_deductions: number;
  net_amount: number;
}
