import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { SalesReportPrintSheet } from "../components/reports/SalesReportPrintSheet";
import { type Period, periodFileSlug } from "./period";
import type { RankMetric } from "./reportRanking";
import type { SalesReport } from "./salesReportApi";

/**
 * Print the sales report as an A4 document.
 *
 * Same shape as printReceipt: render off-screen, call window.print(), tear it
 * down on afterprint. The difference is the page. index.css declares
 * `@page { size: 72mm 297mm }` for the thermal receipt printer, globally, and
 * that rule would otherwise put this report on a till roll.
 *
 * So a stylesheet is injected for the duration of the print and removed
 * afterwards. @page declarations cascade like any others, and this one is
 * appended last to <head>, so it wins for exactly as long as it is there — and
 * the receipt printer gets its 72mm page back the moment it is gone. That
 * removal is load-bearing, not tidiness.
 *
 * The other global receipt rule, `#root { display: none !important }`, needs no
 * fighting: the sheet mounts into <body> outside #root, so hiding the app is
 * exactly what should happen.
 */
const OVERRIDE_STYLE_ID = "sales-report-print-overrides";

const PRINT_OVERRIDES = `
@media print {
  @page { size: A4 portrait; margin: 14mm 12mm 16mm; }

  .report-sheet {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: #fff;
    color: #111827;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: 9.5pt;
    line-height: 1.45;
  }

  /* Keep a heading with its table, and never split a block across the fold. */
  .report-sheet .report-section { break-inside: avoid; margin-bottom: 7mm; }
  /* The item and daily tables can legitimately outrun a page; let those break,
     but repeat the header row so page two is still readable. */
  .report-sheet .report-section:has(.report-table) { break-inside: auto; }
  .report-sheet thead { display: table-header-group; }
  .report-sheet tr { break-inside: avoid; }

  .report-sheet h1 { font-size: 17pt; font-weight: 700; margin: 0; }
  .report-sheet h2 {
    font-size: 11pt;
    font-weight: 600;
    margin: 0 0 2.5mm;
    padding-bottom: 1.5mm;
    border-bottom: 1px solid #d1d5db;
  }
  .report-sheet .report-note { font-weight: 400; color: #6b7280; font-size: 8.5pt; }

  .report-sheet .report-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8mm;
    padding-bottom: 3mm;
    border-bottom: 2px solid #111827;
  }
  .report-sheet .report-subtitle { margin: 1mm 0 0; font-size: 10.5pt; color: #374151; }
  .report-sheet .report-meta { text-align: right; font-size: 8.5pt; color: #6b7280; }

  .report-sheet .report-leaders { display: flex; gap: 5mm; }
  .report-sheet .report-leader {
    flex: 1;
    border: 1px solid #e5e7eb;
    border-left-width: 3mm;
    border-radius: 2mm;
    padding: 3mm 4mm;
  }
  .report-sheet .report-leader-title {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7280;
  }
  .report-sheet .report-leader-name { font-size: 14pt; font-weight: 700; margin-top: 1mm; }
  .report-sheet .report-leader-detail { font-size: 9pt; color: #374151; margin-top: 1mm; }

  .report-sheet .report-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
  .report-sheet .report-kpi { border: 1px solid #e5e7eb; border-radius: 2mm; padding: 2.5mm 3mm; }
  .report-sheet .report-kpi-label {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
  }
  .report-sheet .report-kpi-value { font-size: 12pt; font-weight: 600; margin-top: 0.5mm; }

  .report-sheet .report-table { width: 100%; border-collapse: collapse; }
  .report-sheet .report-table th,
  .report-sheet .report-table td {
    padding: 1.4mm 2mm;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
  }
  .report-sheet .report-table th {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    border-bottom: 1px solid #9ca3af;
  }
  .report-sheet .report-table tfoot td { font-weight: 600; border-top: 1px solid #9ca3af; border-bottom: none; }
  .report-sheet .report-table .num { text-align: right; font-variant-numeric: tabular-nums; }
  .report-sheet .report-table .rank { width: 8mm; color: #9ca3af; }

  /* The category swatch that replaced the share bar. */
  .report-sheet .report-dot {
    display: inline-block;
    width: 2mm;
    height: 2mm;
    border-radius: 50%;
    margin-right: 1.5mm;
    vertical-align: middle;
  }
}`;

/** One print at a time — a receipt and a report must never share a dialog. */
let printing = false;

export async function printSalesReport(report: SalesReport, period: Period, metric: RankMetric = "quantity"): Promise<void> {
  if (printing) return;
  printing = true;

  const style = document.createElement("style");
  style.id = OVERRIDE_STYLE_ID;
  style.textContent = PRINT_OVERRIDES;
  document.head.appendChild(style);

  const host = document.createElement("div");
  host.className = "report-print-root";
  const sheet = document.createElement("div");
  sheet.className = "report-sheet";
  host.appendChild(sheet);
  document.body.appendChild(host);

  // Chrome seeds the "Save as PDF" filename from the document title.
  const previousTitle = document.title;
  document.title = `sales-report-${periodFileSlug(period)}`;

  const root = createRoot(sheet);
  // flushSync so the sheet is in the DOM before window.print() reads the
  // document, rather than after React gets round to it.
  flushSync(() => root.render(<SalesReportPrintSheet report={report} period={period} metric={metric} />));

  let cleaned = false;
  const cleanUp = () => {
    // afterprint and the fallback timeout both fire; the second must do nothing.
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener("afterprint", cleanUp);
    root.unmount();
    host.remove();
    style.remove();
    document.title = previousTitle;
    printing = false;
  };

  try {
    // Text metrics decide the wrapping the print dialog freezes, so let any
    // pending font work settle first.
    await document.fonts?.ready.catch(() => undefined);
    window.addEventListener("afterprint", cleanUp);
    window.print();
    // A browser that never fires afterprint would otherwise leave the A4 page
    // rule in place, and the next receipt would print on A4.
    window.setTimeout(cleanUp, 60_000);
  } catch (err) {
    cleanUp();
    throw err;
  }
}
