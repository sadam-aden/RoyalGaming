import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Topbar } from "../../components/layout/Topbar";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { productsAdminApi, type ProductPayload } from "../../lib/productsAdminApi";
import { apiErrorMessage } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { resolveAssetUrl } from "../../lib/config";
import type { Product, ProductCategory, ProductType, StationType } from "../../types";

const CATEGORIES: ProductCategory[] = ["PLAYSTATION", "TABLE_GAMES", "SKATING", "COFFEE", "CAFETERIA"];
const STATION_TYPES: StationType[] = ["PLAYSTATION", "TABLE_GAME", "SKATING", "OTHER"];

export function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockDraft, setStockDraft] = useState("");

  function refresh() {
    setLoading(true);
    productsAdminApi
      .list()
      .then((r) => setProducts(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function toggleStock(p: Product) {
    await productsAdminApi.update(p.id, { inStock: !p.inStock });
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this product?")) return;
    await productsAdminApi.remove(id);
    refresh();
  }

  async function handleImageUpload(id: string, file: File) {
    await productsAdminApi.uploadImage(id, file);
    refresh();
  }

  function startEditPrice(p: Product) {
    setEditingPriceId(p.id);
    setPriceDraft(String(p.price));
  }

  async function commitPrice(id: string) {
    const parsed = Number(priceDraft);
    setEditingPriceId(null);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    await productsAdminApi.update(id, { price: parsed });
    refresh();
  }

  function startEditStock(p: Product) {
    setEditingStockId(p.id);
    setStockDraft(String(p.stockQty ?? 0));
  }

  async function commitStock(id: string) {
    const parsed = Number(stockDraft);
    setEditingStockId(null);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    await productsAdminApi.update(id, { stockQty: Math.floor(parsed) });
    refresh();
  }

  return (
    <div>
      <Topbar
        title="Products"
        subtitle="Manage the catalog shown at POS, including images and stock"
        actions={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Product
          </Button>
        }
      />

      <div className="p-8">
        <Card>
          {loading ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-faint">
                    <th className="pb-3 pr-4 font-medium">Image</th>
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Category</th>
                    <th className="pb-3 pr-4 font-medium">Price</th>
                    <th className="pb-3 pr-4 font-medium">Stock</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-border-soft/60 text-text">
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => fileInputs.current[p.id]?.click()}
                          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-surface-alt text-text-faint hover:text-accent"
                          title="Upload image"
                        >
                          {p.imageUrl ? <img src={resolveAssetUrl(p.imageUrl) ?? undefined} alt={p.name} className="h-full w-full object-cover" /> : <ImagePlus size={16} />}
                        </button>
                        <input
                          ref={(el) => {
                            fileInputs.current[p.id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(p.id, file);
                            e.target.value = "";
                          }}
                        />
                      </td>
                      <td className="py-3 pr-4 font-medium">{p.name}</td>
                      <td className="py-3 pr-4 text-text-muted">{p.category.replace("_", " ")}</td>
                      <td className="py-3 pr-4 text-text-muted">
                        {editingPriceId === p.id ? (
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            autoFocus
                            value={priceDraft}
                            onChange={(e) => setPriceDraft(e.target.value)}
                            onBlur={() => commitPrice(p.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitPrice(p.id);
                              if (e.key === "Escape") setEditingPriceId(null);
                            }}
                            className="w-24 rounded-lg border border-accent bg-surface-alt px-2 py-1 text-sm text-text outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => startEditPrice(p)}
                            className="rounded-lg px-2 py-1 hover:bg-surface-alt hover:text-text"
                            title="Click to edit price"
                          >
                            {formatCurrency(p.price)}
                          </button>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {p.type === "ITEM" ? (
                          <div className="flex items-center gap-2">
                            {editingStockId === p.id ? (
                              <input
                                type="number"
                                min={0}
                                step="1"
                                autoFocus
                                value={stockDraft}
                                onChange={(e) => setStockDraft(e.target.value)}
                                onBlur={() => commitStock(p.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitStock(p.id);
                                  if (e.key === "Escape") setEditingStockId(null);
                                }}
                                className="w-16 rounded-lg border border-accent bg-surface-alt px-2 py-1 text-sm text-text outline-none"
                              />
                            ) : (
                              <button
                                onClick={() => startEditStock(p)}
                                className="rounded-lg px-2 py-1 hover:bg-surface-alt hover:text-text"
                                title="Click to edit stock quantity"
                              >
                                {p.stockQty ?? 0} units
                              </button>
                            )}
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                p.inStock ? "bg-accent-soft text-accent" : "bg-danger-soft text-danger"
                              }`}
                            >
                              {p.inStock ? "In Stock" : "Out of Stock"}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleStock(p)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              p.inStock ? "bg-accent-soft text-accent" : "bg-danger-soft text-danger"
                            }`}
                          >
                            {p.inStock ? "Offered" : "Hidden"}
                          </button>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => handleDelete(p.id)} className="text-text-faint hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {showNew && (
        <NewProductModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function NewProductModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("CAFETERIA");
  const [type, setType] = useState<ProductType>("ITEM");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("0");
  const [durationMin, setDurationMin] = useState("60");
  const [stationTypeLink, setStationTypeLink] = useState<StationType>("PLAYSTATION");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedPrice = Number(price);
    if (!name.trim() || !parsedPrice || parsedPrice <= 0) {
      setError("Enter a name and a valid price");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: ProductPayload = { name: name.trim(), category, type, price: parsedPrice };
      if (type === "TIME_PACKAGE") {
        payload.durationMin = Number(durationMin);
        payload.stationTypeLink = stationTypeLink;
      } else {
        payload.stockQty = Math.max(0, Math.floor(Number(stockQty) || 0));
      }
      const created = await productsAdminApi.create(payload);
      if (image) {
        await productsAdminApi.uploadImage(created.data.id, image);
      }
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="New Product" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProductType)}
              className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
            >
              <option value="ITEM">Item</option>
              <option value="TIME_PACKAGE">Time Package</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Price</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
          />
        </div>
        {type === "ITEM" && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Stock quantity</label>
            <input
              type="number"
              min={0}
              step="1"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
            />
          </div>
        )}
        {type === "TIME_PACKAGE" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Duration (min)</label>
              <input
                type="number"
                min={1}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Station Type</label>
              <select
                value={stationTypeLink}
                onChange={(e) => setStationTypeLink(e.target.value as StationType)}
                className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
              >
                {STATION_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-2 file:py-1 file:text-xs file:text-text-muted"
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Create Product"}
        </Button>
      </form>
    </Modal>
  );
}
