import type { InstalledBrowser } from '../../shared/external-browser-types'
import { readLinuxInstalledBrowsers } from './linux-installed-browsers'
import { readMacInstalledBrowsers } from './mac-installed-browsers'
import { readWindowsInstalledBrowsers } from './windows-installed-browsers'

export type BrowserLaunchCommand = {
  program: string
  args: string[]
  /** The launcher exits after handing off, so its exit code reports success. */
  waitForExit?: boolean
}

export type DetectedBrowser = InstalledBrowser & {
  launchCommand: (url: string) => BrowserLaunchCommand
}

// Short TTL keeps menus instant while still noticing installs and uninstalls.
const CATALOG_CACHE_TTL_MS = 30_000

let catalogCache: { readAt: number; browsers: Promise<DetectedBrowser[]> } | undefined

function readPlatformBrowsers(): Promise<DetectedBrowser[]> {
  switch (process.platform) {
    case 'darwin':
      return readMacInstalledBrowsers()
    case 'win32':
      return readWindowsInstalledBrowsers()
    case 'linux':
      return readLinuxInstalledBrowsers()
    default:
      return Promise.resolve([])
  }
}

export function listDetectedBrowsers(
  options: { forceRefresh?: boolean } = {}
): Promise<DetectedBrowser[]> {
  const now = Date.now()
  if (!options.forceRefresh && catalogCache && now - catalogCache.readAt < CATALOG_CACHE_TTL_MS) {
    return catalogCache.browsers
  }
  const browsers = readPlatformBrowsers().catch(() => [])
  catalogCache = { readAt: now, browsers }
  return browsers
}

export async function listInstalledBrowsers(
  options: { forceRefresh?: boolean } = {}
): Promise<InstalledBrowser[]> {
  const browsers = await listDetectedBrowsers(options)
  return browsers.map(({ id, name }) => ({ id, name }))
}

export async function findInstalledBrowser(id: string): Promise<DetectedBrowser | undefined> {
  const browsers = await listDetectedBrowsers()
  return browsers.find((browser) => browser.id === id)
}
