import { useState } from "react";
import { Search, Bell } from "lucide-react";
import { Toaster } from "sonner";
import { Sidebar, ViewKey } from "./components/Sidebar";
import { SimulatorView, SimulatorRequest } from "./components/SimulatorView";
import { ResultsView, InferenceResult } from "./components/ResultsView";
import { QueueView } from "./components/QueueView";
import { DriftView } from "./components/DriftView";

export default function App() {
  const [view, setView] = useState<ViewKey>("simulator");
  const [request, setRequest] = useState<SimulatorRequest | null>(null);
  const [result, setResult] = useState<InferenceResult | null>(null);

  const onResult = (req: SimulatorRequest, res: InferenceResult) => {
    setRequest(req);
    setResult(res);
    setView("results");
  };

  return (
    <div
      className="min-h-screen text-[#F9FAFB] relative overflow-hidden"
      style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif", backgroundColor: "#111827" }}
    >
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
        <Sidebar active={view} onSelect={setView} hasResults={!!result} />

        <main className="flex-1 min-w-0">
          <header
            className="sticky top-0 z-20 border-b"
            style={{ backgroundColor: "#111827", borderColor: "#374151" }}
          >
            <div className="px-10 py-4 flex items-center justify-between gap-6">
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

          <div className="px-10 py-10 max-w-[1400px]">
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
