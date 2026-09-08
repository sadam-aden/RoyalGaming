const PAGE_STYLE_ID = "receipt-page-size";
const PX_PER_MM = 96 / 25.4;

/**
 * Prints the receipt at exactly the size of the strip itself.
 *
 * A receipt has no fixed length — a 2-item sale and a 15-item sale need very
 * different amounts of paper — but `@page` can't express "as tall as the
 * content" (`size: 58mm auto` is invalid CSS and makes the browser silently
 * fall back to A4/Letter, printing the receipt in the corner of a mostly blank
 * page). So we lay the receipt out off-screen at its exact print geometry,
 * measure how tall it comes out, and inject a matching `@page` rule before
 * handing off to the browser's print dialog.
 */
export function printReceipt() {
  const source = document.querySelector<HTMLElement>(".receipt-print-area");
  if (!source) {
    window.print();
    return;
  }

  const root = getComputedStyle(document.documentElement);
  const readVar = (name: string, fallback: string) => root.getPropertyValue(name).trim() || fallback;

  const width = readVar("--receipt-width", "58mm");
  const paddingY = readVar("--receipt-padding-y", "4mm");
  const paddingX = readVar("--receipt-padding-x", "2mm");
  const fontSize = readVar("--receipt-font-size", "13px");
  const lineHeight = readVar("--receipt-line-height", "1.55");

  // Measure a clone laid out with the print geometry — the on-screen modal is a
  // different width and font size, so its height would not match the printout.
  const probe = source.cloneNode(true) as HTMLElement;
  probe.style.cssText = `
    position: absolute;
    left: -10000px;
    top: 0;
    visibility: hidden;
    box-sizing: border-box;
    width: ${width};
    padding: ${paddingY} ${paddingX};
    font-size: ${fontSize};
    line-height: ${lineHeight};
    font-weight: 800;
  `;
  document.body.appendChild(probe);
  const heightMm = probe.getBoundingClientRect().height / PX_PER_MM;
  probe.remove();

  // A small tail keeps the last line clear of the cutter on thermal printers.
  const pageHeightMm = Math.max(Math.ceil(heightMm) + 4, 40);

  let style = document.getElementById(PAGE_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = PAGE_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `@media print { @page { size: ${width} ${pageHeightMm}mm; margin: 0; } }`;

  window.print();
}
