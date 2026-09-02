import { format } from "date-fns";
import { formatCurrency } from "../../lib/format";
import type { Order } from "../../types";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOBILE: "Mobile",
  CREDIT: "Credit",
};

export function ReceiptTemplate({ order }: { order: Order }) {
  return (
    <div className="receipt-print-area font-mono text-[13px] leading-relaxed text-black">
      <div className="text-center">
        <div className="text-base font-bold">Royal Gaming &amp; Cafeteria</div>
        <div className="text-xs">POS + Session Management</div>
      </div>

      <div className="my-3 border-t border-dashed border-black/40" />

      <div className="flex justify-between">
        <span>Order #{order.orderNumber}</span>
        <span>{format(new Date(order.createdAt), "MM/dd/yy h:mm a")}</span>
      </div>
      <div className="flex justify-between">
        <span>Type</span>
        <span>{order.type}</span>
      </div>
      {order.customer && (
        <div className="flex justify-between">
          <span>Customer</span>
          <span>{order.customer.name}</span>
        </div>
      )}
      {order.waiter && (
        <div className="flex justify-between">
          <span>Waiter</span>
          <span>{order.waiter.name}</span>
        </div>
      )}
      {order.createdBy && (
        <div className="flex justify-between">
          <span>Cashier</span>
          <span>{order.createdBy.name}</span>
        </div>
      )}

      <div className="my-3 border-t border-dashed border-black/40" />

      <div className="flex justify-between font-bold">
        <span className="w-1/2">Item</span>
        <span className="w-1/4 text-center">Qty</span>
        <span className="w-1/4 text-right">Amount</span>
      </div>
      {order.items.map((item) => (
        <div key={item.id} className="flex justify-between">
          <span className="w-1/2 truncate">{item.product.name}</span>
          <span className="w-1/4 text-center">{item.quantity}</span>
          <span className="w-1/4 text-right">{formatCurrency(item.lineTotal)}</span>
        </div>
      ))}

      <div className="my-3 border-t border-dashed border-black/40" />

      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatCurrency(order.subtotal)}</span>
      </div>
      {order.discountAmount > 0 && (
        <div className="flex justify-between">
          <span>Discount{order.discount ? ` (${order.discount.name})` : ""}</span>
          <span>-{formatCurrency(order.discountAmount)}</span>
        </div>
      )}
      {order.taxAmount > 0 && (
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatCurrency(order.taxAmount)}</span>
        </div>
      )}
      <div className="flex justify-between text-base font-bold">
        <span>Total</span>
        <span>{formatCurrency(order.total)}</span>
      </div>

      <div className="my-3 border-t border-dashed border-black/40" />

      <div className="flex justify-between">
        <span>Paid via</span>
        <span>{order.paymentMethod ? PAYMENT_LABELS[order.paymentMethod] : "—"}</span>
      </div>

      <div className="mt-4 text-center text-xs">Thank you for visiting!</div>
    </div>
  );
}
