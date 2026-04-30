import { ReactNode, CSSProperties } from "react";

export function GlassCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`relative rounded-2xl border border-[#374151] bg-[#1F2937] shadow-[0_4px_24px_rgba(0,0,0,0.3)] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-[12px] tracking-wide text-[#9CA3AF] mb-2 uppercase" style={{ fontWeight: 500 }}>
      {children}
      {required && <span className="text-rose-400/80 ml-1">*</span>}
    </label>
  );
}

export function fieldClass(extra = "") {
  return `w-full px-4 py-3 rounded-xl bg-[#111827] border border-[#374151] text-[#F9FAFB] placeholder:text-[#6B7280] outline-none transition-all focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 text-[13.5px] ${extra}`;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
      <div>
        <div className="text-[11px] tracking-[0.2em] text-[#059669] uppercase mb-2" style={{ fontWeight: 600 }}>{eyebrow}</div>
        <h1 className="text-[#F9FAFB] tracking-tight" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1 }}>
          {title}
        </h1>
        <p className="text-[#9CA3AF] mt-2 max-w-2xl text-[14px] leading-relaxed">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg bg-[#374151]/60 animate-pulse ${className}`} />
  );
}