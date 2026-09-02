import { Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Topbar } from "../../components/layout/Topbar";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { staffAdminApi } from "../../lib/staffAdminApi";
import { apiErrorMessage } from "../../lib/api";
import type { StaffMember, StaffRole } from "../../types";

export function StaffAdminPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);

  function refresh() {
    setLoading(true);
    staffAdminApi
      .list()
      .then((r) => setStaff(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  return (
    <div>
      <Topbar
        title="Staff"
        subtitle="Manage cashier and admin accounts"
        actions={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Staff
          </Button>
        }
      />

      <div className="p-8">
        <Card>
          {loading ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : (
            <div className="flex flex-col gap-2">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <div className="text-sm font-medium text-text">{s.name}</div>
                    <div className="text-xs text-text-faint">{s.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={s.role === "ADMIN" ? "blue" : "neutral"}>{s.role}</Badge>
                    <Button size="sm" variant="outline" onClick={() => setResetTarget(s)}>
                      Reset Password
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {showNew && (
        <NewStaffModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            refresh();
          }}
        />
      )}

      {resetTarget && <ResetPasswordModal staff={resetTarget} onClose={() => setResetTarget(null)} />}
    </div>
  );
}

function ResetPasswordModal({ staff, onClose }: { staff: StaffMember; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await staffAdminApi.resetPassword(staff.id, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Reset Password — ${staff.name}`} onClose={onClose}>
      {success ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-accent">Password updated. Share the new password with {staff.name} securely.</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Reset Password"}
          </Button>
        </form>
      )}
    </Modal>
  );
}

function NewStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("CASHIER");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Name, email, and an 8+ character password are required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await staffAdminApi.create({ name: name.trim(), email: email.trim(), password, role });
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="New Staff Account" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-surface-alt p-1">
          {(["CASHIER", "ADMIN"] as StaffRole[]).map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-colors ${
                role === r ? "bg-accent text-white" : "text-text-muted hover:text-text"
              }`}
            >
              {r.toLowerCase()}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Creating..." : "Create Account"}
        </Button>
      </form>
    </Modal>
  );
}
