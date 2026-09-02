import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Topbar } from "../../components/layout/Topbar";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { discountsAdminApi } from "../../lib/discountsAdminApi";
import { apiErrorMessage } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";
import type { Discount, DiscountType } from "../../types";

export function DiscountsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role) === "ADMIN";
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<DiscountType>("PERCENT");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    setLoading(true);
    discountsAdminApi
      .list()
      .then((r) => setDiscounts(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedValue = Number(value);
    if (!name.trim() || !parsedValue || parsedValue <= 0) {
      setError("Enter a name and a valid value");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await discountsAdminApi.create({ name: name.trim(), type, value: parsedValue });
      setName("");
      setValue("");
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(d: Discount) {
    await discountsAdminApi.update(d.id, { active: !d.active });
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this discount?")) return;
    await discountsAdminApi.remove(id);
    refresh();
  }

  return (
    <div>
      <Topbar title="Discount Offers" subtitle="Create and manage discounts available at POS" />

      <div className="grid grid-cols-1 gap-6 p-8 xl:grid-cols-3">
        {isAdmin && (
          <Card className="xl:col-span-1">
            <h3 className="mb-4 text-sm font-semibold text-text">New Discount</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Weekday Happy Hour"
                  className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
                />
              </div>
              <div className="flex gap-1 rounded-xl bg-surface-alt p-1">
                {(["PERCENT", "FLAT"] as DiscountType[]).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                      type === t ? "bg-accent text-white" : "text-text-muted hover:text-text"
                    }`}
                  >
                    {t === "PERCENT" ? "% Percent" : "Flat Amount"}
                  </button>
                ))}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">
                  Value {type === "PERCENT" ? "(%)" : "(amount)"}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
                />
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <Button type="submit" disabled={submitting}>
                <Plus size={14} /> {submitting ? "Saving..." : "Create Discount"}
              </Button>
            </form>
          </Card>
        )}

        <Card className={isAdmin ? "xl:col-span-2" : "xl:col-span-3"}>
          <h3 className="mb-4 text-sm font-semibold text-text">All Discounts</h3>
          {loading ? (
            <p className="text-sm text-text-faint">Loading...</p>
          ) : discounts.length === 0 ? (
            <p className="text-sm text-text-faint">No discounts created yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {discounts.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <div className="text-sm font-medium text-text">{d.name}</div>
                    <div className="text-xs text-text-faint">
                      {d.type === "PERCENT" ? `${d.value}% off` : `${formatCurrency(d.value)} off`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={d.active ? "green" : "neutral"}>{d.active ? "Active" : "Inactive"}</Badge>
                    {isAdmin && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => toggleActive(d)}>
                          {d.active ? "Disable" : "Enable"}
                        </Button>
                        <button onClick={() => handleDelete(d.id)} className="text-text-faint hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
