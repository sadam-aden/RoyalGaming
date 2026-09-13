import { useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { staffAdminApi } from "../../lib/staffAdminApi";
import { apiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await staffAdminApi.changeOwnPassword(currentPassword, newPassword);
      // Every token minted before the change is now refused, this one included,
      // so adopt the replacement the server handed back rather than being
      // signed out by our own password change.
      const { user, login } = useAuthStore.getState();
      if (user && res.data?.token) login(user, res.data.token);
      setSuccess(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Change Password" onClose={onClose}>
      {success ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-accent">Password updated successfully.</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Update Password"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
