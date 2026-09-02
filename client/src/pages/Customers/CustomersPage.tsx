import { Plus, Search, User } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Topbar } from "../../components/layout/Topbar";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { customersApi } from "../../lib/resources";
import { apiErrorMessage } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { Customer } from "../../types";

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  function refresh(q?: string) {
    setLoading(true);
    customersApi
      .list(q)
      .then((r) => setCustomers(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => refresh(), []);

  useEffect(() => {
    const id = setTimeout(() => refresh(search || undefined), 300);
    return () => clearTimeout(id);
  }, [search]);

  return (
    <div>
      <Topbar
        title="Customers"
        subtitle="Profiles, visit history, and balances"
        actions={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Customer
          </Button>
        }
      />

      <div className="p-8">
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full rounded-xl border border-border bg-surface-alt py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <Card className="mt-6">
          {loading ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : customers.length === 0 ? (
            <p className="text-sm text-text-faint">No customers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-faint">
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Phone</th>
                    <th className="pb-3 pr-4 font-medium">Visits</th>
                    <th className="pb-3 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-border-soft/60 text-text">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-text-muted">
                            <User size={14} />
                          </div>
                          {c.name}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-text-muted">{c.phone || "—"}</td>
                      <td className="py-3 pr-4 text-text-muted">{c.visitCount}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(c.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {showNew && <NewCustomerModal onClose={() => setShowNew(false)} onCreated={() => refresh(search || undefined)} />}
    </div>
  );
}

function NewCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await customersApi.create({ name: name.trim(), phone: phone.trim() || undefined });
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="New Customer" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Phone (optional)</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Create"}
        </Button>
      </form>
    </Modal>
  );
}
