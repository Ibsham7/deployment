import { Star, AlertTriangle, Globe, ArrowRight, Cpu, Hash, ArrowLeft } from "lucide-react";
import { GlassCard, PageHeader } from "./ui-bits";
import { SimulatorRequest } from "./SimulatorView";

export type InferenceResult = {
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

const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  ja: "Japanese",
  zh: "Chinese",
};

const getLanguageName = (code: string) => LANG_NAMES[code.toLowerCase()] || code.toUpperCase();

export function ResultsView({ result, request, onBack }: { result: InferenceResult; request: SimulatorRequest; onBack: () => void }) {
  const sentimentConfig = {
    positive: { bg: "rgba(5,150,105,0.12)", border: "rgba(5,150,105,0.3)", text: "#34D399" },
    negative: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#FCA5A5" },
    neutral: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#FCD34D" },
  }[result.sentiment];

  return (
    <div>
      <PageHeader
        eyebrow="02 · Explainability"
        title="Inference Results"
        subtitle="A breakdown of the routing engine's decision path and prediction confidence for the submitted review."
        actions={
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] transition-colors"
            style={{ border: "1px solid #374151", color: "#9CA3AF", backgroundColor: "#1F2937" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#374151"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1F2937"; }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Run another
          </button>
        }
      />

      {result.queued_for_review && (
        <div
          className="mb-6 p-4 rounded-2xl flex items-center gap-3"
          style={{ border: "1px solid rgba(245,158,11,0.3)", backgroundColor: "rgba(245,158,11,0.08)" }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(245,158,11,0.15)" }}>
            <AlertTriangle className="w-4 h-4" style={{ color: "#FCD34D" }} />
          </div>
          <div className="flex-1">
            <div style={{ fontWeight: 500, color: "#FDE68A" }}>Flagged for Human Review</div>
            <div className="text-[12.5px]" style={{ color: "rgba(253,230,138,0.6)" }}>Confidence dipped below the gate threshold — this review has been added to the moderator queue.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-5 md:p-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-7">
            <div>
              <div className="text-[11px] tracking-wide uppercase mb-3" style={{ color: "#9CA3AF" }}>Predicted Rating</div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className="w-7 h-7"
                    style={{ color: i <= result.predicted_stars ? "#FBBF24" : "#374151", fill: i <= result.predicted_stars ? "#FBBF24" : "transparent" }}
                    strokeWidth={1.5}
                  />
                ))}
                <span className="ml-3 text-[22px]" style={{ fontWeight: 500, color: "#F9FAFB" }}>{result.predicted_stars}.0</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] tracking-wide uppercase mb-3" style={{ color: "#9CA3AF" }}>Sentiment</div>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ backgroundColor: sentimentConfig.bg, border: `1px solid ${sentimentConfig.border}` }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sentimentConfig.text }} />
                <span className="capitalize" style={{ fontWeight: 500, color: sentimentConfig.text }}>{result.sentiment}</span>
              </div>
            </div>
          </div>

          <div className="pt-6" style={{ borderTop: "1px solid #374151" }}>
            <div className="text-[11px] tracking-wide uppercase mb-3" style={{ color: "#9CA3AF" }}>Submitted Review</div>
            {request.review_title && (
              <div className="mb-2" style={{ fontWeight: 500, color: "#F9FAFB" }}>{request.review_title}</div>
            )}
            <p className="leading-relaxed text-[14px]" style={{ color: "#D1D5DB" }}>{request.review_body}</p>
            <div className="flex gap-2 mt-4">
              <InlineTag color="green">{request.product_category}</InlineTag>
              <InlineTag icon={<Globe className="w-3 h-3" />} color="gray">
                {getLanguageName(result.resolved_language)}
                {result.language_was_detected && " · auto-detected"}
              </InlineTag>
            </div>
          </div>

          <div className="pt-6 mt-6" style={{ borderTop: "1px solid #374151" }}>
            <div className="text-[11px] tracking-wide uppercase mb-3" style={{ color: "#9CA3AF" }}>Decision Reasons</div>
            <div className="flex flex-wrap gap-2">
              {result.review_reasons.length === 0 && result.model_used !== "model_c" && (
                <span className="text-[12.5px]" style={{ color: "#6B7280" }}>No special routing flags — standard path.</span>
              )}
              {result.model_used === "model_c" && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-mono"
                  style={{ backgroundColor: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#818CF8" }}
                >
                  <Hash className="w-3 h-3" />supported_category
                </span>
              )}
              {result.review_reasons.map(r => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-mono"
                  style={{ backgroundColor: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)", color: "#34D399" }}
                >
                  <Hash className="w-3 h-3" />{r}
                </span>
              ))}
            </div>
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="text-[11px] tracking-wide uppercase mb-4" style={{ color: "#9CA3AF" }}>Confidence</div>
            <ConfidenceRing value={result.confidence} />
          </GlassCard>

          <GlassCard className="p-6">
            <div className="text-[11px] tracking-wide uppercase mb-4" style={{ color: "#9CA3AF" }}>Routing</div>
            <div className="space-y-4">
              <RoutingRow 
                icon={<Cpu className="w-4 h-4" style={{ color: "#059669" }} />} 
                label="Model Used" 
                value={result.model_used === "model_c" 
                  ? `Model C (Stacking Ensemble + ${result.base_model_used || 'Model A/B'})` 
                  : result.model_used.toUpperCase().replace('_', ' ')} 
                mono 
              />
              <RoutingRow
                icon={<Globe className="w-4 h-4" style={{ color: "#059669" }} />}
                label="Language Used"
                value={result.language_was_detected 
                  ? `${getLanguageName(result.resolved_language)} (Auto-detected)` 
                  : `${getLanguageName(result.resolved_language)} (Specified)`}
              />
              <RoutingRow
                icon={<ArrowRight className="w-4 h-4" style={{ color: result.queued_for_review ? "#FBBF24" : "#059669" }} />}
                label="Next Step"
                value={result.queued_for_review ? "Human moderator queue" : "Returned to caller"}
              />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function RoutingRow({ icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex-1">
        <div className="text-[11px]" style={{ color: "#9CA3AF" }}>{label}</div>
        <div className={`text-[13px] ${mono ? "font-mono" : ""}`} style={{ fontWeight: 500, color: "#F9FAFB" }}>{value}</div>
      </div>
    </div>
  );
}

function InlineTag({ children, icon, color }: { children: any; icon?: any; color: "green" | "gray" }) {
  if (color === "green") {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px]"
        style={{ backgroundColor: "rgba(5,150,105,0.12)", border: "1px solid rgba(5,150,105,0.25)", color: "#34D399" }}
      >
        {icon}{children}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px]"
      style={{ backgroundColor: "#111827", border: "1px solid #374151", color: "#9CA3AF" }}
    >
      {icon}{children}
    </span>
  );
}

function ConfidenceRing({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value);
  const color = pct >= 80 ? "#059669" : pct >= 65 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="148" height="148" viewBox="0 0 148 148">
          <defs>
            <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <circle cx="74" cy="74" r={r} stroke="#374151" strokeWidth="8" fill="none" />
          <circle
            cx="74" cy="74" r={r}
            stroke="url(#ring)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 74 74)"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="tracking-tight" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1, color: "#F9FAFB" }}>{pct}%</div>
          <div className="text-[10.5px] uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Confidence</div>
        </div>
      </div>
      <div className="mt-3 text-[12px] text-center" style={{ color: "#9CA3AF" }}>
        {pct >= 80 ? "High — auto-published" : pct >= 65 ? "Borderline — sampled" : "Low — escalated"}
      </div>
    </div>
  );
}
