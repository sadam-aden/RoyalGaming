import { ClipboardList, ShoppingCart, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Topbar } from "../../components/layout/Topbar";
import { Button } from "../../components/ui/Button";
import { ProductCard } from "../../components/pos/ProductCard";
import { CartPanel } from "../../components/pos/CartPanel";
import { HeldOrdersDrawer } from "../../components/pos/HeldOrdersDrawer";
import { formatCurrency } from "../../lib/format";
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
  // Below lg the cart is a slide-over: at 390px the 384px panel left six pixels
  // for the products, so the till was there and the things to sell were not.
  const [cartOpen, setCartOpen] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const lines = useCartStore((s) => s.lines);
  const cartCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

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
          <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 sm:px-6">
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

          {/* Bottom padding on small screens so the last row of products is not
              hidden under the cart bar that floats over it. */}
          <div className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onSelect={handleSelect} />
              ))}
            </div>
          </div>
        </div>

        {cartOpen && (
          <button
            type="button"
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
        )}

        <div
          className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm transition-transform duration-200 lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:transition-none ${
            cartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <button
            type="button"
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
            className="absolute right-3 top-3 z-10 rounded-lg p-2 text-text-muted hover:bg-surface-alt hover:text-text lg:hidden"
          >
            <X size={18} />
          </button>
          <CartPanel
            onOrderComplete={() => {
              loadProducts();
              setCartOpen(false);
            }}
          />
        </div>
      </div>

      {/* The way back to the cart on a phone, carrying the two numbers worth
          knowing before you open it. */}
      {!cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between gap-3 rounded-2xl bg-accent px-5 py-3.5 text-white shadow-lg lg:hidden"
        >
          <span className="flex items-center gap-2 font-medium">
            <ShoppingCart size={18} />
            {cartCount === 0 ? "Cart" : `${cartCount} item${cartCount === 1 ? "" : "s"}`}
          </span>
          <span className="font-semibold">{formatCurrency(cartTotal)}</span>
        </button>
      )}

      {showHeld && <HeldOrdersDrawer onClose={() => setShowHeld(false)} onChanged={loadProducts} />}
    </div>
  );
}
