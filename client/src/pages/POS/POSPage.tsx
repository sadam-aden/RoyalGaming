import { ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { Topbar } from "../../components/layout/Topbar";
import { Button } from "../../components/ui/Button";
import { ProductCard } from "../../components/pos/ProductCard";
import { CartPanel } from "../../components/pos/CartPanel";
import { HeldOrdersDrawer } from "../../components/pos/HeldOrdersDrawer";
import { productsApi } from "../../lib/resources";
import { categoriesApi } from "../../lib/categoriesApi";
import { useCartStore } from "../../store/cartStore";
import type { Product, ProductCategory } from "../../types";

export function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  // The filter bar is built from the categories the shop actually has, so one
  // added on the Products page shows up here without a code change.
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string | "ALL">("ALL");
  const [showHeld, setShowHeld] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  function loadProducts() {
    productsApi.list().then((r) => setProducts(r.data));
  }

  useEffect(loadProducts, []);
  useEffect(() => {
    categoriesApi.list().then((r) => setCategories(r.data));
  }, []);

  const filtered = categoryId === "ALL" ? products : products.filter((p) => p.categoryId === categoryId);

  function handleSelect(product: Product) {
    addItem(product.id, product.name, product.price);
  }

  return (
    <div className="flex h-screen flex-col">
      <Topbar
        title="POS Terminal"
        subtitle="Sell products and packages"
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowHeld(true)}>
            <ClipboardList size={14} /> Held Orders
          </Button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex gap-2 overflow-x-auto border-b border-border px-6 py-3">
            <button
              onClick={() => setCategoryId("ALL")}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                categoryId === "ALL" ? "bg-accent text-white" : "bg-surface-alt text-text-muted hover:text-text"
              }`}
            >
              All Items
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                // The category's own colour when selected, so the bar reads the
                // same way as the colours in the reports.
                style={categoryId === c.id ? { backgroundColor: c.color } : undefined}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  categoryId === c.id ? "text-white" : "bg-surface-alt text-text-muted hover:text-text"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onSelect={handleSelect} />
              ))}
            </div>
          </div>
        </div>

        <CartPanel onOrderComplete={loadProducts} />
      </div>

      {showHeld && <HeldOrdersDrawer onClose={() => setShowHeld(false)} onChanged={loadProducts} />}
    </div>
  );
}
