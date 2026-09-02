import type { Discount } from "@prisma/client";

export interface CartLine {
  unitPrice: number;
  quantity: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeSubtotal(lines: CartLine[]): number {
  return round2(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
}

export function computeDiscountAmount(subtotal: number, discount: Discount | null): number {
  if (!discount) return 0;
  const value = Number(discount.value);
  const amount = discount.type === "PERCENT" ? subtotal * (value / 100) : value;
  return round2(Math.min(amount, subtotal));
}

export function computeTaxAmount(taxableAmount: number, taxRate: number): number {
  return round2(taxableAmount * taxRate);
}

export function getTaxRate(): number {
  const raw = Number(process.env.TAX_RATE ?? "0");
  return Number.isFinite(raw) ? raw : 0;
}

export { round2 };
