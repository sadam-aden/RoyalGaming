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
 * receipt back in the page flow, so the dialog previews the receipt alone.
 *
 * It has to be laid out rather than hidden with `display: none`, because the
 * page is measured from it — see receiptPageRule.
 */
export async function printReceipt(order: Order): Promise<void> {
  const host = document.createElement("div");
  host.className = "receipt-print-root";
  const sheet = document.createElement("div");
  sheet.className = "print-sheet";
  host.appendChild(sheet);
  document.body.appendChild(host);

  const root = createRoot(sheet);
  // flushSync so the receipt is in the DOM, and measurable, on the next line
  // rather than after React gets round to it.
  flushSync(() => root.render(<ReceiptTemplate order={order} />));

  const pageStyle = document.createElement("style");
  document.head.appendChild(pageStyle);

  const cleanUp = () => {
    window.removeEventListener("afterprint", cleanUp);
    root.unmount();
    host.remove();
    pageStyle.remove();
  };

  try {
    // Text metrics decide how much the receipt wraps, and wrapping decides how
    // long the page is, so let any pending font work settle before measuring.
    await document.fonts?.ready.catch(() => undefined);
    pageStyle.textContent = receiptPageRule(host);

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

/**
 * An `@page` rule for a continuous thermal roll: as wide as the paper, as long
 * as this particular receipt.
 *
 * The width comes from the rendered root, which the stylesheet sizes to the
 * paper, so the page and the paper always agree and Chrome has no reason to
 * scale or re-centre the printout. The height is whatever the receipt came to
 * — that is the whole point on a continuous roll, where a fixed page height
 * either feeds out a long blank tail or splits the receipt across pages.
 *
 * Note that `size: <length> auto` will not do this job: mixing a length with
 * the `auto` keyword is invalid, so browsers drop the declaration and fall
 * back to A4 — which is how receipts once ended up in the corner of a big
 * sheet. Both dimensions have to be real lengths, hence the measuring.
 */
function receiptPageRule(root: HTMLElement): string {
  const perMm = pixelsPerMm();
  const rect = root.getBoundingClientRect();
  if (!perMm || !rect.width || !rect.height) return "";
  // A page even a hair shorter than the receipt pushes the last line onto a
  // second, near-empty page, so round the length up and leave a millimetre.
  const width = rect.width / perMm;
  const height = Math.ceil(rect.height / perMm) + 1;
  return `@page { size: ${width.toFixed(2)}mm ${height}mm; margin: 0; }`;
}

/**
 * How many CSS pixels go to a millimetre in this browser, measured rather than
 * assumed, so the conversion holds under page zoom.
 */
function pixelsPerMm(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;height:0;width:100mm";
  document.body.appendChild(probe);
  const perMm = probe.getBoundingClientRect().width / 100;
  probe.remove();
  return perMm;
}
