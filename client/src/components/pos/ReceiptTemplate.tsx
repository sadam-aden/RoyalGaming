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
 * The printable strip of a thermal roll fits roughly two dozen characters, so
 * there is often not enough width for both halves. Wrapping does the work: the
 * value drops onto its own line rather than the two halves being squeezed until
 * they break mid-phrase — which is what turned "Order #22" into "Order" /
 * "#22". A flex line only shrinks an item that is wider than the strip all by
 * itself, so `min-w-0` is what keeps that case (a discount named at length) on
 * the paper instead of running off the right edge.
 */
function Row({ label, value, className = "" }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap justify-between gap-x-2 ${className}`}>
      <span className="min-w-0">{label}</span>
      <span className="ml-auto min-w-0 text-right">{value}</span>
    </div>
  );
}

/**
 * One line of the item list: quantity and name on the left, amount on the
 * right.
 *
 * Quantity rides along with the name instead of holding a column of its own —
 * a third column would cost more width in gaps and padding than the one or two
 * digits it carries, and on this paper that width is better spent on the name.
 * The name column is `minmax(0, 1fr)` so it absorbs the wrapping, while the
 * amount is sized to its own content and never wraps or is squeezed.
 */
function ItemRow({ name, quantity, amount }: { name: ReactNode; quantity?: number; amount: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2">
      <span className="min-w-0">
        {quantity !== undefined && <span className="mr-1">{quantity}&times;</span>}
        {name}
      </span>
      <span className="whitespace-nowrap text-right">{amount}</span>
    </div>
  );
}

export function ReceiptTemplate({ order }: { order: Order }) {
  return (
    <div className="receipt-print-area font-mono text-[12px] font-bold leading-tight text-black">
      <div className="text-center">
        <div className="text-[1.1em] font-bold">Royal Gaming</div>
        <div className="text-[1.1em] font-bold">&amp; Cafeteria</div>
        <div className="text-[0.8em] font-normal">POS + Session Management</div>
      </div>

      <div className="my-1.5 border-t border-dashed border-black/40" />

      <Row label="Order" value={`#${order.orderNumber}`} />
      <Row label="Date" value={format(new Date(order.createdAt), "MM/dd/yy h:mm a")} />
      <Row label="Type" value={order.type} />
      {order.customer && <Row label="Customer" value={order.customer.name} />}
      {order.waiter && <Row label="Waiter" value={order.waiter.name} />}
      {order.createdBy && <Row label="Cashier" value={order.createdBy.name} />}

      <div className="my-1.5 border-t border-dashed border-black/40" />

      <ItemRow name="Item" amount="Amount" />
      {order.items.map((item) => (
        /* Wrap rather than truncate — on a narrow roll most product names are
           wider than the column, and a cut-off name on the customer's copy is
           worse than one that runs onto a second line. */
        <ItemRow
          key={item.id}
          name={item.product.name}
          quantity={item.quantity}
          amount={formatCurrency(item.lineTotal)}
        />
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
      <Row label="Total" value={formatCurrency(order.total)} className="text-[1.15em]" />

      <div className="my-1.5 border-t border-dashed border-black/40" />

      <Row label="Paid via" value={order.paymentMethod ? PAYMENT_LABELS[order.paymentMethod] : "—"} />

      <div className="mt-2 text-center text-[0.8em] font-normal">Thank you for visiting!</div>
    </div>
  );
}
