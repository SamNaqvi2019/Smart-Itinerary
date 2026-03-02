import axios from 'axios';
import { API_BASE_URL as BASE, API_HEADERS as H } from './apiConfig';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BudgetRequest {
  destination_city: string;
  origin_city?: string;
  budget_level: 'low' | 'medium' | 'high';
  num_days: number;
  num_people: number;
  transport_mode?: string;
  travel_date?: string;
}

export interface HotelOption {
  name: string;
  price_per_night: number;
  price_total: number;
  price_per_person: number;
  currency: string;
  tier: string;
  is_peak_priced: boolean;
}

export interface TransportEstimate {
  service: string;
  fare_one_way: number;
  fare_return: number;
  fare_total: number;
  per_person: number;
  currency: string;
  distance_km: number;
  note: string;
}

export interface FoodBreakdown {
  breakfast: number;
  lunch: number;
  dinner: number;
  snacks: number;
  daily_per_person: number;
  total: number;
  label: string;
}

export interface ActivityBreakdown {
  sightseeing: number;
  entrance_fees: number;
  guided_tour: number;
  adventure: number;
  daily_per_person: number;
  total: number;
  label: string;
}

export interface BudgetTotals {
  accommodation: number;
  transport: number;
  food: number;
  activities: number;
  subtotal: number;
  contingency: number;
  grand_total: number;
  per_person: number;
  per_day: number;
  currency: string;
}

export interface BudgetResponse {
  destination_city: string;
  origin_city?: string;
  num_days: number;
  num_people: number;
  budget_level: string;
  is_peak_season: boolean;
  hotels: HotelOption[];
  recommended_hotel: HotelOption;
  transport_options: TransportEstimate[];
  food: FoodBreakdown;
  activities: ActivityBreakdown;
  totals: BudgetTotals;
  savings_tips: string[];
  calculated_at: string;
}

export async function calculateBudget(req: BudgetRequest): Promise<BudgetResponse> {
  const res = await axios.post<BudgetResponse>(`${BASE}/budget/calculate`, req, { headers: H, timeout: 15000 });
  return res.data;
}

// ── New user-choice budget planner ───────────────────────────────────────────

export interface BudgetPlanRequest {
  destination: string;
  num_days: number;
  num_travelers: number;
  budget_tier: 'low' | 'medium' | 'high';
}

export interface HotelChoiceOption {
  name: string;
  star_rating: number;
  price_per_night: number;
  total_price: number;
  location: string;
  amenities: string[];
}

export interface TransportChoiceOption {
  type: string;   // flight | bus | train | car
  provider: string;
  price_per_person: number;
  total_price: number;
  duration: string;
}

export interface BudgetOptionsResponse {
  hotel_options: HotelChoiceOption[];
  transport_options: TransportChoiceOption[];
}

export interface BudgetEstimateRequest {
  budget_request: BudgetPlanRequest;
  selected_hotel_index: number;
  selected_transport_index: number;
}

export interface BudgetEstimateResponse {
  selected_hotel: HotelChoiceOption;
  selected_transport: TransportChoiceOption;
  total_estimated_cost: number;
  note: string;
}

export async function getBudgetOptions(req: BudgetPlanRequest): Promise<BudgetOptionsResponse> {
  try {
    const res = await axios.post<BudgetOptionsResponse>(`${BASE}/api/budget/options`, req, { headers: H, timeout: 30000 });
    return res.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const msg = error.response?.data?.detail || error.message || 'Failed to fetch budget options';
      throw new Error(msg);
    }
    throw error;
  }
}

export async function getBudgetEstimate(req: BudgetEstimateRequest): Promise<BudgetEstimateResponse> {
  try {
    const res = await axios.post<BudgetEstimateResponse>(`${BASE}/api/budget/estimate`, req, { headers: H, timeout: 30000 });
    return res.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const msg = error.response?.data?.detail || error.message || 'Failed to fetch estimate';
      throw new Error(msg);
    }
    throw error;
  }
}
