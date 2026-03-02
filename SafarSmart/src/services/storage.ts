import AsyncStorage from '@react-native-async-storage/async-storage';
import { ItineraryResponse } from './api';

const STORAGE_KEYS = {
  ITINERARIES: '@safarsmart:itineraries',
  CURRENT_ITINERARY: '@safarsmart:current_itinerary',
};

export interface ItineraryFeedback {
  rating: number;       // 1–5
  comment: string;
  submittedAt: string;
}

export interface SavedItinerary {
  id: string;
  createdAt: string;
  request: any;
  response: ItineraryResponse;
  feedback?: ItineraryFeedback;
}

/**
 * Save an itinerary to local storage
 */
export async function saveItinerary(
  request: any,
  response: ItineraryResponse
): Promise<SavedItinerary> {
  const itinerary: SavedItinerary = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    request,
    response,
  };

  try {
    const existing = await getSavedItineraries();
    const updated = [itinerary, ...existing];
    await AsyncStorage.setItem(STORAGE_KEYS.ITINERARIES, JSON.stringify(updated));
    return itinerary;
  } catch (error) {
    console.error('Failed to save itinerary:', error);
    throw error;
  }
}

/**
 * Get all saved itineraries
 */
export async function getSavedItineraries(): Promise<SavedItinerary[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ITINERARIES);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load itineraries:', error);
    return [];
  }
}

/**
 * Get a single itinerary by ID
 */
export async function getItineraryById(id: string): Promise<SavedItinerary | null> {
  try {
    const itineraries = await getSavedItineraries();
    return itineraries.find((it) => it.id === id) || null;
  } catch (error) {
    console.error('Failed to get itinerary:', error);
    return null;
  }
}

/**
 * Delete an itinerary
 */
export async function deleteItinerary(id: string): Promise<void> {
  try {
    const itineraries = await getSavedItineraries();
    const updated = itineraries.filter((it) => it.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.ITINERARIES, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to delete itinerary:', error);
    throw error;
  }
}

/**
 * Save feedback for an itinerary
 */
export async function saveFeedback(
  id: string,
  rating: number,
  comment: string
): Promise<void> {
  try {
    const itineraries = await getSavedItineraries();
    const updated = itineraries.map((it) =>
      it.id === id
        ? { ...it, feedback: { rating, comment, submittedAt: new Date().toISOString() } }
        : it
    );
    await AsyncStorage.setItem(STORAGE_KEYS.ITINERARIES, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save feedback:', error);
    throw error;
  }
}

/**
 * Clear all saved itineraries
 */
export async function clearAllItineraries(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ITINERARIES);
  } catch (error) {
    console.error('Failed to clear itineraries:', error);
    throw error;
  }
}

// ── Cost rates (must match backend itinerary.py) ──────────────────────────────
const _FOOD:     Record<string, number> = { low: 1050,  medium: 3100,  high: 6900  };
const _ACTIVITY: Record<string, number> = { low: 300,   medium: 3300,  high: 8100  };
const _HOTEL:    Record<string, number> = { low: 2250,  medium: 8750,  high: 31500 };

function _recalcCost(req: any, numDays: number): number {
  if (req?.budget_amount) return req.budget_amount;
  const budget  = (req?.budget_level || 'medium').toLowerCase();
  const b       = _FOOD[budget] ? budget : 'medium';
  const people  = req?.num_of_people || 1;
  const rooms   = Math.ceil(people / 2);
  const subtotal = (_FOOD[b] * numDays * people) +
                   (_ACTIVITY[b] * numDays * people) +
                   (_HOTEL[b] * numDays * rooms);
  return Math.round(subtotal * 1.10);
}

/**
 * One-time migration: recalculate total_estimated_cost for all saved
 * itineraries that still have the old flat-rate 30,000 PKR value.
 */
export async function migrateLegacyCosts(): Promise<void> {
  try {
    const itineraries = await getSavedItineraries();
    let changed = false;
    const updated = itineraries.map((it) => {
      const numDays = it.response?.days?.length || it.request?.num_days || 3;
      const newCost = _recalcCost(it.request, numDays);
      if (it.response && it.response.total_estimated_cost !== newCost) {
        changed = true;
        return {
          ...it,
          response: { ...it.response, total_estimated_cost: newCost },
        };
      }
      return it;
    });
    if (changed) {
      await AsyncStorage.setItem(STORAGE_KEYS.ITINERARIES, JSON.stringify(updated));
      console.log('[Storage] Migrated legacy costs for saved itineraries');
    }
  } catch (error) {
    console.error('Failed to migrate legacy costs:', error);
  }
}

