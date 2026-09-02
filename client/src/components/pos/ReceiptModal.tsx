import { Printer, X } from "lucide-react";
import { Button } from "../ui/Button";
import { ReceiptTemplate } from "./ReceiptTemplate";
import type { Order } from "../../types";

export function ReceiptModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-soft p-4">
          <h2 className="text-sm font-semibold text-text">Order Complete</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <div className="rounded-xl bg-white p-4">
            <ReceiptTemplate order={order} />
          </div>
        </div>

        <div className="flex gap-2 border-t border-border-soft p-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button className="flex-1" onClick={() => window.print()}>
            <Printer size={14} /> Print Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}
