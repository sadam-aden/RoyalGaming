import { create } from "zustand";
import { refreshSocketAuth } from "../lib/socket";
import type { AuthUser } from "../types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const STORAGE_KEY = "royalgaming.auth";

function loadInitial(): { user: AuthUser | null; token: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null };
    return JSON.parse(raw);
  } catch {
    return { user: null, token: null };
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitial(),
  login: (user, token) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
    set({ user, token });
    // The socket only reads the token during its handshake, so it has to be
    // remade — otherwise a user who just signed in keeps receiving the public
    // snapshot, without the stats the dashboard needs.
    refreshSocketAuth();
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, token: null });
    // And on the way out, so a signed-out browser stops being fed staff data.
    refreshSocketAuth();
  },
}));
