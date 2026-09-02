import { api } from "./api";
import type { Expense } from "../types";

export interface ExpensePayload {
  category: string;
  amount: number;
  note?: string;
  date?: string;
}

export const expensesApi = {
  list: (from?: string, to?: string) => api.get<Expense[]>("/expenses", { params: { from, to } }),
  create: (data: ExpensePayload) => api.post<Expense>("/expenses", data),
  update: (id: string, data: Partial<ExpensePayload>) => api.patch<Expense>(`/expenses/${id}`, data),
  remove: (id: string) => api.delete(`/expenses/${id}`),
};
