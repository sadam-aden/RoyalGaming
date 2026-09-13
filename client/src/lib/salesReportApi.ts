import { api } from "./api";
import type { Period } from "./period";

export interface SalesRankRow {
  /** Category id for category rows, product id for item rows. */
  key: string;
  label: string;
  /** Owning category's name — item rows only. */
  category?: string;
  /** The category's own colour, chosen by the admin on the Products page. */
  color: string;
  /** Units sold — the "most used" measure. */
  quantity: number;
  revenue: number;
  orders: number;
  quantityShare: number;
  revenueShare: number;
}

export interface SalesReport {
  range: { from: string; to: string; timeZone: string; days: number };
  generatedAt: string;
  totals: {
    revenue: number;
    netSales: number;
    tax: number;
    discounts: number;
    orders: number;
    itemsSold: number;
    avgOrderValue: number;
    expenses: number;
    netInflow: number;
  };
  categories: SalesRankRow[];
  products: SalesRankRow[];
  productCount: number;
  trend: { date: string; revenue: number; orders: number; items: number }[];
  highlights: {
    topCategoryByQuantity: SalesRankRow | null;
    topCategoryByRevenue: SalesRankRow | null;
    topItemByQuantity: SalesRankRow | null;
    topItemByRevenue: SalesRankRow | null;
  };
}

/** What the on-screen item table shows. The CSV takes the lot. */
const SCREEN_ITEM_LIMIT = 15;
const EXPORT_ITEM_LIMIT = 200;

export const salesReportApi = {
  get: (period: Period, limit = SCREEN_ITEM_LIMIT) =>
    api.get<SalesReport>("/reports/sales", { params: { from: period.from, to: period.to, limit } }),
  csv: (period: Period) =>
    api.get("/reports/sales", {
      params: { from: period.from, to: period.to, limit: EXPORT_ITEM_LIMIT, format: "csv" },
      responseType: "blob",
    }),
};

export { SCREEN_ITEM_LIMIT };
