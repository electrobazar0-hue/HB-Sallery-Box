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
  loginTime?: number;
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

// Safe storage that works on both server and client
const safeStorage = typeof window !== 'undefined'
  ? createJSONStorage(() => localStorage)
  : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
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
        if (!user || !isAuthenticated) return false;
        return true;
      },
    }),
    {
      name: 'hb-sallery-box-auth',
      storage: safeStorage,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoading(false);
        }
      },
    }
  )
);