import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { sessionsApi } from "../../lib/sessionsApi";
import { productsApi } from "../../lib/resources";
import { apiErrorMessage } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { Product, StationSnapshot } from "../../types";

const DURATION_PRESETS = [30, 60, 90, 120];

export function StartSessionModal({ station, onClose }: { station: StationSnapshot; onClose: () => void }) {
  const [packages, setPackages] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [customMinutes, setCustomMinutes] = useState<string | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [priceEdited, setPriceEdited] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    productsApi.list().then((r) =>
      setPackages(r.data.filter((p) => p.type === "TIME_PACKAGE" && p.stationTypeLink === station.type))
    );
  }, [station.type]);

  const avgRatePerHour =
    packages.length > 0
      ? packages.reduce((sum, p) => sum + (p.durationMin ? (p.price / p.durationMin) * 60 : p.price), 0) / packages.length
      : 0;

  function selectCustomMinutes(minutes: string) {
    setProductId("");
    setCustomMinutes(minutes);
    if (!priceEdited) {
      const mins = Number(minutes);
      const suggested = mins > 0 ? Math.round(avgRatePerHour * (mins / 60) * 100) / 100 : 0;
      setCustomPrice(suggested > 0 ? String(suggested) : "");
    }
  }

  function selectPackage(id: string) {
    setProductId(id);
    setCustomMinutes(null);
    setPriceEdited(false);
    setCustomPrice("");
  }

  const isCustom = customMinutes !== null;
  const customMinutesNum = Number(customMinutes);
  const customPriceNum = Number(customPrice);
  const canStart = isCustom
    ? customMinutesNum > 0 && customPriceNum >= 0
    : productId !== "";

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      if (isCustom) {
        const ratePerHour = (customPriceNum / customMinutesNum) * 60;
        await sessionsApi.start({
          stationId: station.id,
          playerName: playerName.trim() || undefined,
          packageLabel: `${customMinutesNum} min (Custom)`,
          ratePerHour,
          durationMin: customMinutesNum,
        });
      } else {
        const product = packages.find((p) => p.id === productId);
        if (!product) return;
        const ratePerHour = product.durationMin ? (product.price / product.durationMin) * 60 : product.price;
        await sessionsApi.start({
          stationId: station.id,
          playerName: playerName.trim() || undefined,
          packageLabel: product.name,
          ratePerHour,
          durationMin: product.durationMin ?? undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Start Session — ${station.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canStart || busy} onClick={handleStart}>
            {busy ? "Starting..." : "Start Session"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Player name (optional)</label>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Walk-in"
            className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        {packages.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Package</label>
            <div className="flex flex-col gap-2">
              {packages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPackage(p.id)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    productId === p.id ? "border-accent bg-accent-soft text-accent" : "border-border text-text hover:bg-surface-alt"
                  }`}
                >
                  <span>{p.name}</span>
                  <span className="text-xs text-text-faint">{formatCurrency(p.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Custom duration</label>
          <div className="grid grid-cols-4 gap-1.5">
            {DURATION_PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => selectCustomMinutes(String(m))}
                className={`rounded-xl border px-2 py-2 text-sm font-medium transition-colors ${
                  isCustom && customMinutesNum === m
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-text hover:bg-surface-alt"
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center rounded-xl border border-border bg-surface-alt px-3">
              <input
                type="number"
                min={1}
                placeholder="Minutes"
                value={customMinutes ?? ""}
                onChange={(e) => selectCustomMinutes(e.target.value)}
                className="w-full bg-transparent py-2 text-sm text-text outline-none"
              />
              <span className="text-xs text-text-faint">min</span>
            </div>
            <div className="flex items-center rounded-xl border border-border bg-surface-alt px-3">
              <span className="text-xs text-text-faint">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Price"
                value={customPrice}
                onChange={(e) => {
                  setPriceEdited(true);
                  setCustomPrice(e.target.value);
                  setProductId("");
                  if (customMinutes === null) setCustomMinutes("");
                }}
                className="w-full bg-transparent py-2 pl-1 text-sm text-text outline-none"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
