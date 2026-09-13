import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryRevenue } from "../../lib/analyticsApi";
import { formatCurrency } from "../../lib/format";
import { ChartTooltip } from "./ChartTooltip";

/**
 * Revenue split by category.
 *
 * A pie rather than a bar: with five fixed categories the useful question is
 * what share each one takes of the whole, which is what a pie shows directly
 * and a bar only implies.
 *
 * Colours come from the same helper the Sales Report uses, so a category is the
 * same colour on both pages — Cafeteria is pink here and pink there.
 */
export function RevenueByCategoryChart({ data }: { data: CategoryRevenue[] }) {
  if (data.length === 0) {
    return <div className="flex h-70 items-center justify-center text-sm text-text-faint">No data for this period</div>;
  }

  const chartData = data
    .filter((d) => d.revenue > 0)
    .map((d) => ({
      ...d,
      label: d.name,
      color: d.color,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  if (chartData.length === 0) {
    return <div className="flex h-70 items-center justify-center text-sm text-text-faint">No data for this period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={chartData} dataKey="revenue" nameKey="label" innerRadius={60} outerRadius={95} paddingAngle={2} stroke="none">
          {chartData.map((d) => (
            <Cell key={d.category} fill={d.color} />
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
