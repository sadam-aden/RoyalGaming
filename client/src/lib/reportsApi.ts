import { api } from "./api";

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  revenue: number;
  expenses: number;
  netInflow: number;
  ordersCount: number;
  sessionsCount: number;
  topProducts: { name: string; revenue: number; quantity: number }[];
}

export interface VatReport {
  from: string;
  to: string;
  ordersCount: number;
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  total: number;
}

export const reportsApi = {
  weekly: (date?: string) => api.get<WeeklyReport>("/reports/weekly", { params: date ? { date } : undefined }),
  weeklyCsv: (date?: string) =>
    api.get("/reports/weekly", { params: { date, format: "csv" }, responseType: "blob" }),
  vat: (from: string, to: string) => api.get<VatReport>("/reports/vat", { params: { from, to } }),
  vatCsv: (from: string, to: string) =>
    api.get("/reports/vat", { params: { from, to, format: "csv" }, responseType: "blob" }),
  general: (from: string, to: string, type: "orders" | "sessions") =>
    api.get<Record<string, unknown>[]>("/reports/general", { params: { from, to, type } }),
  generalCsv: (from: string, to: string, type: "orders" | "sessions") =>
    api.get("/reports/general", { params: { from, to, type, format: "csv" }, responseType: "blob" }),
};
