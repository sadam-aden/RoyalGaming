import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import type { RevenuePoint } from "../../lib/analyticsApi";
import { CHART_AXIS, CHART_COLORS, CHART_GRID } from "../../lib/chartTheme";
import { formatCurrency } from "../../lib/format";
import { ChartTooltip } from "./ChartTooltip";

export function RevenueTrendChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) return <EmptyState />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => format(new Date(d), "MMM d")}
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
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatter={(v) => formatCurrency(v)}
              labelFormatter={(d) => format(new Date(d), "MMM d, yyyy")}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={CHART_COLORS.blue}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_COLORS.blue, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function EmptyState() {
  return <div className="flex h-70 items-center justify-center text-sm text-text-faint">No data for this period</div>;
}
