import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ordersApi } from "../../lib/resources";
import { apiErrorMessage } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { Order, PaymentMethod } from "../../types";

const METHODS: PaymentMethod[] = ["MOBILE", "CASH", "CARD", "CREDIT"];

export function HeldOrdersDrawer({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function refresh() {
    setLoading(true);
    ordersApi
      .list("HELD")
      .then((r) => setOrders(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleCheckout(id: string, method: PaymentMethod) {
    setError(null);
    try {
      const res = await ordersApi.checkout(id, method);
      setCheckoutOrderId(null);
      refresh();
      onChanged();
      // Settling a held order completes the sale, so go to its receipt.
      navigate(`/print/order/${res.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this held order?")) return;
    try {
      await ordersApi.cancel(id);
      refresh();
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Modal title="Held Orders" onClose={onClose}>
      {loading ? (
        <p className="text-sm text-text-faint">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-text-faint">No held orders.</p>
      ) : (
        <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text">Order #{order.orderNumber}</span>
                <span className="text-sm font-semibold text-text">{formatCurrency(order.total)}</span>
              </div>
              <ul className="mt-1.5 text-xs text-text-muted">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}x {item.product.name}
                  </li>
                ))}
              </ul>

              {checkoutOrderId === order.id ? (
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => handleCheckout(order.id, m)}
                      className="rounded-lg border border-border py-1.5 text-[11px] font-medium text-text hover:border-accent hover:text-accent"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => setCheckoutOrderId(order.id)}>
                    Checkout
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleCancel(order.id)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

    </Modal>
  );
}
