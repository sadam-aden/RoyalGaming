import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { ReceiptTemplate } from "../components/pos/ReceiptTemplate";
import type { Order } from "../types";

/**
 * Print a receipt from wherever the sale was rung up.
 *
 * There is no separate receipt page to visit and no second Print button: the
 * receipt is rendered into the current document, off to the side of the
 * viewport where it is never seen, and `window.print()` opens Chrome's own
 * dialog on it. The print stylesheet hides the app and puts the receipt back
 * in the page flow, so the dialog previews the receipt alone, on the 72x105mm
 * page that stylesheet declares.
 */
export async function printReceipt(order: Order): Promise<void> {
  const host = document.createElement("div");
  host.className = "receipt-print-root";
  const sheet = document.createElement("div");
  sheet.className = "print-sheet";
  host.appendChild(sheet);
  document.body.appendChild(host);

  const root = createRoot(sheet);
  // flushSync so the receipt is in the DOM before the print dialog opens,
  // rather than whenever React next gets round to it.
  flushSync(() => root.render(<ReceiptTemplate order={order} />));

  const cleanUp = () => {
    window.removeEventListener("afterprint", cleanUp);
    root.unmount();
    host.remove();
  };

  try {
    // How much the text wraps decides how the receipt is laid out, so let any
    // pending font work settle before handing it to the printer.
    await document.fonts?.ready.catch(() => undefined);

    window.addEventListener("afterprint", cleanUp);
    window.print();
    // Chrome fires afterprint when the dialog closes, but a browser that never
    // does would otherwise leave the receipt mounted for good.
    window.setTimeout(cleanUp, 60_000);
  } catch (err) {
    cleanUp();
    throw err;
  }
}
