// Mock API service for ReviewRoute MLOps Platform
// Replace BASE_URL and implement real fetch calls against your backend

const BASE_URL = "https://api.reviewroute.internal/v1"; // TODO: replace with real endpoint

export type InferRequest = {
  review_title: string;
  review_body: string;
  product_category: string;
  language: string;
};

export type InferResponse = {
  predicted_stars: number;
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  model_used: string;
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
};

export type DriftMetric = {
  metric_name: string;
  metric_value: number;
  warn_threshold: number;
  alert_threshold: number;
  trend: { ts: string; value: number }[];
  delta: number;
};

export type DriftRunResult = {
  run_id: string;
  started_at: string;
  window: string;
  metrics: DriftMetric[];
};

// --- Mock helpers --------------------------------------------------------

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function mockInfer(req: InferRequest): InferResponse {
  const txt = (req.review_title + " " + req.review_body).toLowerCase();
  const negative = /(bad|terrible|broke|rompió|failed|disappoint|décev|schlecht)/.test(txt);
  const positive = /(love|great|incredible|recommend|recommande|amazing|excelente)/.test(txt);
  const stars = negative ? 2 : positive ? 5 : 3;
  const sentiment: InferResponse["sentiment"] = negative ? "negative" : positive ? "positive" : "neutral";
  const conf = negative || positive ? 0.87 + Math.random() * 0.08 : 0.58 + Math.random() * 0.12;
  const detected = req.language === "auto-detect";
  const lowConf = conf < 0.7;
  const reasons: string[] = [];
  if (lowConf) reasons.push("low_confidence");
  if (Math.random() < 0.25) reasons.push("random_audit");
  if (detected) reasons.push("language_inferred");
  if (lowConf) reasons.push("escalated_path");
  const model =
    req.language === "fr"
      ? "model_a_fr"
      : lowConf
      ? "model_b_escalated"
      : "model_c_stacking";
  return {
    predicted_stars: stars,
    sentiment,
    confidence: Math.round(conf * 100) / 100,
    model_used: model,
    language_was_detected: detected,
    queued_for_review: lowConf,
    review_reasons: reasons,
  };
}

function makeTrend(base: number, length = 12): { ts: string; value: number }[] {
  const now = Date.now();
  return Array.from({ length }, (_, i) => {
    const ts = new Date(now - (length - 1 - i) * 2 * 3600 * 1000)
      .toISOString()
      .slice(11, 16);
    const noise = (Math.random() - 0.4) * base * 0.25;
    return { ts, value: Math.max(0, parseFloat((base + noise * (i / length)).toFixed(3))) };
  });
}

function mockDriftRun(params: DriftRunParams): DriftRunResult {
  const id = `drift_${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    run_id: id,
    started_at: new Date().toISOString(),
    window: `${params.lookback_hours}h / ${params.baseline_days}d`,
    metrics: [
      {
        metric_name: "Confidence PSI",
        metric_value: parseFloat((0.13 + Math.random() * 0.04).toFixed(3)),
        warn_threshold: 0.1,
        alert_threshold: 0.25,
        trend: makeTrend(0.13),
        delta: parseFloat((Math.random() * 0.06 - 0.01).toFixed(3)),
      },
      {
        metric_name: "Language Divergence",
        metric_value: parseFloat((0.03 + Math.random() * 0.04).toFixed(3)),
        warn_threshold: 0.08,
        alert_threshold: 0.15,
        trend: makeTrend(0.04),
        delta: parseFloat((Math.random() * 0.02 - 0.01).toFixed(3)),
      },
      {
        metric_name: "Route Mix Shift",
        metric_value: parseFloat((0.18 + Math.random() * 0.05).toFixed(3)),
        warn_threshold: 0.1,
        alert_threshold: 0.2,
        trend: makeTrend(0.18),
        delta: parseFloat((Math.random() * 0.08 - 0.02).toFixed(3)),
      },
    ],
  };
}

// --- Public API ----------------------------------------------------------

export async function runInference(req: InferRequest): Promise<InferResponse> {
  // TODO: Replace with real fetch:
  // const res = await fetch(`${BASE_URL}/inference`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
  // return res.json();
  await delay(900 + Math.random() * 400);
  return mockInfer(req);
}

export async function submitQueueReview(payload: QueueSubmission): Promise<{ ok: boolean; message: string }> {
  // TODO: Replace with real fetch:
  // const res = await fetch(`${BASE_URL}/queue/${payload.review_id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  // return res.json();
  await delay(600 + Math.random() * 300);
  return { ok: true, message: `Review ${payload.review_id} resolved successfully.` };
}

export async function runDriftAnalysis(params: DriftRunParams): Promise<DriftRunResult> {
  // TODO: Replace with real fetch:
  // const res = await fetch(`${BASE_URL}/drift/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });
  // return res.json();
  await delay(1200 + Math.random() * 400);
  return mockDriftRun(params);
}
