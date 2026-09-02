import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PaymentMethodAmount } from "../../lib/analyticsApi";
import { CATEGORICAL_ORDER } from "../../lib/chartTheme";
import { formatCurrency } from "../../lib/format";
import { ChartTooltip } from "./ChartTooltip";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOBILE: "Mobile",
  CREDIT: "Credit",
  UNKNOWN: "Unknown",
};

export function PaymentMethodChart({ data }: { data: PaymentMethodAmount[] }) {
  if (data.length === 0) {
    return <div className="flex h-70 items-center justify-center text-sm text-text-faint">No data for this period</div>;
  }

  const chartData = data.map((d) => ({ ...d, label: METHOD_LABELS[d.method] ?? d.method }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="amount"
          nameKey="label"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          stroke="none"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={CATEGORICAL_ORDER[i % CATEGORICAL_ORDER.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-text-muted">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
