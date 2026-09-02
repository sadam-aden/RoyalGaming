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
  category: string;
  revenue: number;
}

export interface ProductRevenue {
  name: string;
  revenue: number;
  quantity: number;
}

export interface PaymentMethodAmount {
  method: string;
  amount: number;
}

export interface OrdersTrendPoint {
  date: string;
  orders: number;
  items: number;
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
  paymentMethods: (range: DateRange) =>
    api.get<PaymentMethodAmount[]>("/analytics/payment-methods", { params: range }),
  ordersTrend: (range: DateRange) => api.get<OrdersTrendPoint[]>("/analytics/orders-trend", { params: range }),
};
