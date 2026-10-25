export type InstalledBrowser = {
  /** macOS bundle id, Windows StartMenuInternet key name, or Linux desktop-file id. */
  id: string
  name: string
}

/** Reserved browser id that forces the OS default browser regardless of settings. */
export const SYSTEM_DEFAULT_BROWSER_ID = 'system-default'
