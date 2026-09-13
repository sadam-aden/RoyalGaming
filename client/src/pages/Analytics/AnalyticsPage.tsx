import { useEffect, useState } from "react";
import { Topbar } from "../../components/layout/Topbar";
import { StatCard } from "../../components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { DateRangePicker, presetRange } from "../../components/analytics/DateRangePicker";
import { RevenueTrendChart } from "../../components/analytics/RevenueTrendChart";
import { RevenueByCategoryChart } from "../../components/analytics/RevenueByCategoryChart";
import { RevenueByCategoryBarChart } from "../../components/analytics/RevenueByCategoryBarChart";
import { RecentOrdersList } from "../../components/analytics/RecentOrdersList";
import {
  analyticsApi,
  type CategoryRevenue,
  type DateRange,
  type KpiSummary,
  type RecentOrders,
  type RevenuePoint,
} from "../../lib/analyticsApi";
import { apiErrorMessage } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

export function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>(presetRange("week"));
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [trend, setTrend] = useState<RevenuePoint[]>([]);
  const [byCategory, setByCategory] = useState<CategoryRevenue[]>([]);
  const [recent, setRecent] = useState<RecentOrders | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Changing the range quickly fires overlapping batches; without this guard a
    // slow earlier one can land last and leave the page showing another period.
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      analyticsApi.summary(range),
      analyticsApi.revenueTrend(range),
      analyticsApi.revenueByCategory(range),
      analyticsApi.recentOrders(range),
    ])
      .then(([s, t, c, r]) => {
        if (cancelled) return;
        setSummary(s.data);
        setTrend(t.data);
        setByCategory(c.data);
        setRecent(r.data);
      })
      // Previously there was no catch at all: a failed request left the page
      // stuck on "Loading analytics..." with nothing said about why.
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to]);

  return (
    <div>
      <Topbar title="Analytics" subtitle="Revenue, expenses, and performance at a glance" />

      <div className="p-8">
        <DateRangePicker onChange={setRange} />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Cash Revenue"
            value={formatCurrency(summary?.current.cashRevenue ?? 0)}
            changePct={summary?.change.cashRevenue}
            tone="accent"
          />
          <StatCard
            label="Credit / Balance Outstanding"
            value={formatCurrency(summary?.current.creditOutstanding ?? 0)}
            changePct={summary?.change.creditOutstanding}
          />
          <StatCard
            label="Expenses"
            value={formatCurrency(summary?.current.expenses ?? 0)}
            changePct={summary?.change.expenses}
          />
          <StatCard
            label="Net Inflow"
            value={formatCurrency(summary?.current.netInflow ?? 0)}
            changePct={summary?.change.netInflow}
          />
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm text-text">{error}</div>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-text-muted">Loading analytics...</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <RevenueTrendChart data={trend} />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
                <span className="text-xs text-text-faint">Share</span>
              </CardHeader>
              <RevenueByCategoryChart data={byCategory} />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
                <span className="text-xs text-text-faint">Amounts</span>
              </CardHeader>
              <RevenueByCategoryBarChart data={byCategory} />
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <span className="text-xs text-text-faint">
                  {recent
                    ? `Last ${recent.orders.length} of ${recent.totalOrders} orders · ${recent.totalItems} items sold`
                    : ""}
                </span>
              </CardHeader>
              <RecentOrdersList orders={recent?.orders ?? []} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
