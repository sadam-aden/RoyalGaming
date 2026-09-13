import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryRevenue } from "../../lib/analyticsApi";
import { CHART_AXIS, CHART_GRID } from "../../lib/chartTheme";
import { formatCurrency } from "../../lib/format";
import { ChartTooltip } from "./ChartTooltip";

/**
 * Revenue per category, as amounts.
 *
 * The companion to the pie next to it: the pie answers "what share?", this
 * answers "how much?" — a pie cannot be read off an axis, and the gap between
 * two similar slices is much easier to see as two bars.
 *
 * Bars are coloured per category from the same helper the pie and the Sales
 * Report use, so a category is one colour everywhere in the app.
 */
export function RevenueByCategoryBarChart({ data }: { data: CategoryRevenue[] }) {
  if (data.length === 0) {
    return <div className="flex h-70 items-center justify-center text-sm text-text-faint">No data for this period</div>;
  }

  const chartData = data
    .map((d) => ({
      ...d,
      label: d.name,
      color: d.color,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis
          dataKey="label"
          stroke={CHART_AXIS}
          tick={{ fill: CHART_AXIS, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID }}
          tickLine={false}
        />
        <YAxis
          stroke={CHART_AXIS}
          tick={{ fill: CHART_AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v) => formatCurrency(v)}
        />
        <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {chartData.map((d) => (
            <Cell key={d.category} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
