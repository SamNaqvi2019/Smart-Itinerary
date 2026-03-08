/**
 * Serper API – reviews and search (events/festivals).
 * Use EXPO_PUBLIC_SERPER_API_KEY in app config; fallback for dev only.
 */
import axios from 'axios';

const SERPER_BASE = 'https://google.serper.dev';
const API_KEY = process.env.EXPO_PUBLIC_SERPER_API_KEY || '9bda64eb7b539376dc35ed611d101cf5d62ec465';

const headers = {
  'X-API-KEY': API_KEY,
  'Content-Type': 'application/json',
};

export interface SerperReviewSnippet {
  title?: string;
  snippet?: string;
  link?: string;
  rating?: number;
  date?: string;
}

export interface SerperReviewsResult {
  reviews?: SerperReviewSnippet[];
  place?: { name?: string; rating?: number; reviewsCount?: number };
  error?: string;
}

export interface SerperSearchResult {
  organic?: Array<{ title: string; link: string; snippet: string; date?: string }>;
  knowledgeGraph?: { title?: string; description?: string };
  error?: string;
}

/**
 * Fetch review snippets for a place/destination.
 * Tries /reviews first; falls back to /search with "reviews [place]" for snippets.
 * Gracefully returns empty array on failure or no data.
 */
export async function fetchReviewsForPlace(placeName: string, destinationCity?: string): Promise<SerperReviewsResult> {
  const query = destinationCity
    ? `reviews ${placeName} ${destinationCity} Pakistan`
    : `reviews ${placeName} Pakistan`;
  try {
    const res = await axios.post<SerperReviewsResult & { organic?: Array<{ title: string; snippet: string; link?: string }> }>(
      `${SERPER_BASE}/reviews`,
      { query },
      { headers, timeout: 10000 }
    );
    const data = res.data;
    if (data?.reviews && Array.isArray(data.reviews)) return data;
    if (data?.place) return data;
    if (data?.organic && data.organic.length > 0) {
      return {
        reviews: data.organic.slice(0, 6).map((o) => ({ title: o.title, snippet: o.snippet, link: o.link })),
      };
    }
    return { reviews: [] };
  } catch {
    try {
      const searchRes = await axios.post<{ organic?: Array<{ title: string; snippet: string; link?: string }> }>(
        `${SERPER_BASE}/search`,
        { q: query, num: 6 },
        { headers, timeout: 10000 }
      );
      const organic = searchRes.data?.organic;
      if (organic?.length) {
        return {
          reviews: organic.map((o) => ({ title: o.title, snippet: o.snippet, link: o.link })),
        };
      }
    } catch {
      // ignore fallback failure
    }
    return { reviews: [] };
  }
}

/**
 * Search for events/festivals near a destination city.
 * Gracefully returns empty array on failure or no data.
 */
/** Parse date from snippet/title or ISO string; return null if not parseable. */
function parseEventDate(item: { date?: string; snippet?: string; title?: string }): Date | null {
  if (item.date) {
    const d = new Date(item.date);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const text = [item.snippet, item.title].filter(Boolean).join(' ');
  const isoMatch = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) return new Date(isoMatch[0]);
  const dmyMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
  if (dmyMatch) return new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
  const monthMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s*(20\d{2})?\b/i);
  if (monthMatch) {
    const y = monthMatch[3] ? Number(monthMatch[3]) : new Date().getFullYear();
    const m = new Date(monthMatch[1] + ' 1, ' + y).getMonth();
    const day = Number(monthMatch[2]);
    if (!Number.isNaN(m) && !Number.isNaN(day)) return new Date(y, m, day);
  }
  return null;
}

/** Filter organic results to only include events that haven't passed (today or future). */
export function filterEventsToUpcomingOnly(organic: SerperSearchResult['organic'], todayStart: Date = new Date()): SerperSearchResult['organic'] {
  const start = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate());
  if (!organic?.length) return organic ?? [];
  return organic.filter((item) => {
    const d = parseEventDate(item);
    if (!d) return true;
    const itemStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return itemStart >= start;
  });
}

export async function fetchEventsAndFestivals(destinationCity: string): Promise<SerperSearchResult> {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  const q = `festival events ${destinationCity} Pakistan ${y} today ${m}/${d}`;
  try {
    const res = await axios.post<{ organic?: SerperSearchResult['organic']; knowledgeGraph?: SerperSearchResult['knowledgeGraph'] }>(
      `${SERPER_BASE}/search`,
      { q, num: 10 },
      { headers, timeout: 10000 }
    );
    const data = res.data;
    if (data?.organic && Array.isArray(data.organic)) return { organic: data.organic, knowledgeGraph: data.knowledgeGraph };
    return { organic: [] };
  } catch (e) {
    return { organic: [], error: axios.isAxiosError(e) ? e.message : 'Failed to fetch events' };
  }
}
