// Real API service for ReviewRoute MLOps Platform

const BASE_URL = import.meta.env.VITE_API_URL || "https://reviewroute-backend.onrender.com";
const API_KEY = import.meta.env.VITE_API_KEY || "";

const getHeaders = (headers: Record<string, string> = {}) => {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (API_KEY) {
    baseHeaders["X-API-Key"] = API_KEY;
  }
  return baseHeaders;
};

export type InferRequest = {
  review_title: string;
  review_body: string;
  product_category: string;
  language: string | null;
};

export type InferResponse = {
  predicted_stars: number;
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  model_used: string;
  base_model_used?: string;
  resolved_language: string;
  language_was_detected: boolean;
  queued_for_review: boolean;
  review_reasons: string[];
};

export type QueueSubmission = {
  review_id: string;
  human_stars: number;
  reviewer_id: string;
  notes: string;
};

export type DriftRunParams = {
  lookback_hours: number;
  baseline_days: number;
  min_samples?: number;
};

export type DriftMetric = {
  metric_name: string;
  metric_value: number;
  warn_threshold: number;
  threshold: number;
  status: string;
  baseline_count: number;
  current_count: number;
};

export type DriftRunResult = {
  status: string;
  baseline_count: number;
  current_count: number;
  window_start: string;
  window_end: string;
  metrics: DriftMetric[];
  message: string;
};

// --- Public API ----------------------------------------------------------

export async function checkHealth(): Promise<{ status: string; hf_status?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/health`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) {
      return { status: "error" };
    }
    return res.json();
  } catch (err) {
    return { status: "unreachable" };
  }
}

export async function runInference(req: InferRequest): Promise<InferResponse> {
  const res = await fetch(`${BASE_URL}/predict`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const detail = errorBody.detail;
    const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? JSON.stringify(detail) : res.statusText);
    throw new Error(msg || `API Error: ${res.statusText}`);
  }
  return res.json();
}

export async function submitQueueReview(payload: QueueSubmission): Promise<{ ok: boolean; message: string }> {
  const reqBody = {
    human_stars: payload.human_stars,
    reviewer_id: payload.reviewer_id,
    notes: payload.notes,
  };
  const res = await fetch(`${BASE_URL}/human-review/${payload.review_id}/label`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(reqBody),
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.statusText}`);
  }
  const data = await res.json();
  return { ok: true, message: `Review resolved successfully with status: ${data.status}` };
}

export async function getQueueItems(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/human-review/queue?status=pending`, {
    headers: getHeaders()
  });
  if (!res.ok) {
    if (res.status === 404 || res.status === 500 || res.status === 503) {
      return [];
    }
    throw new Error(`API Error: ${res.statusText}`);
  }
  return res.json();
}

export async function runDriftAnalysis(params: DriftRunParams): Promise<DriftRunResult> {
  // Pass query params for the GET/POST request (FastAPI uses Query parameters for this endpoint)
  const query = new URLSearchParams();
  query.append("lookback_hours", params.lookback_hours.toString());
  query.append("baseline_days", params.baseline_days.toString());
  if (params.min_samples) {
    query.append("min_samples", params.min_samples.toString());
  }

  const res = await fetch(`${BASE_URL}/drift/run?${query.toString()}`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.statusText}`);
  }
  return res.json();
}

export async function getLatestDrift(): Promise<DriftMetric[]> {
  const res = await fetch(`${BASE_URL}/drift/latest`, {
    headers: getHeaders()
  });
  if (!res.ok) {
    if (res.status === 404 || res.status === 500 || res.status === 503) {
      return [];
    }
    throw new Error(`API Error: ${res.statusText}`);
  }
  return res.json();
}
