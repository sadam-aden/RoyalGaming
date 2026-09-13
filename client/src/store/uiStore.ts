import { create } from "zustand";

/**
 * Chrome that more than one component has to agree on.
 *
 * The sidebar is a drawer below `lg`, and the button that opens it lives in the
 * Topbar — which each page renders itself, rather than the layout rendering it
 * once. So the open/closed flag cannot simply be local state in either of them.
 */
interface UiState {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
}));
