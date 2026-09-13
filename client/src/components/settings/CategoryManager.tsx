import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { apiErrorMessage } from "../../lib/api";
import { CATEGORY_COLORS, categoriesApi } from "../../lib/categoriesApi";
import type { ProductCategory } from "../../types";

/**
 * Anything still attached to a category, deleted products included.
 *
 * Deleting a product only hides it — the row stays so past orders still know
 * what was sold — and a hidden row holds its category down just as firmly as a
 * visible one. Counting only what is on screen would offer a delete the server
 * is bound to refuse.
 */
const inUse = (c: ProductCategory) => (c.productCount ?? 0) + (c.hiddenCount ?? 0) > 0;

/**
 * Add, rename, recolour, hide and delete product categories.
 *
 * Deleting is only offered for a category nothing points at. One with products
 * cannot be removed without orphaning them and, through them, the history in
 * the reports — so the switch is the way to take a category out of use, and the
 * server refuses the delete regardless of what this UI offers.
 */
export function CategoryManager({
  categories,
  onChanged,
}: {
  categories: ProductCategory[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
      return true;
    } catch (err) {
      setError(apiErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const ok = await run(() => categoriesApi.create({ name, color: newColor }));
    if (ok) {
      setNewName("");
      // Step along the palette so consecutive new categories don't all match.
      setNewColor(CATEGORY_COLORS[(CATEGORY_COLORS.indexOf(newColor) + 1) % CATEGORY_COLORS.length]);
      setAdding(false);
    }
  }

  async function commitRename(category: ProductCategory) {
    const name = draftName.trim();
    setEditingId(null);
    if (!name || name === category.name) return;
    await run(() => categoriesApi.update(category.id, { name }));
  }

  async function handleDelete(category: ProductCategory) {
    if (!confirm(`Delete the "${category.name}" category?`)) return;
    await run(() => categoriesApi.remove(category.id));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          <Plus size={14} /> New Category
        </Button>
      </CardHeader>

      {error && <div className="mb-3 rounded-lg border border-danger bg-danger-soft px-3 py-2 text-xs text-text">{error}</div>}

      {adding && (
        <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-surface-alt p-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            maxLength={40}
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus:border-accent"
          />
          <ColorPicker value={newColor} onChange={setNewColor} />
          <Button size="sm" type="submit" disabled={busy || !newName.trim()}>
            Add
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </form>
      )}

      {categories.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-faint">No categories yet. Add one to start building the menu.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-faint">
                {/* The swatch sits with the name rather than in a column of its
                    own — a whole column for one dot costs a quarter of a phone
                    screen, and it reads better beside the thing it colours. */}
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Products</th>
                <th className="pb-2 pr-4 font-medium">Shown in POS</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-border-soft/60 text-text">
                  <td className="py-2.5 pr-4 font-medium">
                    <div className="flex items-center gap-2.5">
                      <ColorPicker value={c.color} onChange={(color) => run(() => categoriesApi.update(c.id, { color }))} />
                      {editingId === c.id ? (
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={() => commitRename(c)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(c);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        maxLength={40}
                        className="w-36 rounded-lg border border-accent bg-surface-alt px-2 py-1 text-sm text-text outline-none sm:w-44"
                      />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setDraftName(c.name);
                          }}
                          className="group flex items-center gap-1.5 text-left"
                          title="Rename"
                        >
                          <span>{c.name}</span>
                          <Pencil size={12} className="shrink-0 text-text-faint opacity-0 group-hover:opacity-100" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-text-muted">
                    {c.productCount ?? 0}
                    {(c.hiddenCount ?? 0) > 0 && (
                      <span className="ml-1.5 text-xs text-text-faint" title="Deleted products, kept so past orders still make sense">
                        +{c.hiddenCount} deleted
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <button
                      onClick={() => run(() => categoriesApi.update(c.id, { active: !c.active }))}
                      disabled={busy}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        c.active ? "bg-accent-soft text-accent" : "bg-surface-alt text-text-faint"
                      }`}
                      title={c.active ? "Hide from the POS" : "Show in the POS"}
                    >
                      {c.active ? <Check size={12} /> : <X size={12} />}
                      {c.active ? "Shown" : "Hidden"}
                    </button>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(c)}
                      disabled={busy || inUse(c)}
                      className="text-text-faint transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                      title={
                        inUse(c)
                          ? "Move or remove its products first, or hide it instead"
                          : "Delete category"
                      }
                    >
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
  );
}

/**
 * A swatch that opens the native colour picker.
 *
 * The input fires `change` continuously while the pointer is dragged around the
 * picker, so the draft is held locally and only handed up once the picker is
 * closed — otherwise choosing a colour would be a dozen requests, not one.
 */
function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const [draft, setDraft] = useState(value);
  const shown = draft || value;

  return (
    <label className="inline-flex cursor-pointer items-center" title="Pick a colour">
      <span className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: shown }} />
      <input
        type="color"
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft && draft !== value) onChange(draft);
        }}
        className="sr-only"
      />
    </label>
  );
}
