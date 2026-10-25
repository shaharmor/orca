import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type { InstalledBrowser } from '../../../../shared/external-browser-types'

export type InstalledBrowsersSlice = {
  /** Null until the first list arrives; empty on clients that cannot choose a browser. */
  installedBrowsers: InstalledBrowser[] | null
  loadInstalledBrowsers: (options?: { forceRefresh?: boolean }) => Promise<void>
}

export const createInstalledBrowsersSlice: StateCreator<
  AppState,
  [],
  [],
  InstalledBrowsersSlice
> = (set, get) => ({
  installedBrowsers: null,

  loadInstalledBrowsers: async (options) => {
    try {
      const browsers = await window.api.shell.listBrowsers(options)
      set({ installedBrowsers: [...browsers].sort((a, b) => a.name.localeCompare(b.name)) })
    } catch {
      // A failed read must not leave the settings dropdown stuck loading.
      set({ installedBrowsers: get().installedBrowsers ?? [] })
    }
  }
})

export function resolveInstalledBrowserName(
  browserId: string | null | undefined,
  installedBrowsers: readonly InstalledBrowser[] | null
): string | null {
  if (!browserId) {
    return null
  }
  return installedBrowsers?.find((browser) => browser.id === browserId)?.name ?? null
}
