import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  userId?: string;
  phone: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
  organizationLogo?: string;
  email?: string;
  designation?: string;
  department?: string;
  salary?: number;
  profilePhoto?: string;
  biometricEnabled?: boolean;
  active?: boolean;
  loginTime?: number; // Timestamp for session tracking
  // Geofence settings for employees
  geofenceEnabled?: boolean;
  geofenceLat?: number;
  geofenceLng?: number;
  geofenceRadius?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
  updateOrganizationLogo: (logo: string) => void;
  verifySession: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: (user) => set({
        user: { ...user, loginTime: Date.now() },
        isAuthenticated: true,
        isLoading: false
      }),
      logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
      setLoading: (loading) => set({ isLoading: loading }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      updateOrganizationLogo: (logo) => set((state) => ({
        user: state.user ? { ...state.user, organizationLogo: logo } : null
      })),
      verifySession: () => {
        const { user, isAuthenticated } = get();
        // Only check if user exists — no time-based expiry
        // Login persists until explicit logout button click
        if (!user || !isAuthenticated) return false;
        return true;
      },
    }),
    {
      name: 'hb-sallery-box-auth',
      storage: createJSONStorage(() => localStorage), // localStorage — persists across tab close & browser restart
      onRehydrateStorage: () => (state) => {
        if (state) {
          // No expiry check — just restore session as-is
          state.setLoading(false);
        }
      },
    }
  )
);
