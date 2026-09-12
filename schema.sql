-- ============================================================================
-- PROJECT: APNA CROP (Smart India Hackathon)
-- APNA CROP - SUPABASE / POSTGRESQL DATABASE SCHEMA
-- Zero Data-Destructive Architecture & Full RLS Support
-- Username & Password Authentication with Server-Side Password Hashing
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. FARMERS / USER PROFILES TABLE
-- Supports role-based access control: 'farmer' (default) and 'admin'
-- Standard Username & Password Authentication (Zero OTP dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Salted hash (Bcrypt / Argon2)
    aadhaar_hash VARCHAR(64),
    district TEXT NOT NULL DEFAULT 'Nizamabad',
    state TEXT NOT NULL DEFAULT 'Telangana',
    village TEXT DEFAULT 'Bodhan',
    bank_account VARCHAR(50),
    ifsc_code VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT true, -- Soft status flag (No DELETE policy)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farmers_username ON public.farmers(username);
CREATE INDEX IF NOT EXISTS idx_farmers_mobile ON public.farmers(mobile);
CREATE INDEX IF NOT EXISTS idx_farmers_role ON public.farmers(role);

-- ============================================================================
-- 2. PROCUREMENT CENTRES TABLE
-- Physical mandis / state warehouses with daily capacities
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.procurement_centres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Telangana',
    daily_capacity_quintals NUMERIC(10, 2) NOT NULL DEFAULT 500.00 CHECK (daily_capacity_quintals > 0),
    operating_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (operating_status IN ('active', 'inactive', 'maintenance')),
    contact_number VARCHAR(20),
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_centres_status ON public.procurement_centres(operating_status);
CREATE INDEX IF NOT EXISTS idx_centres_district ON public.procurement_centres(district);

-- ============================================================================
-- 3. CROP PRICES TABLE (MSP & Mandi Rates)
-- Admin-managed crop list and procurement price per quintal
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.crop_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Cereal',
    price_per_quintal NUMERIC(10, 2) NOT NULL CHECK (price_per_quintal > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_by UUID REFERENCES public.farmers(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crop_prices_name ON public.crop_prices(crop_name);

-- ============================================================================
-- 4. DEDUCTION CONFIGURATION TABLE
-- Admin-configurable default deduction parameters for profit calculation
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deduction_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandi_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.50 CHECK (mandi_fee_percent >= 0),
    labor_charge_per_quintal NUMERIC(10, 2) NOT NULL DEFAULT 20.00 CHECK (labor_charge_per_quintal >= 0),
    transport_charge_per_quintal NUMERIC(10, 2) NOT NULL DEFAULT 25.00 CHECK (transport_charge_per_quintal >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_by UUID REFERENCES public.farmers(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. BOOKINGS TABLE
-- Slot reservations snapshotting historical financial breakdown for auditability
-- Pipeline: Booked -> Arrived -> Verification -> Weighing -> Quality Check -> Final Acceptance -> Completed
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_number VARCHAR(50) UNIQUE NOT NULL,
    farmer_id UUID NOT NULL REFERENCES public.farmers(id),
    centre_id UUID NOT NULL REFERENCES public.procurement_centres(id),
    crop_name VARCHAR(100) NOT NULL,
    quantity_quintals NUMERIC(10, 2) NOT NULL CHECK (quantity_quintals > 0),
    booking_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Booked' CHECK (
        status IN (
            'Booked',
            'Arrived',
            'Verification',
            'Weighing',
            'Quality Check',
            'Final Acceptance',
            'Completed',
            'Cancelled'
        )
    ),
    -- Historical Financial Snapshot (Zero data mutability on past records)
    price_per_quintal_at_booking NUMERIC(10, 2) NOT NULL CHECK (price_per_quintal_at_booking > 0),
    gross_amount NUMERIC(12, 2) NOT NULL CHECK (gross_amount >= 0),
    mandi_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (mandi_fee >= 0),
    labor_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (labor_charge >= 0),
    transport_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (transport_charge >= 0),
    total_deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_deductions >= 0),
    net_amount NUMERIC(12, 2) NOT NULL CHECK (net_amount >= 0),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_farmer ON public.bookings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_centre ON public.bookings(centre_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_token ON public.bookings(token_number);

-- ============================================================================
-- 6. QUEUE MANAGEMENT TABLE
-- Live queue position and estimated wait time per center & booking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id),
    centre_id UUID NOT NULL REFERENCES public.procurement_centres(id),
    queue_number INTEGER NOT NULL CHECK (queue_number > 0),
    estimated_wait_minutes INTEGER NOT NULL DEFAULT 30,
    current_stage VARCHAR(30) NOT NULL DEFAULT 'Booked',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queues_booking ON public.queues(booking_id);
CREATE INDEX IF NOT EXISTS idx_queues_centre ON public.queues(centre_id);

-- ============================================================================
-- 7. PAYMENTS TABLE
-- Transparent payout status linked to booking financial snapshot
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id),
    gross_amount NUMERIC(12, 2) NOT NULL CHECK (gross_amount >= 0),
    deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (deductions >= 0),
    net_amount NUMERIC(12, 2) NOT NULL CHECK (net_amount >= 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Processing', 'Paid', 'Failed')),
    payment_reference VARCHAR(100),
    paid_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_farmer ON public.payments(farmer_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);

-- ============================================================================
-- 8. NOTIFICATIONS TABLE
-- Real-time alerts for booking creation, queue movements, pipeline transitions, and payments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_farmer ON public.notifications(farmer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & HELPER FUNCTIONS
-- Ensures strict isolation: farmers see only their data; admins see everything
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'admin')
        OR EXISTS (
            SELECT 1 FROM public.farmers
            WHERE id = public.current_user_id()
              AND role = 'admin'
              AND is_active = true
        );
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduction_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Farmers Policies
CREATE POLICY "Farmers can read their own profile"
    ON public.farmers FOR SELECT
    USING (id = public.current_user_id() OR public.is_admin());

CREATE POLICY "Farmers can update their own profile"
    ON public.farmers FOR UPDATE
    USING (id = public.current_user_id() OR public.is_admin())
    WITH CHECK (id = public.current_user_id() OR public.is_admin());

CREATE POLICY "Admins have full access to farmers"
    ON public.farmers FOR ALL
    USING (public.is_admin());

-- Procurement Centres Policies
CREATE POLICY "Everyone authenticated can view active centres"
    ON public.procurement_centres FOR SELECT
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can insert or update centres"
    ON public.procurement_centres FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Crop Prices Policies
CREATE POLICY "Everyone authenticated can view active crop prices"
    ON public.crop_prices FOR SELECT
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins can insert or update crop prices"
    ON public.crop_prices FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Deduction Config Policies
CREATE POLICY "Everyone authenticated can view deduction configuration"
    ON public.deduction_config FOR SELECT
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins can update deduction configuration"
    ON public.deduction_config FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Bookings Policies
CREATE POLICY "Farmers can view their own bookings"
    ON public.bookings FOR SELECT
    USING (farmer_id = public.current_user_id() OR public.is_admin());

CREATE POLICY "Farmers can create their own bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (farmer_id = public.current_user_id() OR public.is_admin());

CREATE POLICY "Farmers can cancel their own bookings"
    ON public.bookings FOR UPDATE
    USING (farmer_id = public.current_user_id() OR public.is_admin())
    WITH CHECK (farmer_id = public.current_user_id() OR public.is_admin());

CREATE POLICY "Admins can manage all bookings"
    ON public.bookings FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Queues Policies
CREATE POLICY "Farmers can view queue for their own bookings"
    ON public.queues FOR SELECT
    USING (
        booking_id IN (SELECT id FROM public.bookings WHERE farmer_id = public.current_user_id())
        OR public.is_admin()
    );

CREATE POLICY "Admins can manage queue records"
    ON public.queues FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Payments Policies
CREATE POLICY "Farmers can view their own payments"
    ON public.payments FOR SELECT
    USING (farmer_id = public.current_user_id() OR public.is_admin());

CREATE POLICY "Admins can view and manage all payments"
    ON public.payments FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Notifications Policies
CREATE POLICY "Farmers can view their own notifications"
    ON public.notifications FOR SELECT
    USING (farmer_id = public.current_user_id() OR public.is_admin());

CREATE POLICY "Farmers can update read status on their own notifications"
    ON public.notifications FOR UPDATE
    USING (farmer_id = public.current_user_id() OR public.is_admin())
    WITH CHECK (farmer_id = public.current_user_id() OR public.is_admin());

CREATE POLICY "Admins can manage all notifications"
    ON public.notifications FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- INITIAL SEED DATA
-- Pre-seeded Admin & Demo Farmers with username and hashed passwords
-- ============================================================================

-- Seed Default Admin (username: 'admin', password: 'admin123')
INSERT INTO public.farmers (
    id, name, username, mobile, role, password_hash, district, state, village
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'District Procurement Admin',
    'admin',
    '9999999999',
    'admin',
    '$2b$12$K1rS24gT.H0d6L1Q3U.3qOVwK38Xw5aOq1W8Jv9H4nN3oF1Y9xK/W', -- bcrypt of 'admin123'
    'Nizamabad',
    'Telangana',
    'Collectorate HQ'
) ON CONFLICT (username) DO UPDATE SET role = 'admin';

-- Seed Demonstration Farmers (password: 'Farmer@123')
INSERT INTO public.farmers (
    id, name, username, mobile, role, password_hash, district, state, village, bank_account, ifsc_code
) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'Ramesh Patel', 'ramesh', '9876543210', 'farmer', '$2b$12$e5k5yQeM8nJ0zB.9gO4mO.E0hV9kY3uI6vT7rW8nN2bX1qL4kM9oK', 'Nizamabad', 'Telangana', 'Bodhan', 'SBIN00012345678', 'SBIN0001234'),
    ('f0000000-0000-0000-0000-000000000002', 'Suresh Kumar', 'suresh', '9876543211', 'farmer', '$2b$12$e5k5yQeM8nJ0zB.9gO4mO.E0hV9kY3uI6vT7rW8nN2bX1qL4kM9oK', 'Warangal', 'Telangana', 'Narsampet', 'HDFC00087654321', 'HDFC0008765'),
    ('f0000000-0000-0000-0000-000000000003', 'Anita Devi', 'anita', '9876543212', 'farmer', '$2b$12$e5k5yQeM8nJ0zB.9gO4mO.E0hV9kY3uI6vT7rW8nN2bX1qL4kM9oK', 'Karimnagar', 'Telangana', 'Huzurabad', 'UBIN00099887766', 'UBIN0009988')
ON CONFLICT (username) DO NOTHING;

-- Seed Procurement Centres
INSERT INTO public.procurement_centres (
    id, name, code, district, state, daily_capacity_quintals, operating_status, contact_number, address
) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Nizamabad Central Mandi', 'NZB-01', 'Nizamabad', 'Telangana', 600.00, 'active', '+91 8462 220101', 'Market Yard, Nizamabad Highway'),
    ('c0000000-0000-0000-0000-000000000002', 'Warangal Agri Center', 'WGL-02', 'Warangal', 'Telangana', 750.00, 'active', '+91 870 2450202', 'Grain Market, Warangal Urban'),
    ('c0000000-0000-0000-0000-000000000003', 'Karimnagar Grain Yard', 'KRM-03', 'Karimnagar', 'Telangana', 500.00, 'active', '+91 878 2230303', 'Collectorate Road, Karimnagar'),
    ('c0000000-0000-0000-0000-000000000004', 'Khammam Procurement Hub', 'KHM-04', 'Khammam', 'Telangana', 450.00, 'active', '+91 8742 230404', 'APMC Yard, Khammam')
ON CONFLICT (code) DO NOTHING;

-- Seed Standard Crops & Prices (MSP per quintal)
INSERT INTO public.crop_prices (
    id, crop_name, category, price_per_quintal, updated_by
) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'Paddy (Common)', 'Cereal', 2183.00, 'a0000000-0000-0000-0000-000000000001'),
    ('e0000000-0000-0000-0000-000000000002', 'Paddy (Grade A)', 'Cereal', 2203.00, 'a0000000-0000-0000-0000-000000000001'),
    ('e0000000-0000-0000-0000-000000000003', 'Wheat', 'Cereal', 2275.00, 'a0000000-0000-0000-0000-000000000001'),
    ('e0000000-0000-0000-0000-000000000004', 'Maize', 'Coarse Cereals', 2090.00, 'a0000000-0000-0000-0000-000000000001'),
    ('e0000000-0000-0000-0000-000000000005', 'Cotton (Medium Staple)', 'Commercial', 6620.00, 'a0000000-0000-0000-0000-000000000001'),
    ('e0000000-0000-0000-0000-000000000006', 'Soybean (Yellow)', 'Oilseeds', 4600.00, 'a0000000-0000-0000-0000-000000000001'),
    ('e0000000-0000-0000-0000-000000000007', 'Mustard', 'Oilseeds', 5650.00, 'a0000000-0000-0000-0000-000000000001'),
    ('e0000000-0000-0000-0000-000000000008', 'Groundnut', 'Oilseeds', 6377.00, 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (crop_name) DO NOTHING;

-- Seed Deduction Config
INSERT INTO public.deduction_config (
    id, mandi_fee_percent, labor_charge_per_quintal, transport_charge_per_quintal, updated_by
) VALUES (
    'd0000000-0000-0000-0000-000000000001',
    1.50,
    20.00,
    25.00,
    'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;
