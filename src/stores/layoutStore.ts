import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      isSidebarOpen: true, // Por defecto expandido en desktop
      
      toggleSidebar: () => 
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      
      setSidebarOpen: (open: boolean) => 
        set({ isSidebarOpen: open }),
    }),
    {
      name: 'layout-storage', // Key en localStorage
    }
  )
);