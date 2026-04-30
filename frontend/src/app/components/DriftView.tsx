import { useState, useEffect } from "react";
import { Activity, RefreshCw, TrendingUp, TrendingDown, Loader2, Inbox } from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { GlassCard, PageHeader, Label, fieldClass, Skeleton } from "./ui-bits";
import { runDriftAnalysis, getLatestDrift, DriftMetric } from "../lib/api";

type ViewDriftMetric = DriftMetric & {
  alert_threshold: number;
  trend: { ts: string; value: number }[];
  delta: number;
};

function statusOf(m: ViewDriftMetric): "ok" | "warn" | "alert" {
  if (m.metric_value >= m.alert_threshold) return "alert";
  if (m.metric_value >= m.warn_threshold) return "warn";
  return "ok";
}

const STATUS_STYLE = {
  ok: {
    ring: "#059669",
    chipBg: "rgba(5,150,105,0.12)",
    chipText: "#34D399",
    chipBorder: "rgba(5,150,105,0.3)",
    dot: "#059669",
    dotGlow: "rgba(5,150,105,0.6)",
    label: "OK",
    lineColor: "#059669",
    areaColor: "#059669",
  },
  warn: {
    ring: "#F59E0B",
    chipBg: "rgba(245,158,11,0.12)",
    chipText: "#FCD34D",
    chipBorder: "rgba(245,158,11,0.3)",
    dot: "#F59E0B",
    dotGlow: "rgba(245,158,11,0.6)",
    label: "WARN",
    lineColor: "#F59E0B",
    areaColor: "#F59E0B",
  },
  alert: {
    ring: "#EF4444",
    chipBg: "rgba(239,68,68,0.12)",
    chipText: "#FCA5A5",
    chipBorder: "rgba(239,68,68,0.3)",
    dot: "#EF4444",
    dotGlow: "rgba(239,68,68,0.6)",
    label: "ALERT",
    lineColor: "#EF4444",
    areaColor: "#EF4444",
  },
};

// Build combined trend data for the multi-series chart
function buildCombinedTrend(metrics: ViewDriftMetric[]) {
  if (!metrics.length || !metrics[0].trend || !metrics[0].trend.length) return [];
  const trendLength = metrics[0].trend.length;
  return Array.from({ length: trendLength }, (_, i) => {
    const row: Record<string, any> = { ts: metrics[0].trend[i].ts };
    metrics.forEach(m => {
      row[m.metric_name] = m.trend[i]?.value || 0;
    });
    return row;
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-[12px]"
      style={{ backgroundColor: "#1F2937", border: "1px solid #374151", color: "#F9FAFB" }}
    >
      <div className="mb-1" style={{ color: "#9CA3AF" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span style={{ color: "#9CA3AF" }}>{p.name.split(" ")[0]}:</span>
          <span style={{ fontWeight: 600 }}>{p.value?.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
};

export function DriftView() {
  const [lookback, setLookback] = useState(24);
  const [baseline, setBaseline] = useState(7);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ViewDriftMetric[]>([]);
  const [lastRun, setLastRun] = useState("N/A");
  const [runHistory, setRunHistory] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const raw = await getLatestDrift();
        if (!mounted) return;
        const mapped = raw.map(m => ({
          ...m,
          alert_threshold: m.threshold,
          trend: [],
          delta: 0,
        }));
        setMetrics(mapped as ViewDriftMetric[]);
      } catch (err) {
        console.error("Failed to load drift", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const overall: "ok" | "warn" | "alert" = metrics.length
    ? metrics.some(m => statusOf(m) === "alert")
      ? "alert"
      : metrics.some(m => statusOf(m) === "warn")
      ? "warn"
      : "ok"
    : "ok";

  const overallStyle = STATUS_STYLE[overall];

  const run = async () => {
    setRunning(true);
    try {
      const result = await runDriftAnalysis({ lookback_hours: lookback, baseline_days: baseline });
      const mapped = result.metrics.map((m: any) => ({
        ...m,
        alert_threshold: m.threshold,
        trend: [],
        delta: 0,
      }));
      setMetrics(mapped);
      setLastRun("just now");
      
      const newRun = {
        id: "drift_run_" + Date.now().toString().slice(-4),
        t: new Date().toLocaleString(),
        w: `${lookback}h / ${baseline}d`,
        a: result.metrics.find(m => m.metric_name.includes("Confidence"))?.metric_value || 0,
        b: result.metrics.find(m => m.metric_name.includes("Language"))?.metric_value || 0,
        c: result.metrics.find(m => m.metric_name.includes("Route"))?.metric_value || 0,
        s: result.status,
      };
      setRunHistory(prev => [newRun, ...prev]);
    } catch {
      // on fail, do not clear
    } finally {
      setRunning(false);
    }
  };

  const combinedTrend = buildCombinedTrend(metrics);

  return (
    <div>
      <PageHeader
        eyebrow="04 · MLOps"
        title="Drift & Monitoring"
        subtitle="Continuous comparison of live inference distributions against the training baseline. Investigate divergence early — before it impacts customers."
        actions={
          <div
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
            style={{
              backgroundColor: overallStyle.chipBg,
              border: `1px solid ${overallStyle.chipBorder}`,
              color: overallStyle.chipText,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: overallStyle.dot, boxShadow: `0 0 8px ${overallStyle.dotGlow}` }}
            />
            <span className="tracking-wider text-[12px]" style={{ fontWeight: 600 }}>{overallStyle.label}</span>
            <span className="text-[12px] opacity-70">· Overall Status</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Controls panel */}
        <GlassCard className="lg:col-span-1 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4" style={{ color: "#059669" }} />
            <span className="text-[12px] tracking-wide uppercase" style={{ color: "#9CA3AF", fontWeight: 500 }}>New Drift Check</span>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Lookback (hours)</Label>
              <input
                type="number"
                value={lookback}
                onChange={e => setLookback(+e.target.value)}
                className={fieldClass("font-mono")}
              />
            </div>
            <div>
              <Label>Baseline (days)</Label>
              <input
                type="number"
                value={baseline}
                onChange={e => setBaseline(+e.target.value)}
                className={fieldClass("font-mono")}
              />
            </div>

            <button
              onClick={run}
              disabled={running || loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "#059669",
                color: "white",
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(5,150,105,0.3)",
              }}
              onMouseEnter={e => { if (!running) (e.currentTarget as HTMLElement).style.backgroundColor = "#047857"; }}
              onMouseLeave={e => { if (!running) (e.currentTarget as HTMLElement).style.backgroundColor = "#059669"; }}
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" strokeWidth={2.5} />}
              {running ? "Running..." : "Run Drift Analysis"}
            </button>

            <div className="pt-4 text-[11.5px] leading-relaxed" style={{ borderTop: "1px solid #374151", color: "#6B7280" }}>
              Last run · {lastRun}<br />
              Window · {lookback}h vs {baseline}d baseline
            </div>
          </div>
        </GlassCard>

        {/* Metric cards */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          {(running || loading) && [0,1,2].map(i => (
            <GlassCard key={i} className="p-6">
              <Skeleton className="h-3 w-24 mb-4" />
              <Skeleton className="h-10 w-32 mb-3" />
              <Skeleton className="h-2 w-full mb-2" />
              <Skeleton className="h-20 w-full mt-4" />
            </GlassCard>
          ))}
          {!running && !loading && metrics.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-16" style={{ border: "1px dashed #374151", borderRadius: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)" }}>
              <Inbox className="w-8 h-8 mb-3" style={{ color: "#4B5563" }} />
              <div className="text-[14px] text-center" style={{ color: "#9CA3AF" }}>No data available. Run drift analysis to generate metrics.</div>
            </div>
          )}
          {!running && !loading && metrics.map(m => <MetricCard key={m.metric_name} m={m} />)}
        </div>
      </div>

      {/* Combined trend chart */}
      {!running && !loading && combinedTrend.length > 0 && (
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] tracking-wide uppercase mb-1" style={{ color: "#9CA3AF" }}>Metric Trends</div>
              <div className="text-[15px]" style={{ fontWeight: 500, color: "#F9FAFB" }}>All metrics over current window</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={combinedTrend} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="ts"
                tick={{ fill: "#6B7280", fontSize: 11 }}
                axisLine={{ stroke: "#374151" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6B7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v.toFixed(2)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#9CA3AF", paddingTop: 8 }}
                iconType="circle"
                iconSize={7}
              />
              <Line
                type="monotone"
                dataKey="Confidence PSI"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#059669" }}
              />
              <Line
                type="monotone"
                dataKey="Language Divergence"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#F59E0B" }}
              />
              <Line
                type="monotone"
                dataKey="Route Mix Shift"
                stroke="#EF4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#EF4444" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* Run history table */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[11px] tracking-wide uppercase mb-1" style={{ color: "#9CA3AF" }}>Recent Drift Runs</div>
            <div className="text-[15px]" style={{ fontWeight: 500, color: "#F9FAFB" }}>Run history · session</div>
          </div>
          <span className="text-[12px]" style={{ color: "#6B7280" }}>Showing {runHistory.length}</span>
        </div>

        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid #374151" }}>
          <table className="w-full text-[12.5px]">
            <thead style={{ backgroundColor: "#111827" }}>
              <tr className="text-left text-[10.5px] uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
                <th className="px-4 py-2.5" style={{ fontWeight: 500 }}>Run</th>
                <th className="px-4 py-2.5" style={{ fontWeight: 500 }}>Started</th>
                <th className="px-4 py-2.5" style={{ fontWeight: 500 }}>Window</th>
                <th className="px-4 py-2.5" style={{ fontWeight: 500 }}>Conf PSI</th>
                <th className="px-4 py-2.5" style={{ fontWeight: 500 }}>Lang Div</th>
                <th className="px-4 py-2.5" style={{ fontWeight: 500 }}>Route Shift</th>
                <th className="px-4 py-2.5" style={{ fontWeight: 500 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {runHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div className="text-[13px]" style={{ color: "#6B7280" }}>No data available. Run drift analysis to populate history.</div>
                  </td>
                </tr>
              ) : (
                runHistory.map(r => {
                  const s = STATUS_STYLE[r.s as "ok" | "warn" | "alert"] || STATUS_STYLE["ok"];
                  return (
                    <tr
                      key={r.id}
                      className="transition-colors"
                      style={{ borderTop: "1px solid #374151" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.02)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                    >
                      <td className="px-4 py-3 font-mono" style={{ color: "#F9FAFB" }}>{r.id}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: "#9CA3AF" }}>{r.t}</td>
                      <td className="px-4 py-3" style={{ color: "#9CA3AF" }}>{r.w}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "#D1D5DB" }}>{r.a.toFixed(2)}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "#D1D5DB" }}>{r.b.toFixed(2)}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "#D1D5DB" }}>{r.c.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] tracking-wider"
                          style={{
                            backgroundColor: s.chipBg,
                            color: s.chipText,
                            border: `1px solid ${s.chipBorder}`,
                            fontWeight: 600,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: s.dot }}
                          />
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

function MetricCard({ m }: { m: ViewDriftMetric }) {
  const status = statusOf(m);
  const s = STATUS_STYLE[status];
  const max = (m.alert_threshold || 1) * 1.2;
  const pct = Math.min(100, (m.metric_value / max) * 100);
  const warnPct = (m.warn_threshold / max) * 100;
  const alertPct = (m.alert_threshold / max) * 100;
  const up = m.delta >= 0;

  return (
    <GlassCard className="p-6" style={{ borderColor: s.ring + "50" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-[10.5px] tracking-wider uppercase" style={{ color: "#9CA3AF" }}>{m.metric_name}</div>
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] tracking-wider"
          style={{
            backgroundColor: s.chipBg,
            color: s.chipText,
            border: `1px solid ${s.chipBorder}`,
            fontWeight: 600,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot, boxShadow: `0 0 6px ${s.dotGlow}` }} />
          {s.label}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="tracking-tight tabular-nums" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1, color: "#F9FAFB" }}>
          {m.metric_value.toFixed(2)}
        </span>
        <span
          className="inline-flex items-center gap-0.5 text-[12px]"
          style={{ color: up ? "#FCA5A5" : "#34D399" }}
        >
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? "+" : ""}{m.delta.toFixed(2)}
        </span>
      </div>
      <div className="text-[11px] mb-3" style={{ color: "#6B7280" }}>vs {Math.round((m.trend?.length || 0) * 2)}h baseline</div>

      {/* Recharts area sparkline */}
      <div style={{ height: 60, marginLeft: -8, marginRight: -8 }}>
        {m.trend && m.trend.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={m.trend} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${m.metric_name.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.lineColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={s.lineColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={s.lineColor}
                strokeWidth={1.5}
                fill={`url(#grad-${m.metric_name.replace(/\s/g, "")})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: "#6B7280" }}>
            No trend data
          </div>
        )}
      </div>

      {/* Threshold bar */}
      <div className="mt-3">
        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#374151" }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: s.dot }}
          />
          <div
            className="absolute top-0 h-full w-px"
            style={{ left: `${warnPct}%`, backgroundColor: "rgba(245,158,11,0.7)" }}
          />
          <div
            className="absolute top-0 h-full w-px"
            style={{ left: `${alertPct}%`, backgroundColor: "rgba(239,68,68,0.8)" }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] tabular-nums" style={{ color: "#6B7280" }}>
          <span>0</span>
          <span>warn {m.warn_threshold}</span>
          <span>alert {m.alert_threshold}</span>
        </div>
      </div>
    </GlassCard>
  );
}
