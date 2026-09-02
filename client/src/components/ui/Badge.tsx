import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

type Tone = "green" | "amber" | "red" | "blue" | "neutral";

const toneClasses: Record<Tone, string> = {
  green: "bg-accent-soft text-accent",
  amber: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
  blue: "bg-info-soft text-info",
  neutral: "bg-surface-alt text-text-muted",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
