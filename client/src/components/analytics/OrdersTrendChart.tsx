import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import type { OrdersTrendPoint } from "../../lib/analyticsApi";
import { CHART_AXIS, CHART_COLORS, CHART_GRID } from "../../lib/chartTheme";
import { ChartTooltip } from "./ChartTooltip";

export function OrdersTrendChart({ data }: { data: OrdersTrendPoint[] }) {
  if (data.length === 0) {
    return <div className="flex h-70 items-center justify-center text-sm text-text-faint">No data for this period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => format(new Date(d), "MMM d")}
          stroke={CHART_AXIS}
          tick={{ fill: CHART_AXIS, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID }}
          tickLine={false}
        />
        <YAxis stroke={CHART_AXIS} tick={{ fill: CHART_AXIS, fontSize: 12 }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
        <Tooltip
          content={<ChartTooltip labelFormatter={(d) => format(new Date(d), "MMM d, yyyy")} />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="orders" name="Orders" fill={CHART_COLORS.violet} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
