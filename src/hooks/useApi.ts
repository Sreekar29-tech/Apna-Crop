'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Crop, MandiCentre, DeductionConfig, Booking, User, AdminDashboardMetrics } from '@/lib/types';

/**
 * Hook to dynamically load active APMC Mandi centres from the database
 */
export function useProcurementCentres() {
  const [centres, setCentres] = useState<MandiCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCentres = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getProcurementCentres();
      setCentres(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch centres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCentres();
  }, [fetchCentres]);

  return { centres, loading, error, refetch: fetchCentres };
}

/**
 * Hook to dynamically load official crop MSP prices from the database
 */
export function useCropPrices() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCrops = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getCropPrices();
      setCrops(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch crops');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCrops();
  }, [fetchCrops]);

  return { crops, loading, error, refetch: fetchCrops };
}

/**
 * Hook to dynamically load live state deduction parameters from the database
 */
export function useDeductionConfig() {
  const [deductions, setDeductions] = useState<DeductionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeductions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getDeductionConfig();
      setDeductions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch deductions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeductions();
  }, [fetchDeductions]);

  return { deductions, loading, error, refetch: fetchDeductions };
}
