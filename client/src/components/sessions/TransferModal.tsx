import { useState } from "react";
import type { StationSnapshot, StationType } from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { sessionsApi } from "../../lib/sessionsApi";
import { apiErrorMessage } from "../../lib/api";

export function TransferModal({
  sessionId,
  stationType,
  candidates,
  onClose,
}: {
  sessionId: string;
  stationType: StationType;
  candidates: StationSnapshot[];
  onClose: () => void;
}) {
  const [target, setTarget] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sameType = candidates.filter((c) => c.type === stationType);
  const otherType = candidates.filter((c) => c.type !== stationType);

  async function handleTransfer() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await sessionsApi.transfer(sessionId, target);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Transfer Session"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!target || busy} onClick={handleTransfer}>
            {busy ? "Transferring..." : "Transfer"}
          </Button>
        </>
      }
    >
      {candidates.length === 0 ? (
        <p className="text-sm text-text-muted">No free stations available right now.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sameType.length > 0 && (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Same type</p>
              {sameType.map((s) => (
                <StationOption key={s.id} station={s} selected={target === s.id} onSelect={() => setTarget(s.id)} />
              ))}
            </>
          )}
          {otherType.length > 0 && (
            <>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-text-faint">Other stations</p>
              {otherType.map((s) => (
                <StationOption key={s.id} station={s} selected={target === s.id} onSelect={() => setTarget(s.id)} />
              ))}
            </>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
    </Modal>
  );
}

function StationOption({
  station,
  selected,
  onSelect,
}: {
  station: StationSnapshot;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
        selected ? "border-accent bg-accent-soft text-accent" : "border-border text-text hover:bg-surface-alt"
      }`}
    >
      <span>{station.name}</span>
      <span className="text-xs text-text-faint">{station.type.replace("_", " ")}</span>
    </button>
  );
}
