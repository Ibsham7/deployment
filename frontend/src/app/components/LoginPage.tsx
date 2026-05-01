import { useState } from "react";
import { Zap, LogIn, Eye, EyeOff, Shield, AlertCircle } from "lucide-react";
import { auth, signInWithEmailAndPassword } from "../lib/firebase";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth state listener in AuthContext will handle the rest
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Invalid email or password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes login-fade-in-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes login-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes login-pulse {
          0%   { transform: scale(1);   opacity: 0.5; }
          50%  { transform: scale(1.2); opacity: 0.15; }
          100% { transform: scale(1);   opacity: 0.5; }
        }
        @keyframes login-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes login-float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes login-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .login-anim-1 { animation: login-fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .login-anim-2 { animation: login-fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
        .login-anim-3 { animation: login-fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
        .login-anim-4 { animation: login-fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.55s both; }
        .login-anim-5 { animation: login-fade-in     0.6s ease 0.75s both; }
        .login-pulse-ring { animation: login-pulse 2.4s ease-in-out infinite; }
        .login-float { animation: login-float 3s ease-in-out infinite; }
      `}</style>

      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center select-none"
        style={{
          backgroundColor: "#111827",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Ambient background effects */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* Top-left glow */}
          <div
            style={{
              position: "absolute",
              top: "15%",
              left: "20%",
              width: 500,
              height: 500,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(5,150,105,0.06) 0%, transparent 70%)",
            }}
          />
          {/* Bottom-right glow */}
          <div
            style={{
              position: "absolute",
              bottom: "10%",
              right: "15%",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(5,150,105,0.04) 0%, transparent 70%)",
            }}
          />
          {/* Grid pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(55,65,81,0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(55,65,81,0.15) 1px, transparent 1px)
              `,
              backgroundSize: "64px 64px",
              mask: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
              WebkitMask: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            }}
          />
        </div>

        {/* Login card */}
        <div
          className="relative w-full max-w-[400px] mx-4"
        >
          {/* Logo + Branding */}
          <div className="login-anim-1 flex flex-col items-center mb-8">
            <div className="relative flex items-center justify-center mb-5 login-float">
              {/* Pulse ring */}
              <div
                className="login-pulse-ring absolute rounded-full"
                style={{
                  width: 76,
                  height: 76,
                  border: "1px solid rgba(5,150,105,0.35)",
                }}
              />
              <div
                className="relative w-[56px] h-[56px] rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  boxShadow: "0 0 32px rgba(5,150,105,0.5), 0 4px 20px rgba(0,0,0,0.4)",
                }}
              >
                <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "#F9FAFB",
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              ReviewRoute
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "#6B7280",
                letterSpacing: "0.03em",
              }}
            >
              Sign in to access the MLOps Console
            </p>
          </div>

          {/* Card */}
          <div
            className="login-anim-2 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "rgba(31,41,55,0.8)",
              border: "1px solid #374151",
              backdropFilter: "blur(20px)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset",
            }}
          >
            {/* Card header */}
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ borderBottom: "1px solid rgba(55,65,81,0.6)" }}
            >
              <Shield className="w-4 h-4" style={{ color: "#059669" }} strokeWidth={2} />
              <span
                className="text-[12px] tracking-wider uppercase"
                style={{ color: "#9CA3AF", fontWeight: 500 }}
              >
                Secure Authentication
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Error message */}
              {error && (
                <div
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    animation: "login-fade-in-up 0.3s ease both",
                  }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#EF4444" }} />
                  <span className="text-[13px]" style={{ color: "#FCA5A5" }}>{error}</span>
                </div>
              )}

              {/* Email field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="text-[12px] tracking-wide uppercase"
                  style={{ color: "#9CA3AF", fontWeight: 500 }}
                >
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    placeholder="admin@reviewroute.ai"
                    className="w-full px-4 py-3 rounded-xl outline-none text-[14px] transition-all"
                    style={{
                      backgroundColor: "#111827",
                      border: focused === "email"
                        ? "1px solid #059669"
                        : "1px solid #374151",
                      color: "#F9FAFB",
                      boxShadow: focused === "email"
                        ? "0 0 0 3px rgba(5,150,105,0.15)"
                        : "none",
                    }}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="text-[12px] tracking-wide uppercase"
                  style={{ color: "#9CA3AF", fontWeight: 500 }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 rounded-xl outline-none text-[14px] transition-all"
                    style={{
                      backgroundColor: "#111827",
                      border: focused === "password"
                        ? "1px solid #059669"
                        : "1px solid #374151",
                      color: "#F9FAFB",
                      boxShadow: focused === "password"
                        ? "0 0 0 3px rgba(5,150,105,0.15)"
                        : "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                    style={{ color: "#6B7280" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
                    tabIndex={-1}
                  >
                    {showPassword
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full relative py-3 rounded-xl text-[14px] font-semibold transition-all overflow-hidden"
                style={{
                  background: loading || !email || !password
                    ? "#374151"
                    : "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  color: loading || !email || !password ? "#6B7280" : "#ffffff",
                  boxShadow: loading || !email || !password
                    ? "none"
                    : "0 4px 16px rgba(5,150,105,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset",
                  cursor: loading || !email || !password ? "not-allowed" : "pointer",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => {
                  if (!loading && email && password) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 24px rgba(5,150,105,0.45), 0 0 0 1px rgba(255,255,255,0.15) inset";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  if (!loading && email && password) {
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(5,150,105,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset";
                  }
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      style={{ animation: "login-spin 1s linear infinite" }}
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12" cy="12" r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="60"
                        strokeDashoffset="20"
                        opacity={0.3}
                      />
                      <circle
                        cx="12" cy="12" r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="15"
                        strokeDashoffset="0"
                      />
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Footer security badge */}
          <div className="login-anim-5 flex items-center justify-center gap-2 mt-6">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: "#059669",
                boxShadow: "0 0 8px rgba(5,150,105,0.6)",
              }}
            />
            <span style={{ fontSize: 11, color: "#4B5563", letterSpacing: "0.06em" }}>
              Protected by Firebase Authentication
            </span>
          </div>

          {/* Version */}
          <div
            className="login-anim-5 text-center mt-3"
            style={{ color: "#374151", fontSize: 10.5, letterSpacing: "0.08em" }}
          >
            v2.4.1 &nbsp;·&nbsp; MLOps Console
          </div>
        </div>
      </div>
    </>
  );
}
