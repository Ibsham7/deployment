import { useEffect, useState } from "react";
import { Zap, Check } from "lucide-react";

const INIT_STAGES: { label: string; duration: number }[] = [
  { label: "Connecting to inference cluster", duration: 700 },
  { label: "Loading RoBERTa language weights", duration: 950 },
  { label: "Initializing Stacking Ensemble", duration: 800 },
  { label: "Warming up confidence gating layer", duration: 650 },
  { label: "Calibrating drift monitors", duration: 550 },
  { label: "All models ready", duration: 500 },
];

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [stageIndex, setStageIndex] = useState(-1);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Sequence through init stages
  useEffect(() => {
    let cancelled = false;
    let elapsed = 0;

    const runStages = async () => {
      // Small initial delay so the entrance animation plays first
      await sleep(900);
      if (cancelled) return;

      for (let i = 0; i < INIT_STAGES.length; i++) {
        if (cancelled) return;
        setStageIndex(i);
        await sleep(INIT_STAGES[i].duration);
        if (cancelled) return;
        setCompletedStages(prev => [...prev, i]);
        elapsed += INIT_STAGES[i].duration;
        const total = INIT_STAGES.reduce((s, x) => s + x.duration, 0);
        setProgress(Math.round(((elapsed) / total) * 100));
      }

      // Brief pause on "all ready" before exiting
      await sleep(700);
      if (cancelled) return;

      setExiting(true);
      // Wait for slide-up transition to finish before unmounting
      await sleep(750);
      if (!cancelled) onComplete();
    };

    runStages();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <style>{`
        @keyframes rr-fade-in-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rr-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes rr-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          50%  { transform: scale(1.18); opacity: 0.15; }
          100% { transform: scale(1);   opacity: 0.6; }
        }
        @keyframes rr-spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes rr-progress-fill {
          from { width: 0%; }
        }
        .rr-fade-in-up-1 { animation: rr-fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
        .rr-fade-in-up-2 { animation: rr-fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.30s both; }
        .rr-fade-in-up-3 { animation: rr-fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.46s both; }
        .rr-fade-in-up-4 { animation: rr-fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.62s both; }
        .rr-fade-in-5    { animation: rr-fade-in     0.6s ease                        0.80s both; }
        .rr-pulse-ring   { animation: rr-pulse-ring  2.4s ease-in-out infinite; }
        .rr-slide-up     {
          transform: translateY(-100%);
          transition: transform 0.72s cubic-bezier(0.76, 0, 0.24, 1);
        }
      `}</style>

      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none${exiting ? " rr-slide-up" : ""}`}
        style={{
          backgroundColor: "#111827",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          transition: exiting ? "transform 0.72s cubic-bezier(0.76, 0, 0.24, 1)" : undefined,
          transform: exiting ? "translateY(-100%)" : "translateY(0)",
        }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          <div
            style={{
              position: "absolute",
              top: "30%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 480,
              height: 480,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Logo mark */}
        <div className="rr-fade-in-up-1 relative flex items-center justify-center mb-8">
          {/* Pulse ring */}
          <div
            className="rr-pulse-ring absolute rounded-full"
            style={{
              width: 72,
              height: 72,
              border: "1px solid rgba(5,150,105,0.4)",
              borderRadius: "50%",
            }}
          />
          <div
            className="relative w-[56px] h-[56px] rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              boxShadow: "0 0 28px rgba(5,150,105,0.45), 0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Wordmark */}
        <div className="rr-fade-in-up-2 text-center mb-3">
          <h1
            style={{
              fontSize: 38,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#F9FAFB",
              lineHeight: 1,
            }}
          >
            ReviewRoute
          </h1>
        </div>

        {/* Tagline */}
        <div className="rr-fade-in-up-3 text-center mb-12">
          <p
            style={{
              fontSize: 14,
              color: "#9CA3AF",
              letterSpacing: "0.04em",
              fontWeight: 400,
            }}
          >
            ML-powered review routing &amp; sentiment intelligence
          </p>
        </div>

        {/* Init log */}
        <div
          className="rr-fade-in-up-4"
          style={{ width: 340 }}
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "#1F2937",
              border: "1px solid #374151",
            }}
          >
            {/* Header bar */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid #374151" }}
            >
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#374151" }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#374151" }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#374151" }} />
              </div>
              <span
                className="flex-1 text-center text-[11px] tracking-wider uppercase"
                style={{ color: "#6B7280", fontWeight: 500 }}
              >
                Model Initialization
              </span>
            </div>

            {/* Stage list */}
            <div className="px-4 py-3 space-y-2.5" style={{ minHeight: 176 }}>
              {INIT_STAGES.map((stage, i) => {
                const isActive = stageIndex === i && !completedStages.includes(i);
                const isDone = completedStages.includes(i);
                const isVisible = stageIndex >= i;
                const isLast = i === INIT_STAGES.length - 1;

                if (!isVisible) return null;

                return (
                  <div
                    key={i}
                    className="flex items-center gap-3"
                    style={{
                      animation: "rr-fade-in-up 0.35s cubic-bezier(0.22,1,0.36,1) both",
                      opacity: isVisible ? 1 : 0,
                    }}
                  >
                    {/* Status indicator */}
                    <div
                      className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: isDone
                          ? isLast
                            ? "#059669"
                            : "rgba(5,150,105,0.15)"
                          : "rgba(55,65,81,0.6)",
                        border: isActive
                          ? "1px solid rgba(5,150,105,0.5)"
                          : isDone
                          ? "none"
                          : "1px solid #374151",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {isDone && (
                        <Check
                          className="w-2.5 h-2.5"
                          style={{ color: isLast ? "#ffffff" : "#34D399" }}
                          strokeWidth={3}
                        />
                      )}
                      {isActive && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: "#059669",
                            animation: "rr-pulse-ring 1s ease-in-out infinite",
                          }}
                        />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className="text-[12.5px] font-mono"
                      style={{
                        color: isDone
                          ? isLast
                            ? "#34D399"
                            : "#6B7280"
                          : isActive
                          ? "#F9FAFB"
                          : "#6B7280",
                        fontWeight: isActive ? 500 : 400,
                        transition: "color 0.3s ease",
                      }}
                    >
                      {stage.label}
                      {isActive && (
                        <span
                          style={{
                            display: "inline-block",
                            animation: "rr-fade-in 0.5s ease infinite alternate",
                            marginLeft: 2,
                            color: "#059669",
                          }}
                        >
                          ...
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div style={{ borderTop: "1px solid #374151", padding: "12px 16px 14px" }}>
              <div
                className="rounded-full overflow-hidden"
                style={{ height: 3, backgroundColor: "#374151" }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #059669, #34D399)",
                    borderRadius: 9999,
                    transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
                    boxShadow: "0 0 8px rgba(5,150,105,0.5)",
                  }}
                />
              </div>
              <div
                className="flex items-center justify-between mt-2"
                style={{ color: "#6B7280", fontSize: 10.5 }}
              >
                <span className="tracking-wide uppercase" style={{ fontWeight: 500 }}>
                  {progress < 100 ? "Initializing" : "Ready"}
                </span>
                <span className="font-mono tabular-nums">{progress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Version / env tag */}
        <div
          className="rr-fade-in-5 mt-8"
          style={{ color: "#4B5563", fontSize: 11, letterSpacing: "0.08em" }}
        >
          v2.4.1 &nbsp;·&nbsp; us-west-2 &nbsp;·&nbsp; 3 models
        </div>
      </div>
    </>
  );
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}
