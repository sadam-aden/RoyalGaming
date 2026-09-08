import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { ReceiptTemplate } from "../components/pos/ReceiptTemplate";
import type { Order } from "../types";

/**
 * Print a receipt from wherever the sale was rung up.
 *
 * There is no separate receipt page to visit and no second Print button: the
 * receipt is rendered into the current document, off to the side of the
 * viewport where it is laid out but never seen, and `window.print()` opens
 * Chrome's own dialog on it. The print stylesheet hides the app and puts the
 * receipt back at the page origin, so the dialog previews the receipt alone.
 *
 * The page itself is declared statically in index.css — 72mm by 297mm, the
 * printable strip of the roll by the driver's page length. It used to be
 * written here instead, measured off the rendered receipt so the page was
 * exactly as long as the order. That is the right idea for a roll and the
 * wrong one for this driver: Chrome fits each page into the printer's
 * printable area and centres it there, so a page shorter than the paper came
 * out stranded halfway down it, with the leftover 200-odd millimetres split
 * evenly above and below the receipt. Matching the paper on both axes is what
 * puts the first line at the top edge; nothing here needs to measure anything.
 */
export async function printReceipt(order: Order): Promise<void> {
  const host = document.createElement("div");
  host.className = "receipt-print-root";
  const sheet = document.createElement("div");
  sheet.className = "print-sheet";
  host.appendChild(sheet);
  document.body.appendChild(host);

  const root = createRoot(sheet);
  // flushSync so the receipt is in the DOM before window.print() reads the
  // document, rather than after React gets round to it.
  flushSync(() => root.render(<ReceiptTemplate order={order} />));

  const cleanUp = () => {
    window.removeEventListener("afterprint", cleanUp);
    root.unmount();
    host.remove();
  };

  try {
    // Text metrics decide how much the receipt wraps, so let any pending font
    // work settle before the dialog freezes the layout it previews.
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
