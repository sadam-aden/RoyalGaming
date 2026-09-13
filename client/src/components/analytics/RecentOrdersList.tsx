import { format } from "date-fns";
import type { RecentOrder } from "../../lib/analyticsApi";
import { formatCurrency } from "../../lib/format";

/**
 * The last receipts, as receipts — order number, what was on them, what they
 * came to.
 *
 * This replaced an orders-per-day bar chart. The chart could tell you that
 * Tuesday was busy; it could not tell you what anyone actually bought, which is
 * the thing you look up when you are checking a sale.
 */
export function RecentOrdersList({ orders }: { orders: RecentOrder[] }) {
  if (orders.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-text-faint">No orders in this period</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-faint">
            <th className="py-2 pr-3 font-medium">Order</th>
            <th className="py-2 pr-3 font-medium">Time</th>
            <th className="py-2 pr-3 font-medium">Items</th>
            <th className="py-2 pr-3 text-right font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const quantity = order.items.reduce((sum, i) => sum + i.quantity, 0);
            return (
              <tr key={order.id} className="border-b border-border-soft align-top last:border-0">
                <td className="whitespace-nowrap py-2.5 pr-3 font-medium text-text">#{order.orderNumber}</td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-text-muted">
                  {format(new Date(order.createdAt), "d MMM, h:mm a")}
                </td>
                <td className="py-2.5 pr-3 text-text">
                  {/* One line per product, so a receipt with six things on it
                      stays readable instead of becoming a run-on sentence. */}
                  <div className="flex flex-col gap-0.5">
                    {order.items.map((item, i) => (
                      <span key={i}>
                        {item.quantity > 1 && <span className="mr-1 text-text-faint">{item.quantity}&times;</span>}
                        {item.name}
                        <span className="ml-2 text-xs text-text-faint">{formatCurrency(item.lineTotal)}</span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-text-muted">{quantity}</td>
                <td className="py-2.5 text-right font-medium tabular-nums text-text">{formatCurrency(order.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
