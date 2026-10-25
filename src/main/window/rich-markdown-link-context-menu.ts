import { clipboard, ipcMain, type BrowserWindow } from 'electron'
import {
  richMarkdownContextMenuLinkTargetChannel,
  type RichMarkdownContextMenuLinkTarget
} from '../../shared/rich-markdown-context-menu'
import { listInstalledBrowsers } from '../external-browsers/installed-browser-catalog'
import {
  openExternalUrl,
  readConfiguredExternalBrowserId
} from '../external-browsers/open-external-url'
import {
  parseRichMarkdownContextMenuLinkTarget,
  readHttpLinkUrl,
  type EditableContextMenuLinkActions
} from './editable-context-menu-link-section'

export type RichMarkdownLinkContextMenu = {
  /** Opens now, or once the browser catalog loads when the menu is for an editable http(s) link. */
  withLinkActions: (
    params: Electron.ContextMenuParams,
    open: (link?: EditableContextMenuLinkActions) => void
  ) => void
  reset: () => void
  dispose: () => void
}

/** Supplies the rich editor's native link section from main's browser catalog. */
export function installRichMarkdownLinkContextMenu(
  mainWindow: BrowserWindow
): RichMarkdownLinkContextMenu {
  // Renderer sends this immediately before the native menu when Orca Browser can open the link.
  let pendingTarget: RichMarkdownContextMenuLinkTarget | null = null
  const onLinkTarget = (event: Electron.IpcMainEvent, value: unknown): void => {
    if (event.sender === mainWindow.webContents) {
      pendingTarget = parseRichMarkdownContextMenuLinkTarget(value)
    }
  }
  ipcMain.on(richMarkdownContextMenuLinkTargetChannel, onLinkTarget)

  const withLinkActions: RichMarkdownLinkContextMenu['withLinkActions'] = (params, open) => {
    const canOpenInOrca = pendingTarget?.x === params.x && pendingTarget?.y === params.y
    pendingTarget = null
    if (!params.isEditable || !readHttpLinkUrl(params)) {
      open()
      return
    }
    void listInstalledBrowsers().then((browsers) => {
      const configuredBrowserId = readConfiguredExternalBrowserId()
      open({
        canOpenInOrca,
        browsers,
        externalDefaultName:
          browsers.find((browser) => browser.id === configuredBrowserId)?.name ?? null,
        openUrl: (url, browserId) => void openExternalUrl(url, { browserId }),
        copyText: (text) => clipboard.writeText(text)
      })
    })
  }

  return {
    withLinkActions,
    reset: () => {
      pendingTarget = null
    },
    dispose: () => {
      pendingTarget = null
      ipcMain.removeListener(richMarkdownContextMenuLinkTargetChannel, onLinkTarget)
    }
  }
}
