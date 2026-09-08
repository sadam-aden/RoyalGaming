import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { ordersApi } from "../../lib/resources";
import { apiErrorMessage } from "../../lib/api";
import { ReceiptTemplate } from "../../components/pos/ReceiptTemplate";
import { Button } from "../../components/ui/Button";
import type { Order } from "../../types";

/**
 * Standalone print view for a single order.
 *
 * The receipt is one A6 page (a quarter of A4). What is on screen here is
 * exactly what the printer produces — the page is rendered at real millimetre
 * dimensions rather than being restyled at print time.
 */
export function PrintReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    ordersApi
      .get(id)
      .then((r) => setOrder(r.data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [id]);

  useEffect(() => {
    if (order) document.title = `Receipt — Order #${order.orderNumber}`;
  }, [order]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-8">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-8">
        <p className="text-sm text-text-muted">Loading receipt...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Toolbar is screen-only; the printed output is the receipt alone. */}
      <div className="flex items-center justify-between gap-4 border-b border-border-soft bg-surface px-6 py-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/pos")}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-alt hover:text-text"
            title="Back to POS"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-text">Receipt — Order #{order.orderNumber}</h1>
            <p className="text-xs text-text-muted">Prints as one A6 page (105 × 148 mm).</p>
          </div>
        </div>
        <Button onClick={() => window.print()}>
          <Printer size={14} /> Print
        </Button>
      </div>

      <div className="flex justify-center p-8 print:p-0">
        <PrintSheet order={order} />
      </div>
    </div>
  );
}

function PrintSheet({ order }: { order: Order }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Shrink the receipt to fit the page if a long order would otherwise run off
  // the bottom. Runs before paint so the printed page and the on-screen preview
  // never disagree.
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const content = contentRef.current;
    if (!sheet || !content) return;

    // clientHeight includes the page's padding, so subtract it — otherwise the
    // receipt is scaled to the padded box and still spills off the page.
    const styles = getComputedStyle(sheet);
    const available = sheet.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);

    // Scaling down is compensated with a matching width increase so the receipt
    // still spans the full width of the page rather than shrinking into the
    // corner. That reflows the text, changing its height, so converge over a
    // few passes instead of trusting the first estimate.
    let next = 1;
    for (let pass = 0; pass < 5; pass++) {
      content.style.transformOrigin = "top left";
      content.style.transform = `scale(${next})`;
      content.style.width = `${100 / next}%`;
      const rendered = content.getBoundingClientRect().height; // visual height, scale included
      if (rendered <= available) break;
      next *= (available / rendered) * 0.99; // small margin so rounding cannot push it over
    }
    setScale(next);
  }, [order]);

  return (
    <div ref={sheetRef} className="print-sheet">
      <div
        ref={contentRef}
        style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: `${100 / scale}%` }}
      >
        <ReceiptTemplate order={order} />
      </div>
    </div>
  );
}
