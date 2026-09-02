import { useEffect, useState } from "react";
import { Topbar } from "../../components/layout/Topbar";
import { StatCard } from "../../components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { DateRangePicker, presetRange } from "../../components/analytics/DateRangePicker";
import { RevenueTrendChart } from "../../components/analytics/RevenueTrendChart";
import { RevenueByCategoryChart } from "../../components/analytics/RevenueByCategoryChart";
import { RevenueByProductChart } from "../../components/analytics/RevenueByProductChart";
import { PaymentMethodChart } from "../../components/analytics/PaymentMethodChart";
import { OrdersTrendChart } from "../../components/analytics/OrdersTrendChart";
import {
  analyticsApi,
  type CategoryRevenue,
  type DateRange,
  type KpiSummary,
  type OrdersTrendPoint,
  type PaymentMethodAmount,
  type ProductRevenue,
  type RevenuePoint,
} from "../../lib/analyticsApi";
import { formatCurrency } from "../../lib/format";

export function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>(presetRange("week"));
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [trend, setTrend] = useState<RevenuePoint[]>([]);
  const [byCategory, setByCategory] = useState<CategoryRevenue[]>([]);
  const [byProduct, setByProduct] = useState<ProductRevenue[]>([]);
  const [byPayment, setByPayment] = useState<PaymentMethodAmount[]>([]);
  const [ordersTrend, setOrdersTrend] = useState<OrdersTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsApi.summary(range),
      analyticsApi.revenueTrend(range),
      analyticsApi.revenueByCategory(range),
      analyticsApi.revenueByProduct(range),
      analyticsApi.paymentMethods(range),
      analyticsApi.ordersTrend(range),
    ])
      .then(([s, t, c, p, pm, ot]) => {
        setSummary(s.data);
        setTrend(t.data);
        setByCategory(c.data);
        setByProduct(p.data);
        setByPayment(pm.data);
        setOrdersTrend(ot.data);
      })
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  const totalItems = ordersTrend.reduce((s, d) => s + d.items, 0);
  const totalOrders = ordersTrend.reduce((s, d) => s + d.orders, 0);

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
              </CardHeader>
              <RevenueByCategoryChart data={byCategory} />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method Breakdown</CardTitle>
              </CardHeader>
              <PaymentMethodChart data={byPayment} />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Stations / Products by Revenue</CardTitle>
              </CardHeader>
              <RevenueByProductChart data={byProduct} />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Orders Over Time</CardTitle>
                <span className="text-xs text-text-faint">
                  {totalOrders} orders · {totalItems} items sold
                </span>
              </CardHeader>
              <OrdersTrendChart data={ordersTrend} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
