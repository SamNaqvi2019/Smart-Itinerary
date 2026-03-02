/**
 * Summarizes itinerary JSON to minimize token usage for chatbot context
 * Strips unnecessary fields like images, extensive descriptions, metadata
 * Keeps only core structure: Day, City, Activity Name, Time
 */

import { ItineraryResponse } from '../services/api';

export interface SummarizedItinerary {
  destination_city: string;
  departure_city?: string;
  num_days: number;
  travel_window?: string;
  total_estimated_cost: number;
  currency: string;
  days: Array<{
    day: number;
    places: string[];
    date?: string;
  }>;
  budget_breakdown?: Record<string, number>;
  recommended_hotels?: string[];
}

export function summarizeItineraryForContext(
  fullItinerary: ItineraryResponse & { destination_city?: string; departure_city?: string }
): SummarizedItinerary {
  const summarized: SummarizedItinerary = {
    destination_city: fullItinerary.destination_city || 'Unknown',
    num_days: fullItinerary.days?.length || 0,
    total_estimated_cost: fullItinerary.total_estimated_cost || 0,
    currency: fullItinerary.currency || 'PKR',
    days: [],
  };

  // Add optional fields if they exist
  if (fullItinerary.departure_city) {
    summarized.departure_city = fullItinerary.departure_city;
  }

  if (fullItinerary.travel_window) {
    summarized.travel_window = fullItinerary.travel_window;
  }

  if (fullItinerary.budget_breakdown) {
    summarized.budget_breakdown = fullItinerary.budget_breakdown;
  }

  if (fullItinerary.recommended_hotels) {
    summarized.recommended_hotels = fullItinerary.recommended_hotels;
  }

  // Summarize days - only keep essential info
  if (fullItinerary.days) {
    summarized.days = fullItinerary.days.map((day) => ({
      day: day.day,
      places: day.places || [],
      date: day.date,
      // Explicitly exclude: description, images
    }));
  }

  return summarized;
}

