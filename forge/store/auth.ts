import { create } from "zustand";
import type { Profile } from "@/lib/types";

interface AuthState {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clear: () => set({ profile: null }),
}));
