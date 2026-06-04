import { create } from 'zustand'

export const useUIStore = create((set) => ({
  sidebarAbierto: true,
  setSidebar: (v) => set({ sidebarAbierto: v }),
  toggleSidebar: () => set((s) => ({ sidebarAbierto: !s.sidebarAbierto })),
}))
