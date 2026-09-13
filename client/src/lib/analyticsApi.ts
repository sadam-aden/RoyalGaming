import { api } from "./api";

export interface KpiSummary {
  current: { cashRevenue: number; creditOutstanding: number; expenses: number; netInflow: number };
  previous: { cashRevenue: number; creditOutstanding: number; expenses: number; netInflow: number };
  change: { cashRevenue: number; creditOutstanding: number; expenses: number; netInflow: number };
}

export interface RevenuePoint {
  date: string;
  revenue: number;
}

export interface CategoryRevenue {
  /** Category id. */
  category: string;
  name: string;
  color: string;
  revenue: number;
  quantity: number;
}

export interface ProductRevenue {
  name: string;
  revenue: number;
  quantity: number;
}

export interface RecentOrderItem {
  name: string;
  quantity: number;
  lineTotal: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: number;
  createdAt: string;
  total: number;
  paymentMethod: string | null;
  items: RecentOrderItem[];
}

export interface RecentOrders {
  orders: RecentOrder[];
  /** Across the whole range, not just the receipts listed. */
  totalOrders: number;
  totalItems: number;
}

export interface DateRange {
  from: string;
  to: string;
}

export const analyticsApi = {
  summary: (range: DateRange) => api.get<KpiSummary>("/analytics/summary", { params: range }),
  revenueTrend: (range: DateRange) => api.get<RevenuePoint[]>("/analytics/revenue-trend", { params: range }),
  revenueByCategory: (range: DateRange) =>
    api.get<CategoryRevenue[]>("/analytics/revenue-by-category", { params: range }),
  revenueByProduct: (range: DateRange) =>
    api.get<ProductRevenue[]>("/analytics/revenue-by-product", { params: range }),
  recentOrders: (range: DateRange, limit = 10) =>
    api.get<RecentOrders>("/analytics/recent-orders", { params: { ...range, limit } }),
};
