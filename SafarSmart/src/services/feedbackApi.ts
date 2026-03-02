import axios from 'axios';
import { API_BASE_URL as BASE, API_HEADERS as H } from './apiConfig';

export interface FeedbackRequest {
  type: string;   // app | itinerary | fare_calculator
  rating: number;   // 1-5
  category?: string;
  comment?: string;
  tags?: string[];
  user_name?: string;
  user_email?: string;
}

export interface FeedbackSubmitResponse {
  success: boolean;
  feedback_id: string;
  message: string;
}

export interface FeedbackSummary {
  total: number;
  average_rating: number;
  rating_dist: Record<string, number>;
  by_type: Record<string, number>;
  by_category: Record<string, number>;
  recent_comments: string[];
}

export async function submitFeedback(req: FeedbackRequest): Promise<FeedbackSubmitResponse> {
  const res = await axios.post<FeedbackSubmitResponse>(`${BASE}/feedback/submit`, req, { headers: H, timeout: 10000 });
  return res.data;
}

export async function getFeedbackSummary(): Promise<FeedbackSummary> {
  const res = await axios.get<FeedbackSummary>(`${BASE}/feedback/summary`, { headers: H, timeout: 10000 });
  return res.data;
}
