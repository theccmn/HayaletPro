import { create } from 'zustand';

interface AppState {
    user: any | null;
    setUser: (user: any) => void;
    isLoading: boolean;
    setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
    user: null,
    setUser: (user) => set({ user }),
    isLoading: false,
    setLoading: (loading) => set({ isLoading: loading }),
}));
