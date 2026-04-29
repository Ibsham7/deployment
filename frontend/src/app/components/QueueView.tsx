import { useState } from "react";
import { Star, X, Check, Inbox, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard, PageHeader, Label, fieldClass, Skeleton } from "./ui-bits";
import { submitQueueReview } from "../lib/api";

type QueueItem = {
  id: string;
  date: string;
  priority: 1 | 2 | 3;
  predicted_stars: number;
  confidence: number;
  reasons: string[];
  body: string;
  title: string;
  category: string;
  model: string;
};

const SEED: QueueItem[] = [
  { id: "rv_8a21", date: "2026-04-29 09:14", priority: 1, predicted_stars: 2, confidence: 0.54, reasons: ["low_confidence", "escalated_path"], body: "The product arrived damaged and customer service has not responded to my emails. I am very disappointed with the quality.", title: "Damaged on arrival", category: "electronics", model: "model_b_escalated" },
  { id: "rv_7f02", date: "2026-04-29 08:52", priority: 1, predicted_stars: 3, confidence: 0.48, reasons: ["low_confidence", "language_inferred"], body: "Le tissu est doux mais la coupe est étrange. Je ne sais pas si je le garderais.", title: "Coupe étrange", category: "apparel", model: "model_a_fr" },
  { id: "rv_7e91", date: "2026-04-29 08:31", priority: 2, predicted_stars: 4, confidence: 0.62, reasons: ["random_audit"], body: "Pretty good knife set for the price. Handles feel a bit light but they cut well.", title: "Decent value", category: "kitchen", model: "model_c_stacking" },
  { id: "rv_6c44", date: "2026-04-29 07:58", priority: 2, predicted_stars: 3, confidence: 0.61, reasons: ["low_confidence"], body: "Interesting plot but the pacing was off in the middle chapters. Ending was satisfying though.", title: "Mixed feelings", category: "book", model: "model_c_stacking" },
  { id: "rv_5b12", date: "2026-04-29 07:11", priority: 3, predicted_stars: 5, confidence: 0.69, reasons: ["random_audit"], body: "Perfect, exactly as described. Fast shipping too.", title: "", category: "other", model: "model_c_stacking" },
  { id: "rv_4a08", date: "2026-04-29 06:42", priority: 3, predicted_stars: 1, confidence: 0.71, reasons: ["random_audit"], body: "No funcionó como se anunciaba, devolución solicitada.", title: "No funciona", category: "electronics", model: "model_a_es" },
];

const priorityConfig = {
  1: { label: "High", bg: "rgba(239,68,68,0.12)", text: "#FCA5A5", border: "rgba(239,68,68,0.3)" },
  2: { label: "Med", bg: "rgba(245,158,11,0.12)", text: "#FCD34D", border: "rgba(245,158,11,0.3)" },
  3: { label: "Low", bg: "rgba(5,150,105,0.12)", text: "#34D399", border: "rgba(5,150,105,0.3)" },
};

export function QueueView() {
  const [items, setItems] = useState(SEED);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [humanStars, setHumanStars] = useState(0);
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState<"all" | 1 | 2 | 3>("all");

  const filtered = filter === "all" ? items : items.filter(i => i.priority === filter);

  const open = (it: QueueItem) => {
    setSelected(it);
    setHumanStars(it.predicted_stars);
    setNotes("");
  };

  const submit = async () => {
    if (!selected || !humanStars) return;
    try {
      const result = await submitQueueReview({
        review_id: selected.id,
        human_stars: humanStars,
        reviewer_id: "reviewer_b.chen@reviewroute.io",
        notes,
      });
      if (result.ok) {
        setItems(prev => prev.filter(i => i.id !== selected.id));
        setSelected(null);
        toast.success("Ground truth submitted", {
          description: `${selected.id} resolved with ${humanStars}-star label.`,
        });
      }
    } catch {
      toast.error("Submission failed", {
        description: "Could not resolve the review. Please try again.",
      });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="03 · Admin Queue"
        title="Human Review Queue"
        subtitle="Predictions flagged for human verification. Submit ground-truth labels to refine the model and resolve queued items."
        actions={
          <div className="flex items-center gap-3">
            <StatBadge label="Pending" value={items.length} />
            <StatBadge label="High Pri" value={items.filter(i => i.priority === 1).length} accent />
          </div>
        }
      />

      <GlassCard className="p-2">
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #374151" }}>
          <Filter className="w-4 h-4" style={{ color: "#6B7280" }} />
          <span className="text-[12px]" style={{ color: "#9CA3AF" }}>Priority:</span>
          {(["all", 1, 2, 3] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className="px-3 py-1 rounded-lg text-[12px] transition-colors"
              style={
                filter === p
                  ? { backgroundColor: "#374151", color: "#F9FAFB", border: "1px solid #4B5563" }
                  : { color: "#9CA3AF", border: "1px solid transparent" }
              }
            >
              {p === "all" ? "All" : priorityConfig[p].label}
            </button>
          ))}
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
              <th className="px-5 py-3" style={{ fontWeight: 500 }}>Date</th>
              <th className="px-3 py-3" style={{ fontWeight: 500 }}>Priority</th>
              <th className="px-3 py-3" style={{ fontWeight: 500 }}>Predicted</th>
              <th className="px-3 py-3" style={{ fontWeight: 500 }}>Confidence</th>
              <th className="px-3 py-3" style={{ fontWeight: 500 }}>Reasons</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => (
              <tr
                key={it.id}
                onClick={() => open(it)}
                className="group cursor-pointer transition-colors"
                style={{
                  borderTop: "1px solid #374151",
                  backgroundColor: selected?.id === it.id ? "rgba(5,150,105,0.06)" : "transparent",
                }}
                onMouseEnter={e => {
                  if (selected?.id !== it.id) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.02)";
                }}
                onMouseLeave={e => {
                  if (selected?.id !== it.id) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <td className="px-5 py-4 text-[12.5px] font-mono" style={{ color: "#D1D5DB" }}>{it.date}</td>
                <td className="px-3 py-4">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px]"
                    style={{
                      backgroundColor: priorityConfig[it.priority].bg,
                      color: priorityConfig[it.priority].text,
                      border: `1px solid ${priorityConfig[it.priority].border}`,
                      fontWeight: 500,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "currentColor" }} />
                    {priorityConfig[it.priority].label}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <Star
                        key={n}
                        className="w-3.5 h-3.5"
                        style={{ color: n <= it.predicted_stars ? "#FBBF24" : "#374151", fill: n <= it.predicted_stars ? "#FBBF24" : "transparent" }}
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-4">
                  <ConfidenceBar v={it.confidence} />
                </td>
                <td className="px-3 py-4">
                  <div className="flex flex-wrap gap-1">
                    {it.reasons.map(r => (
                      <span
                        key={r}
                        className="text-[10.5px] px-1.5 py-0.5 rounded font-mono"
                        style={{ backgroundColor: "#111827", border: "1px solid #374151", color: "#9CA3AF" }}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-4 text-right pr-5">
                  <span
                    className="text-[12px] transition-colors"
                    style={{ color: selected?.id === it.id ? "#059669" : "#6B7280" }}
                  >
                    Review →
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Inbox className="w-8 h-8 mx-auto mb-3" style={{ color: "#374151" }} />
                  <div className="text-[13px]" style={{ color: "#6B7280" }}>Queue is clear. Nice work.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {filtered.length > 0 && filtered.length < 3 && (
          <div className="px-5 py-4 space-y-2" style={{ borderTop: "1px solid #374151" }}>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        )}
      </GlassCard>

      {selected && (
        <ReviewPanel
          item={selected}
          stars={humanStars}
          setStars={setHumanStars}
          notes={notes}
          setNotes={setNotes}
          onClose={() => setSelected(null)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function StatBadge({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className="px-4 py-2 rounded-xl"
      style={{ backgroundColor: "#111827", border: "1px solid #374151" }}
    >
      <div className="text-[10.5px] uppercase tracking-wider" style={{ color: "#9CA3AF" }}>{label}</div>
      <div
        className="text-[20px] tracking-tight"
        style={{ fontWeight: 600, color: accent ? "#FCA5A5" : "#F9FAFB" }}
      >
        {value}
      </div>
    </div>
  );
}

function ConfidenceBar({ v }: { v: number }) {
  const pct = Math.round(v * 100);
  const color = pct >= 70 ? "#059669" : pct >= 55 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#374151" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[12px] tabular-nums w-10 text-right" style={{ color: "#9CA3AF" }}>{pct}%</span>
    </div>
  );
}

function ReviewPanel({ item, stars, setStars, notes, setNotes, onClose, onSubmit }: any) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit();
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div onClick={onClose} className="flex-1 bg-black/50 backdrop-blur-sm" />
      <div
        className="w-[480px] h-full overflow-y-auto"
        style={{ backgroundColor: "#1F2937", borderLeft: "1px solid #374151" }}
      >
        <div className="p-6 flex items-center justify-between" style={{ borderBottom: "1px solid #374151" }}>
          <div>
            <div className="text-[10.5px] tracking-wider uppercase" style={{ color: "#059669", fontWeight: 600 }}>Resolve Item</div>
            <div className="text-[18px] mt-1 font-mono" style={{ fontWeight: 500, color: "#F9FAFB" }}>{item.id}</div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ border: "1px solid #374151", backgroundColor: "#111827" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#374151"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#111827"; }}
          >
            <X className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <div className="text-[11px] tracking-wide uppercase mb-3" style={{ color: "#9CA3AF" }}>Original Review</div>
            <div className="rounded-xl p-4" style={{ backgroundColor: "#111827", border: "1px solid #374151" }}>
              {item.title && <div className="mb-1.5" style={{ fontWeight: 500, color: "#F9FAFB" }}>{item.title}</div>}
              <div className="text-[13px] leading-relaxed" style={{ color: "#D1D5DB" }}>{item.body}</div>
              <div className="flex gap-1.5 mt-3">
                <span
                  className="text-[10.5px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "rgba(5,150,105,0.12)", color: "#34D399", border: "1px solid rgba(5,150,105,0.25)" }}
                >
                  {item.category}
                </span>
                <span
                  className="text-[10.5px] px-1.5 py-0.5 rounded font-mono"
                  style={{ backgroundColor: "#1F2937", color: "#9CA3AF", border: "1px solid #374151" }}
                >
                  {item.model}
                </span>
              </div>
            </div>
          </section>

          <section>
            <div className="text-[11px] tracking-wide uppercase mb-3" style={{ color: "#9CA3AF" }}>AI Prediction</div>
            <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: "#111827", border: "1px solid #374151" }}>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(n => (
                  <Star
                    key={n}
                    className="w-4 h-4"
                    style={{ color: n <= item.predicted_stars ? "#FBBF24" : "#374151", fill: n <= item.predicted_stars ? "#FBBF24" : "transparent" }}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <ConfidenceBar v={item.confidence} />
            </div>
          </section>

          <section className="pt-2" style={{ borderTop: "1px solid #374151" }}>
            <div className="text-[11px] tracking-wide uppercase mb-4" style={{ color: "#059669", fontWeight: 600 }}>Submit Ground Truth</div>

            <Label required>Human Stars</Label>
            <div className="flex items-center gap-2 mb-5">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setStars(n)} className="p-1 transition-transform hover:scale-110">
                  <Star
                    className="w-7 h-7"
                    style={{
                      color: n <= stars ? "#FBBF24" : "#374151",
                      fill: n <= stars ? "#FBBF24" : "transparent",
                    }}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
              <span className="ml-2 text-[12px]" style={{ color: "#9CA3AF" }}>{stars ? `${stars}/5` : "Select rating"}</span>
            </div>

            <Label>Reviewer ID</Label>
            <input
              value="reviewer_b.chen@reviewroute.io"
              readOnly
              className={fieldClass("opacity-60 cursor-not-allowed mb-5 font-mono text-[13px]")}
            />

            <Label>Notes</Label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Optional rationale, edge case observations, or training notes..."
              className={fieldClass("resize-none mb-5")}
            />

            <button
              onClick={handleSubmit}
              disabled={!stars || submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "#059669",
                color: "white",
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(5,150,105,0.3)",
              }}
              onMouseEnter={e => { if (stars && !submitting) (e.currentTarget as HTMLElement).style.backgroundColor = "#047857"; }}
              onMouseLeave={e => { if (stars && !submitting) (e.currentTarget as HTMLElement).style.backgroundColor = "#059669"; }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
              {submitting ? "Submitting..." : "Submit Ground Truth & Resolve"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
