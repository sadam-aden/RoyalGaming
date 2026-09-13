import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_AXIS, CHART_COLORS, CHART_GRID } from "../../lib/chartTheme";
import { ChartTooltip } from "../analytics/ChartTooltip";

export interface RankedBarDatum {
  label: string;
  value: number;
  color?: string;
}

/**
 * A horizontal ranking, by whatever measure the caller is ranking on.
 *
 * The analytics RevenueByProductChart does nearly this, but it hardcodes
 * `dataKey="revenue"`, a currency formatter and the ProductRevenue type, so it
 * can only ever draw money. This one takes the measure already resolved to
 * `value`, which is what lets the page swap between units and revenue.
 */
export function RankedBarChart({
  data,
  valueName = "Value",
  formatValue = (v: number) => `${v}`,
}: {
  data: RankedBarDatum[];
  valueName?: string;
  formatValue?: (value: number) => string;
}) {
  if (data.length === 0) {
    return <div className="flex h-70 items-center justify-center text-sm text-text-faint">No data for this period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID} horizontal={false} />
        <XAxis
          type="number"
          stroke={CHART_AXIS}
          tick={{ fill: CHART_AXIS, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID }}
          tickLine={false}
          tickFormatter={formatValue}
        />
        <YAxis
          type="category"
          dataKey="label"
          stroke={CHART_AXIS}
          tick={{ fill: CHART_AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip cursor={{ fill: CHART_GRID, fillOpacity: 0.3 }} content={<ChartTooltip formatter={formatValue} />} />
        <Bar dataKey="value" name={valueName} radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color ?? CHART_COLORS.aqua} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
