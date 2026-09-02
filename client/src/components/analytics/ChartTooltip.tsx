import { CHART_TOOLTIP_BG } from "../../lib/chartTheme";

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  formatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-border-soft px-3 py-2 text-xs shadow-lg"
      style={{ backgroundColor: CHART_TOOLTIP_BG }}
    >
      {label && <div className="mb-1 font-medium text-text">{labelFormatter ? labelFormatter(label) : label}</div>}
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 text-text-muted">
          {item.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />}
          <span>{item.name}:</span>
          <span className="font-medium text-text">
            {formatter && typeof item.value === "number" ? formatter(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
