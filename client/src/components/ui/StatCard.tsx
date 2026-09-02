import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  changePct?: number;
  tone?: "default" | "accent";
  className?: string;
}

export function StatCard({ label, value, icon: Icon, changePct, tone = "default", className }: StatCardProps) {
  const isAccent = tone === "accent";
  return (
    <div
      className={clsx(
        "rounded-2xl border p-5",
        isAccent ? "border-accent-dark bg-gradient-to-br from-accent-dark to-accent-soft" : "border-border bg-surface",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className={clsx("text-sm font-medium", isAccent ? "text-white/90" : "text-text-muted")}>{label}</span>
        {Icon && (
          <div className={clsx("rounded-full p-1.5", isAccent ? "bg-white/15" : "bg-surface-alt")}>
            <Icon size={16} className={isAccent ? "text-white" : "text-text-muted"} />
          </div>
        )}
      </div>
      <div className={clsx("mt-3 text-2xl font-semibold", isAccent ? "text-white" : "text-text")}>{value}</div>
      {typeof changePct === "number" && (
        <div
          className={clsx(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium",
            isAccent ? "text-white/80" : changePct >= 0 ? "text-accent" : "text-danger"
          )}
        >
          {changePct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(changePct).toFixed(1)}% vs previous period
        </div>
      )}
    </div>
  );
}
