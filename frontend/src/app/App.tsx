import { useState } from "react";
import { Search, Menu, X } from "lucide-react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { LoginPage } from "./components/LoginPage";
import { Sidebar, ViewKey } from "./components/Sidebar";
import { SimulatorView, SimulatorRequest } from "./components/SimulatorView";
import { ResultsView, InferenceResult } from "./components/ResultsView";
import { QueueView } from "./components/QueueView";
import { DriftView } from "./components/DriftView";
import { SplashScreen } from "./components/SplashScreen";
import { auth, firebaseSignOut } from "./lib/firebase";

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [view, setView] = useState<ViewKey>("simulator");
  const [request, setRequest] = useState<SimulatorRequest | null>(null);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const onResult = (req: SimulatorRequest, res: InferenceResult) => {
    setRequest(req);
    setResult(res);
    setView("results");
    setSidebarOpen(false);
  };

  const switchView = (v: ViewKey) => {
    setView(v);
    setSidebarOpen(false);
  };

  // 1. Show loading spinner while Firebase Auth initializes
  if (authLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: "#111827" }}
      >
        <div
          className="w-8 h-8 rounded-full border-2"
          style={{
            borderColor: "#374151",
            borderTopColor: "#059669",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // 2. Not logged in → show login page
  if (!user) {
    return <LoginPage />;
  }

  // 3. Logged in → splash screen → app
  return (
    <div
      className="min-h-screen text-[#F9FAFB] relative overflow-hidden"
      style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif", backgroundColor: "#111827" }}
    >
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}

      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#1F2937",
            border: "1px solid #374151",
            color: "#F9FAFB",
          },
        }}
      />

      <div className="relative z-10 flex">
        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <Sidebar 
            active={view} 
            onSelect={switchView} 
            hasResults={!!result} 
            onClose={() => setSidebarOpen(false)}
            userEmail={user.email || undefined}
            onLogout={handleLogout}
          />
        </div>

        <main className="flex-1 min-w-0">
          <header
            className="sticky top-0 z-20 border-b"
            style={{ backgroundColor: "#111827", borderColor: "#374151" }}
          >
            <div className="px-4 md:px-10 py-4 flex items-center justify-between gap-6">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl"
                style={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                  placeholder="Search models, reviews, runs..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl outline-none transition-all focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 text-[13px] text-[#F9FAFB] placeholder:text-[#6B7280]"
                  style={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}
                />
                <kbd className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] text-[#6B7280] px-1.5 py-0.5 rounded" style={{ border: "1px solid #374151", backgroundColor: "#111827" }}>
                  Cmd+K
                </kbd>
              </div>
              
            </div>
          </header>

          <div className="px-4 md:px-10 py-6 md:py-10 max-w-[1400px]">
            {view === "simulator" && <SimulatorView onResult={onResult} />}
            {view === "results" && result && request && (
              <ResultsView result={result} request={request} onBack={() => setView("simulator")} />
            )}
            {view === "queue" && <QueueView />}
            {view === "drift" && <DriftView />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}