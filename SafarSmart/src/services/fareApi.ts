import axios from 'axios';
import { API_BASE_URL, API_HEADERS as HEADERS } from './apiConfig';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FareRequest {
  origin_city: string;
  destination_city: string;
  num_people?: number;   // 1-6, default 1
  is_peak?: boolean;     // peak-hour surge
}

export interface ServiceFare {
  service: string;       // "Uber", "Careem", "InDrive", "Bykea"
  category: string;      // "UberGo", "Go", "Standard", "Bike", etc.
  icon: string;
  color: string;
  base_fare: number;
  per_km_rate: number;
  fare_min: number;
  fare_expected: number;
  fare_max: number;
  currency: string;      // "PKR"
  is_available: boolean;
  is_peak_active: boolean;
  note: string;
}

export interface FareResponse {
  origin_city: string;
  destination_city: string;
  distance_km: number;
  duration_minutes: number;
  origin_coords: { lat: number; lon: number };
  destination_coords: { lat: number; lon: number };
  fares: ServiceFare[];
  cheapest_service: string;
  cheapest_fare: number;
  is_peak: boolean;
  calculated_at: string;
}

// ── API call ─────────────────────────────────────────────────────────────────

export async function calculateFare(request: FareRequest): Promise<FareResponse> {
  try {
    const response = await axios.post<FareResponse>(
      `${API_BASE_URL}/fare/calculate`,
      request,
      { headers: HEADERS, timeout: 15000 },
    );
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const msg = error.response?.data?.detail || error.message || 'Failed to calculate fare';
      throw new Error(msg);
    }
    throw error;
  }
}
