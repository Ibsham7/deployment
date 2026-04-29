import { FlaskConical, Sparkles, Inbox, Activity, Zap } from "lucide-react";

export type ViewKey = "simulator" | "results" | "queue" | "drift";

const items: { key: ViewKey; label: string; icon: any; desc: string }[] = [
  { key: "simulator", label: "Review Simulator", icon: FlaskConical, desc: "Tester" },
  { key: "results", label: "Inference Results", icon: Sparkles, desc: "Explainability" },
  { key: "queue", label: "Human Review", icon: Inbox, desc: "Admin Queue" },
  { key: "drift", label: "Drift & Monitoring", icon: Activity, desc: "MLOps" },
];

export function Sidebar({
  active,
  onSelect,
  hasResults,
}: {
  active: ViewKey;
  onSelect: (k: ViewKey) => void;
  hasResults: boolean;
}) {
  return (
    <aside
      className="w-64 shrink-0 h-screen sticky top-0 flex flex-col"
      style={{ backgroundColor: "#1F2937", borderRight: "1px solid #374151" }}
    >
      <div className="px-5 pt-6 pb-8 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 4px 12px rgba(5,150,105,0.3)" }}
        >
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-[#F9FAFB] tracking-tight" style={{ fontWeight: 600, fontSize: 15 }}>ReviewRoute</div>
          <div className="text-[11px] text-[#9CA3AF] tracking-wider uppercase">MLOps Console</div>
        </div>
      </div>

      <nav className="px-3 flex-1 space-y-1">
        {items.map(({ key, label, icon: Icon, desc }) => {
          const isActive = active === key;
          const disabled = key === "results" && !hasResults;
          return (
            <button
              key={key}
              disabled={disabled}
              onClick={() => onSelect(key)}
              className={`w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
              style={
                isActive
                  ? { backgroundColor: "#111827", border: "1px solid #374151" }
                  : { border: "1px solid transparent" }
              }
              onMouseEnter={
                !isActive && !disabled
                  ? (e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "#111827";
                    }
                  : undefined
              }
              onMouseLeave={
                !isActive && !disabled
                  ? (e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "";
                    }
                  : undefined
              }
            >
              {isActive && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                  style={{ backgroundColor: "#059669" }}
                />
              )}
              <Icon
                className="w-4 h-4"
                style={{ color: isActive ? "#059669" : "#9CA3AF" }}
                strokeWidth={1.75}
              />
              <div className="flex-1">
                <div
                  className="text-[13px]"
                  style={{ fontWeight: 500, color: isActive ? "#F9FAFB" : "#9CA3AF" }}
                >
                  {label}
                </div>
                <div className="text-[10.5px] tracking-wide uppercase" style={{ color: "#6B7280" }}>{desc}</div>
              </div>
            </button>
          );
        })}
      </nav>

      <div
        className="p-4 m-3 rounded-2xl"
        style={{ backgroundColor: "#111827", border: "1px solid #374151" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#059669", boxShadow: "0 0 8px rgba(5,150,105,0.7)" }}
          />
          <span className="text-[11px] tracking-wide" style={{ color: "#9CA3AF" }}>All systems operational</span>
        </div>
        
      </div>
    </aside>
  );
}
