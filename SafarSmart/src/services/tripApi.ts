import axios from 'axios';
import { API_BASE_URL as BASE, API_HEADERS as H } from './apiConfig';

// ── Types matching backend schemas ────────────────────────────────────────────

export interface TripRequest {
    origin: string;
    destination: string;
    num_days: number;
    num_travelers: number;
}

export interface HotelOption {
    name: string;
    star_rating: number;
    price_per_night: number;
    total_price: number;
    location: string;
    amenities: string[];
}

export interface TransportOption {
    type: string;   // 'train' | 'bus' | 'flight' | 'car'
    provider: string;
    price_per_person: number;
    total_price: number;
    duration: string;
    distance_km?: number;
}

export interface TripOptionsResponse {
    hotel_options: HotelOption[];
    transport_options: TransportOption[];
    distance_km: number;
}

export interface SelectionRequest {
    trip_request: TripRequest;
    selected_hotel_index: number;
    selected_transport_index: number;
    hotel_options: HotelOption[];
    transport_options: TransportOption[];
}

export interface CostSummary {
    hotel_name: string;
    hotel_price_per_night: number;
    hotel_total: number;
    transport_name: string;
    transport_total: number;
    total_estimated_cost: number;
    note: string;
}

export interface TripDayPlan {
    day_number: number;
    title: string;
    activities: string[];
    hotel: string;
    image_url?: string;
}

export interface TripItineraryResponse {
    cost_summary: CostSummary;
    days: TripDayPlan[];
    weather_considerations?: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getTripOptions(req: TripRequest): Promise<TripOptionsResponse> {
    try {
        const res = await axios.post<TripOptionsResponse>(
            `${BASE}/api/trip/options`,
            req,
            { headers: H, timeout: 60000 }
        );
        return res.data;
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            const msg = error.response?.data?.detail || error.message || 'Failed to fetch trip options';
            throw new Error(msg);
        }
        throw error;
    }
}

export async function generateTripItinerary(req: SelectionRequest): Promise<TripItineraryResponse> {
    try {
        const res = await axios.post<TripItineraryResponse>(
            `${BASE}/api/trip/itinerary`,
            req,
            { headers: H, timeout: 90000 }
        );
        return res.data;
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            const msg = error.response?.data?.detail || error.message || 'Failed to generate itinerary';
            throw new Error(msg);
        }
        throw error;
    }
}
