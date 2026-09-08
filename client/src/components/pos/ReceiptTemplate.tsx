import { format } from "date-fns";
import type { ReactNode } from "react";
import { formatCurrency } from "../../lib/format";
import type { Order } from "../../types";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOBILE: "Mobile",
  CREDIT: "Credit",
};

/**
 * A label/value line on the receipt.
 *
 * On a narrow thermal roll there is often not enough width for both halves, so
 * the label is kept whole (`shrink-0`) and the value is allowed to drop onto its
 * own line rather than the two halves being squeezed until they break
 * mid-phrase — which is what turned "Order #22" into "Order" / "#22".
 */
function Row({ label, value, className = "" }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap justify-between gap-x-2 ${className}`}>
      <span className="shrink-0">{label}</span>
      <span className="ml-auto text-right">{value}</span>
    </div>
  );
}

export function ReceiptTemplate({ order }: { order: Order }) {
  return (
    <div className="receipt-print-area font-mono text-[12px] font-bold leading-tight text-black">
      <div className="text-center">
        <div className="text-[1.2em] font-bold">Royal Gaming &amp; Cafeteria</div>
        <div className="text-[0.85em] font-normal">POS + Session Management</div>
      </div>

      <div className="my-1.5 border-t border-dashed border-black/40" />

      <Row label={`Order #${order.orderNumber}`} value={format(new Date(order.createdAt), "MM/dd/yy h:mm a")} />
      <Row label="Type" value={order.type} />
      {order.customer && <Row label="Customer" value={order.customer.name} />}
      {order.waiter && <Row label="Waiter" value={order.waiter.name} />}
      {order.createdBy && <Row label="Cashier" value={order.createdBy.name} />}

      <div className="my-1.5 border-t border-dashed border-black/40" />

      <div className="flex justify-between">
        <span className="w-[55%]">Item</span>
        <span className="w-[15%] text-center">Qty</span>
        <span className="w-[30%] text-right">Amount</span>
      </div>
      {order.items.map((item) => (
        <div key={item.id} className="flex justify-between">
          {/* Wrap rather than truncate — on a narrow roll most product names are
              wider than the column, and a cut-off name on the customer's copy
              is worse than one that runs onto a second line. */}
          <span className="w-[55%] break-words pr-1">{item.product.name}</span>
          <span className="w-[15%] text-center">{item.quantity}</span>
          <span className="w-[30%] text-right">{formatCurrency(item.lineTotal)}</span>
        </div>
      ))}

      <div className="my-1.5 border-t border-dashed border-black/40" />

      <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
      {order.discountAmount > 0 && (
        <Row
          label={`Discount${order.discount ? ` (${order.discount.name})` : ""}`}
          value={`-${formatCurrency(order.discountAmount)}`}
        />
      )}
      {order.taxAmount > 0 && <Row label="Tax" value={formatCurrency(order.taxAmount)} />}
      <Row label="Total" value={formatCurrency(order.total)} className="text-[1.2em]" />

      <div className="my-1.5 border-t border-dashed border-black/40" />

      <Row label="Paid via" value={order.paymentMethod ? PAYMENT_LABELS[order.paymentMethod] : "—"} />

      <div className="mt-2 text-center text-[0.85em] font-normal">Thank you for visiting!</div>
    </div>
  );
}
