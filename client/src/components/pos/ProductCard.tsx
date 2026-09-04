import { Clock, ImageOff } from "lucide-react";
import { clsx } from "clsx";
import type { Product } from "../../types";
import { formatCurrency } from "../../lib/format";
import { resolveAssetUrl } from "../../lib/config";
import { RemoteImage } from "../ui/RemoteImage";

export function ProductCard({ product, onSelect }: { product: Product; onSelect: (product: Product) => void }) {
  const disabled = !product.inStock;
  const imageUrl = resolveAssetUrl(product.imageUrl);

  return (
    <button
      disabled={disabled}
      onClick={() => onSelect(product)}
      className={clsx(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left transition-colors",
        disabled ? "cursor-not-allowed opacity-50" : "hover:border-accent/60 hover:bg-surface-alt"
      )}
    >
      <div className="flex h-24 items-center justify-center bg-surface-alt text-text-faint">
        {imageUrl ? (
          <RemoteImage src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : product.type === "TIME_PACKAGE" ? (
          <Clock size={26} />
        ) : (
          <ImageOff size={22} />
        )}
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-medium text-text">{product.name}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-accent">{formatCurrency(product.price)}</span>
          {disabled && <span className="text-[10px] font-medium uppercase text-danger">Out of stock</span>}
        </div>
      </div>
    </button>
  );
}
