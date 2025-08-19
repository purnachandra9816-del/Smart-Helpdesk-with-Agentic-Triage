import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'user';
  createdAt: string;
  lastLogin?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      
      login: (tokens, user) => {
        set({ 
          user, 
          accessToken: tokens.accessToken, 
          refreshToken: tokens.refreshToken,
          isLoading: false
        });
      },
      
      logout: () => {
        set({ 
          user: null, 
          accessToken: null, 
          refreshToken: null,
          isLoading: false 
        });
      },
      
      updateUser: (user) => {
        set({ user });
      },
      
      setLoading: (loading) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken
      })
    }
  )
);