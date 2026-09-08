import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Minus, Plus, Smartphone, Trash2, Wallet } from "lucide-react";
import { useCartStore } from "../../store/cartStore";
import { Button } from "../ui/Button";
import { formatCurrency } from "../../lib/format";
import { customersApi, discountsApi, ordersApi, settingsApi, staffApi } from "../../lib/resources";
import { apiErrorMessage } from "../../lib/api";
import type { Customer, Discount, OrderType, PaymentMethod, StaffMember } from "../../types";

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "WALK", label: "Walk-in" },
  { value: "DINE", label: "Dine-in" },
  { value: "DELIVERY", label: "Delivery" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof Wallet }[] = [
  { value: "MOBILE", label: "Mobile", icon: Smartphone },
  { value: "CASH", label: "Cash", icon: Wallet },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "CREDIT", label: "Credit", icon: CreditCard },
];

export function CartPanel({ onOrderComplete }: { onOrderComplete: () => void }) {
  const { lines, orderType, customerId, waiterId, discountId, incrementQty, decrementQty, removeItem, setOrderType, setCustomerId, setWaiterId, setDiscountId, clear } =
    useCartStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>("MOBILE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    customersApi.list().then((r) => setCustomers(r.data));
    staffApi.list().then((r) => setStaff(r.data));
    discountsApi.list().then((r) => setDiscounts(r.data.filter((d) => d.active)));
    settingsApi.get().then((r) => setTaxRate(r.data.taxRate));
  }, []);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.price * l.quantity, 0), [lines]);
  const discount = discounts.find((d) => d.id === discountId) ?? null;
  const discountAmount = discount
    ? Math.min(discount.type === "PERCENT" ? subtotal * (discount.value / 100) : discount.value, subtotal)
    : 0;
  const taxAmount = (subtotal - discountAmount) * taxRate;
  const total = subtotal - discountAmount + taxAmount;

  async function submit(hold: boolean) {
    if (lines.length === 0) return;
    if (!hold && !paymentMethod) {
      setError("Select a payment method");
      return;
    }
    if (!hold && paymentMethod === "CREDIT" && !customerId) {
      setError("Credit payments require a customer");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await ordersApi.create({
        type: orderType,
        customerId,
        waiterId,
        discountId: discount?.id,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        hold,
        paymentMethod: hold ? undefined : paymentMethod ?? undefined,
      });
      clear();
      setPaymentMethod("MOBILE");
      onOrderComplete();
      // A completed sale goes straight to its printable receipt; held orders
      // stay on the POS since they are not finished yet.
      if (!hold) navigate(`/print/order/${res.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full w-96 shrink-0 flex-col border-l border-border bg-surface">
      <div className="border-b border-border-soft p-4">
        <div className="flex gap-1.5 rounded-xl bg-surface-alt p-1">
          {ORDER_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setOrderType(t.value)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                orderType === t.value ? "bg-accent text-white" : "text-text-muted hover:text-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            value={customerId ?? ""}
            onChange={(e) => setCustomerId(e.target.value || undefined)}
            className="rounded-lg border border-border bg-surface-alt px-2 py-1.5 text-xs text-text outline-none"
          >
            <option value="">No customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={waiterId ?? ""}
            onChange={(e) => setWaiterId(e.target.value || undefined)}
            className="rounded-lg border border-border bg-surface-alt px-2 py-1.5 text-xs text-text outline-none"
          >
            <option value="">No waiter</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {lines.length === 0 ? (
          <p className="mt-8 text-center text-sm text-text-faint">Cart is empty. Tap a product to add it.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {lines.map((line) => (
              <div key={line.key} className="flex items-start justify-between gap-2 rounded-xl bg-surface-alt p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-text">{line.name}</div>
                  <div className="text-xs text-text-muted">{formatCurrency(line.price)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => decrementQty(line.key)} className="rounded-md bg-surface p-1 text-text-muted hover:text-text">
                      <Minus size={12} />
                    </button>
                    <span className="w-4 text-center text-xs text-text">{line.quantity}</span>
                    <button onClick={() => incrementQty(line.key)} className="rounded-md bg-surface p-1 text-text-muted hover:text-text">
                      <Plus size={12} />
                    </button>
                  </div>
                  <button onClick={() => removeItem(line.key)} className="text-text-faint hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border-soft p-4">
        <select
          value={discountId ?? ""}
          onChange={(e) => setDiscountId(e.target.value || undefined)}
          className="mb-3 w-full rounded-lg border border-border bg-surface-alt px-2 py-1.5 text-xs text-text outline-none"
        >
          <option value="">No discount</option>
          {discounts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.type === "PERCENT" ? `${d.value}%` : formatCurrency(d.value)})
            </option>
          ))}
        </select>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-accent">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {taxRate > 0 && (
            <div className="flex justify-between text-text-muted">
              <span>Tax</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border-soft pt-1.5 text-base font-semibold text-text">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setPaymentMethod(m.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-medium transition-colors ${
                paymentMethod === m.value ? "border-accent bg-accent-soft text-accent" : "border-border text-text-muted hover:bg-surface-alt"
              }`}
            >
              <m.icon size={14} />
              {m.label}
            </button>
          ))}
        </div>

        {error && <p className="mt-2 text-xs text-danger">{error}</p>}

        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" disabled={busy || lines.length === 0} onClick={() => submit(true)}>
            Hold
          </Button>
          <Button size="sm" className="flex-1" disabled={busy || lines.length === 0} onClick={() => submit(false)}>
            {busy ? "Processing..." : "Create Order"}
          </Button>
        </div>
      </div>

    </div>
  );
}
