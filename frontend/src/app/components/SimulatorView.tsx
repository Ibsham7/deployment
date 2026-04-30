import { useState } from "react";
import { ChevronDown, Play, Loader2, Layers } from "lucide-react";
import { GlassCard, Label, fieldClass, PageHeader } from "./ui-bits";
import { runInference } from "../lib/api";
import type { InferResponse } from "../lib/api";
import type { InferenceResult } from "./ResultsView";

export type SimulatorRequest = {
  review_title: string;
  review_body: string;
  product_category: string;
  language: string | null;
};

const CATEGORIES = ["electronics", "apparel", "book", "kitchen", "other"];
const LANGUAGES = [
  { v: "auto-detect", l: "Auto-detect" },
  { v: "en", l: "English" },
  { v: "es", l: "Spanish" },
  { v: "fr", l: "French" },
  { v: "de", l: "German" },
  { v: "ja", l: "Japanese" },
  { v: "zh", l: "Chinese" },
];

const SAMPLES = [
  { title: "Crystal clear sound", body: "These earbuds are incredible. Battery lasts all day and the noise canceling rivals my old over-ears.", cat: "electronics", lang: "en" },
  { title: "Se rompió en una semana", body: "La cremallera falló a los pocos días. Decepcionante por el precio.", cat: "apparel", lang: "es" },
  { title: "", body: "Lecture passionnante, je recommande vivement à tous les amateurs du genre.", cat: "book", lang: "auto-detect" },
];

export function SimulatorView({ onResult }: { onResult: (req: SimulatorRequest, res: InferenceResult) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("electronics");
  const [language, setLanguage] = useState("auto-detect");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!body.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const apiLang = language === "auto-detect" ? null : language;
      const req: SimulatorRequest = { 
        review_title: title, 
        review_body: body, 
        product_category: category, 
        language: apiLang 
      };
      const res: InferResponse = await runInference(req);
      
      // Supported languages: English, Spanish, French, German, Japanese, Chinese
      const supported = ["en", "es", "fr", "de", "ja", "zh"];
      const detected = res.resolved_language || "";
      
      if (detected && !supported.includes(detected)) {
        setError(`Language "${detected}" is not officially supported. Results may be unreliable.`);
      }

      onResult(req, res as InferenceResult);
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.message || "Inference failed. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setRunning(false);
    }
  };

  const loadSample = (s: typeof SAMPLES[number]) => {
    setTitle(s.title);
    setBody(s.body);
    setCategory(s.cat);
    setLanguage(s.lang);
  };

  return (
    <div>
      <PageHeader
        eyebrow="01 · Tester"
        title="Review Simulator"
        subtitle="Submit a synthetic review to observe how the routing engine selects a model, scores confidence, and decides whether to escalate for human review."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-7">
          <div className="space-y-6">
            {error && (
              <div className="p-3 rounded-xl text-[13px]" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5" }}>
                {error}
              </div>
            )}

            <div>
              <Label>Review Title</Label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional — short summary of the review"
                className={fieldClass()}
              />
            </div>

            <div>
              <Label required>Review Body</Label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={7}
                placeholder="Paste or write the full body of the customer review here..."
                className={fieldClass("resize-none leading-relaxed")}
              />
              <div className="mt-2 flex justify-between text-[11px]" style={{ color: "#6B7280" }}>
                <span>Multi-line · Required</span>
                <span>{body.length} chars</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Product Category" value={category} onChange={setCategory} options={CATEGORIES.map(c => ({ v: c, l: c[0].toUpperCase() + c.slice(1) }))} />
              <SelectField label="Language" value={language} onChange={setLanguage} options={LANGUAGES} />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={submit}
                disabled={running || !body.trim()}
                className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: running ? "#047857" : "#059669",
                  color: "white",
                  fontWeight: 600,
                  boxShadow: "0 4px 14px rgba(5,150,105,0.35)",
                }}
                onMouseEnter={e => { if (!running) (e.currentTarget as HTMLElement).style.backgroundColor = "#047857"; }}
                onMouseLeave={e => { if (!running) (e.currentTarget as HTMLElement).style.backgroundColor = "#059669"; }}
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" fill="currentColor" />}
                {running ? "Running inference..." : "Run AI Inference"}
              </button>
              <span className="text-[12px]" style={{ color: "#6B7280" }}>Avg latency · 240ms</span>
            </div>
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4" style={{ color: "#059669" }} />
              <span className="text-[12px] tracking-wide uppercase" style={{ color: "#9CA3AF", fontWeight: 500 }}>Quick Samples</span>
            </div>
            <div className="space-y-2">
              {SAMPLES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => loadSample(s)}
                  className="w-full text-left p-3 rounded-xl transition-all"
                  style={{ backgroundColor: "#111827", border: "1px solid #374151" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#059669"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#374151"; }}
                >
                  <div className="text-[12px] line-clamp-1" style={{ fontWeight: 500, color: "#F9FAFB" }}>
                    {s.title || s.body.slice(0, 30)}
                  </div>
                  <div className="text-[11px] line-clamp-1 mt-0.5" style={{ color: "#9CA3AF" }}>{s.body}</div>
                  <div className="flex gap-1.5 mt-2">
                    <Tag color="green">{s.cat}</Tag>
                    <Tag color="gray">{s.lang}</Tag>
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="text-[12px] tracking-wide uppercase mb-4" style={{ color: "#9CA3AF", fontWeight: 500 }}>Routing Pipeline</div>
            <ol className="space-y-2.5 text-[12.5px]">
              {["Language detection", "Category embedding", "Primary model inference", "Confidence gating", "Escalation logic"].map((step, i) => (
                <li key={i} className="flex items-center gap-3" style={{ color: "#9CA3AF" }}>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                    style={{ backgroundColor: "#111827", border: "1px solid #374151", color: "#6B7280" }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function Tag({ children, color }: { children: any; color: "green" | "gray" }) {
  if (color === "green") {
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded"
        style={{ backgroundColor: "rgba(5,150,105,0.15)", color: "#34D399", border: "1px solid rgba(5,150,105,0.3)" }}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded"
      style={{ backgroundColor: "#111827", color: "#9CA3AF", border: "1px solid #374151" }}
    >
      {children}
    </span>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass("appearance-none pr-10 cursor-pointer")}
          style={{ backgroundColor: "#111827" }}
        >
          {options.map(o => <option key={o.v} value={o.v} style={{ backgroundColor: "#1F2937" }}>{o.l}</option>)}
        </select>
        <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#6B7280" }} />
      </div>
    </div>
  );
}
