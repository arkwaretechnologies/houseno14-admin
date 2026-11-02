import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StaffRole } from "@/lib/constants";
import type { Branch, StaffProfile } from "@/types";
import { clearDemoCookie } from "@/lib/demo-mode";

interface AuthState {
  staff: StaffProfile | null;
  branch: Branch | null;
  role: StaffRole | null;
  isDemoMode: boolean;
  _hasHydrated: boolean;
  setSession: (payload: {
    staff: StaffProfile;
    branch: Branch | null;
    isDemoMode?: boolean;
  }) => void;
  clearSession: () => void;
  setBranch: (branch: Branch | null) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      staff: null,
      branch: null,
      role: null,
      isDemoMode: false,
      _hasHydrated: false,
      setSession: ({ staff, branch, isDemoMode = false }) =>
        set({
          staff,
          branch,
          role: staff.role,
          isDemoMode,
          _hasHydrated: true,
        }),
      clearSession: () => {
        clearDemoCookie();
        set({
          staff: null,
          branch: null,
          role: null,
          isDemoMode: false,
        });
      },
      setBranch: (branch) => set({ branch }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: "pv-admin-auth",
      partialize: (state) => ({
        staff: state.staff,
        branch: state.branch,
        role: state.role,
        isDemoMode: state.isDemoMode,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark hydrated even when storage is empty (state may be undefined)
        useAuthStore.setState({ _hasHydrated: true });
        if (state) {
          state._hasHydrated = true;
        }
      },
    }
  )
);

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  setMobileSidebarOpen: (value: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  setMobileSidebarOpen: (value) => set({ mobileSidebarOpen: value }),
}));
