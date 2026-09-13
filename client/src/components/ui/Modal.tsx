import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4" onClick={onClose}>
      {/* Capped and scrollable: a form with several fields is taller than a
          phone in landscape, and without this its lower half — including the
          buttons that submit it — simply could not be reached. */}
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-base font-semibold text-text">{title}</h2>
          <button onClick={onClose} className="shrink-0 text-text-muted hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">{children}</div>
        {footer && <div className="mt-6 flex shrink-0 flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
