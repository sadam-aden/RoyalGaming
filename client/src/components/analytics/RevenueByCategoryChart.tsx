import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryRevenue } from "../../lib/analyticsApi";
import { CHART_AXIS, CHART_COLORS, CHART_GRID } from "../../lib/chartTheme";
import { formatCurrency } from "../../lib/format";
import { ChartTooltip } from "./ChartTooltip";

const CATEGORY_LABELS: Record<string, string> = {
  PLAYSTATION: "PlayStation",
  TABLE_GAMES: "Table Games",
  SKATING: "Skating",
  COFFEE: "Coffee",
  CAFETERIA: "Cafeteria",
};

export function RevenueByCategoryChart({ data }: { data: CategoryRevenue[] }) {
  if (data.length === 0) {
    return <div className="flex h-70 items-center justify-center text-sm text-text-faint">No data for this period</div>;
  }

  const chartData = data
    .map((d) => ({ ...d, label: CATEGORY_LABELS[d.category] ?? d.category }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" stroke={CHART_AXIS} tick={{ fill: CHART_AXIS, fontSize: 12 }} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
        <YAxis stroke={CHART_AXIS} tick={{ fill: CHART_AXIS, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
        <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}
