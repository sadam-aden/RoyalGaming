import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { Topbar } from "../../components/layout/Topbar";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { expensesApi } from "../../lib/expensesApi";
import { apiErrorMessage } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { Expense } from "../../types";

const CATEGORIES = ["Supplies", "Maintenance", "Utilities", "Salaries", "Rent", "Marketing", "Other"];

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    setLoading(true);
    expensesApi
      .list()
      .then((r) => setExpenses(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await expensesApi.create({ category, amount: parsedAmount, note: note || undefined, date });
      setAmount("");
      setNote("");
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    await expensesApi.remove(id);
    refresh();
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <Topbar title="Expenses" subtitle="Track business costs that feed into Net Inflow" />

      <div className="grid grid-cols-1 gap-6 p-8 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <h3 className="mb-4 text-sm font-semibold text-text">Log an Expense</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Amount</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Notes</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
              />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button type="submit" disabled={submitting}>
              <Plus size={14} /> {submitting ? "Saving..." : "Add Expense"}
            </Button>
          </form>
        </Card>

        <Card className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">All Expenses</h3>
            <span className="text-sm font-semibold text-text">Total: {formatCurrency(total)}</span>
          </div>
          {loading ? (
            <p className="text-sm text-text-faint">Loading...</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-text-faint">No expenses logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-faint">
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Category</th>
                    <th className="pb-3 pr-4 font-medium">Note</th>
                    <th className="pb-3 pr-4 text-right font-medium">Amount</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-border-soft/60 text-text">
                      <td className="py-3 pr-4 text-text-muted">{format(new Date(e.date), "MMM d, yyyy")}</td>
                      <td className="py-3 pr-4">{e.category}</td>
                      <td className="py-3 pr-4 text-text-muted">{e.note || "—"}</td>
                      <td className="py-3 pr-4 text-right font-medium">{formatCurrency(e.amount)}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => handleDelete(e.id)} className="text-text-faint hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
