import { create } from 'zustand'
import type { CurrentUser } from './lib/api'
import type { OpenTab, OpenZip, HighlightingProfile } from './lib/types'

type Theme = 'light' | 'dark'

interface AppState {
  // Auth
  user: CurrentUser | null
  authChecked: boolean
  setUser: (user: CurrentUser | null) => void
  setAuthChecked: (checked: boolean) => void

  // Ansicht (kein Router — nur Login/Viewer/Benutzerverwaltung)
  activeView: 'viewer' | 'users'
  setActiveView: (view: 'viewer' | 'users') => void

  // Theme
  theme: Theme
  toggleTheme: () => void

  // Tabs
  openTabs: OpenTab[]
  activeTabId: string | null
  addTab: (tab: OpenTab) => void
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  getActiveTab: () => OpenTab | undefined

  // ZIP
  openZip: OpenZip | null
  setOpenZip: (zip: OpenZip | null) => void

  // Highlighting Profiles
  highlightingProfiles: HighlightingProfile[]
  activeProfileId: string | null
  setHighlightingProfiles: (profiles: HighlightingProfile[]) => void
  setActiveProfile: (profileId: string | null) => void
  addProfile: (profile: HighlightingProfile) => void
  updateProfile: (profile: HighlightingProfile) => void
  removeProfile: (profileId: string) => void
}

function initialTheme(): Theme {
  const saved = localStorage.getItem('theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem('theme', theme)
}

export const useAppStore = create<AppState>((set, get) => {
  const theme = initialTheme()
  applyTheme(theme)

  return {
    // Auth
    user: null,
    authChecked: false,
    setUser: (user) => set({ user }),
    setAuthChecked: (authChecked) => set({ authChecked }),

    // Ansicht
    activeView: 'viewer',
    setActiveView: (activeView) => set({ activeView }),

    // Theme
    theme,
    toggleTheme: () => {
      const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      set({ theme: next })
    },

    // Tabs
    openTabs: [],
    activeTabId: null,
    addTab: (tab) =>
      set((state) => {
        const exists = state.openTabs.find((t) => t.id === tab.id)
        if (exists) return {}
        return { openTabs: [...state.openTabs, tab], activeTabId: tab.id }
      }),
    removeTab: (tabId) =>
      set((state) => {
        const filtered = state.openTabs.filter((t) => t.id !== tabId)
        let nextActiveId = state.activeTabId
        if (nextActiveId === tabId) {
          nextActiveId = filtered.length > 0 ? filtered[filtered.length - 1].id : null
        }
        return { openTabs: filtered, activeTabId: nextActiveId }
      }),
    setActiveTab: (tabId) => {
      const tab = get().openTabs.find((t) => t.id === tabId)
      if (tab) set({ activeTabId: tabId })
    },
    getActiveTab: () => {
      const { openTabs, activeTabId } = get()
      return activeTabId ? openTabs.find((t) => t.id === activeTabId) : undefined
    },

    // ZIP
    openZip: null,
    setOpenZip: (zip) => set({ openZip: zip }),

    // Highlighting Profiles
    highlightingProfiles: [],
    activeProfileId: null,
    setHighlightingProfiles: (profiles) => set({ highlightingProfiles: profiles }),
    setActiveProfile: (profileId) => set({ activeProfileId: profileId }),
    addProfile: (profile) =>
      set((state) => ({
        highlightingProfiles: [...state.highlightingProfiles, profile],
      })),
    updateProfile: (profile) =>
      set((state) => ({
        highlightingProfiles: state.highlightingProfiles.map((p) =>
          p.id === profile.id ? profile : p,
        ),
      })),
    removeProfile: (profileId) =>
      set((state) => ({
        highlightingProfiles: state.highlightingProfiles.filter((p) => p.id !== profileId),
      })),
  }
})
