import { useState } from "react";
import { Activity, RefreshCw, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
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
  ReferenceLine,
  Legend,
} from "recharts";
import { GlassCard, PageHeader, Label, fieldClass, Skeleton } from "./ui-bits";
import { runDriftAnalysis, DriftMetric } from "../lib/api";

function statusOf(m: DriftMetric): "ok" | "warn" | "alert" {
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

const INITIAL_METRICS: DriftMetric[] = [
  {
    metric_name: "Confidence PSI",
    metric_value: 0.15,
    warn_threshold: 0.1,
    alert_threshold: 0.25,
    trend: [
      { ts: "06:00", value: 0.06 },
      { ts: "08:00", value: 0.08 },
      { ts: "10:00", value: 0.07 },
      { ts: "12:00", value: 0.09 },
      { ts: "14:00", value: 0.11 },
      { ts: "16:00", value: 0.13 },
      { ts: "18:00", value: 0.15 },
    ],
    delta: 0.04,
  },
  {
    metric_name: "Language Divergence",
    metric_value: 0.04,
    warn_threshold: 0.08,
    alert_threshold: 0.15,
    trend: [
      { ts: "06:00", value: 0.05 },
      { ts: "08:00", value: 0.04 },
      { ts: "10:00", value: 0.05 },
      { ts: "12:00", value: 0.04 },
      { ts: "14:00", value: 0.03 },
      { ts: "16:00", value: 0.04 },
      { ts: "18:00", value: 0.04 },
    ],
    delta: -0.01,
  },
  {
    metric_name: "Route Mix Shift",
    metric_value: 0.21,
    warn_threshold: 0.1,
    alert_threshold: 0.2,
    trend: [
      { ts: "06:00", value: 0.08 },
      { ts: "08:00", value: 0.10 },
      { ts: "10:00", value: 0.13 },
      { ts: "12:00", value: 0.15 },
      { ts: "14:00", value: 0.18 },
      { ts: "16:00", value: 0.20 },
      { ts: "18:00", value: 0.21 },
    ],
    delta: 0.06,
  },
];

const RUN_HISTORY = [
  { id: "drift_1042", t: "2026-04-29 14:02", w: "24h / 7d", a: 0.15, b: 0.04, c: 0.21, s: "alert" },
  { id: "drift_1041", t: "2026-04-29 12:00", w: "24h / 7d", a: 0.13, b: 0.05, c: 0.19, s: "warn" },
  { id: "drift_1040", t: "2026-04-29 10:00", w: "24h / 7d", a: 0.11, b: 0.04, c: 0.16, s: "warn" },
  { id: "drift_1039", t: "2026-04-29 08:00", w: "24h / 7d", a: 0.09, b: 0.03, c: 0.12, s: "warn" },
  { id: "drift_1038", t: "2026-04-29 06:00", w: "24h / 7d", a: 0.08, b: 0.04, c: 0.10, s: "ok" },
];

// Build combined trend data for the multi-series chart
function buildCombinedTrend(metrics: DriftMetric[]) {
  if (!metrics.length) return [];
  const trendLength = metrics[0].trend.length;
  return Array.from({ length: trendLength }, (_, i) => {
    const row: Record<string, any> = { ts: metrics[0].trend[i].ts };
    metrics.forEach(m => {
      row[m.metric_name] = m.trend[i].value;
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
  const [metrics, setMetrics] = useState<DriftMetric[]>(INITIAL_METRICS);
  const [lastRun, setLastRun] = useState("12 min ago");

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
    setMetrics([]);
    try {
      const result = await runDriftAnalysis({ lookback_hours: lookback, baseline_days: baseline });
      setMetrics(result.metrics);
      setLastRun("just now");
    } catch {
      setMetrics(INITIAL_METRICS);
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
              disabled={running}
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
          {running && [0,1,2].map(i => (
            <GlassCard key={i} className="p-6">
              <Skeleton className="h-3 w-24 mb-4" />
              <Skeleton className="h-10 w-32 mb-3" />
              <Skeleton className="h-2 w-full mb-2" />
              <Skeleton className="h-20 w-full mt-4" />
            </GlassCard>
          ))}
          {!running && metrics.map(m => <MetricCard key={m.metric_name} m={m} />)}
        </div>
      </div>

      {/* Combined trend chart */}
      {!running && combinedTrend.length > 0 && (
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
            <div className="text-[15px]" style={{ fontWeight: 500, color: "#F9FAFB" }}>Run history · last 7 days</div>
          </div>
          <span className="text-[12px]" style={{ color: "#6B7280" }}>Showing 5 of 142</span>
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
              {RUN_HISTORY.map(r => {
                const s = STATUS_STYLE[r.s as "ok" | "warn" | "alert"];
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
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

function MetricCard({ m }: { m: DriftMetric }) {
  const status = statusOf(m);
  const s = STATUS_STYLE[status];
  const max = m.alert_threshold * 1.2;
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
      <div className="text-[11px] mb-3" style={{ color: "#6B7280" }}>vs {Math.round(m.trend.length * 2)}h baseline</div>

      {/* Recharts area sparkline */}
      <div style={{ height: 60, marginLeft: -8, marginRight: -8 }}>
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
