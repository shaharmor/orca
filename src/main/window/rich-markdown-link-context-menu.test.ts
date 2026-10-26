import { BrowserWindow } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { richMarkdownContextMenuLinkTargetChannel } from '../../shared/rich-markdown-context-menu'
import { installRichMarkdownLinkContextMenu } from './rich-markdown-link-context-menu'

const ipcListeners = vi.hoisted(() => new Map<string, (...args: unknown[]) => void>())
const openExternalUrl = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('electron', () => ({
  // The module reads only mainWindow.webContents for sender checks.
  BrowserWindow: class {
    webContents = {}
  },
  clipboard: { writeText: vi.fn() },
  ipcMain: {
    on: (channel: string, listener: (...args: unknown[]) => void) =>
      ipcListeners.set(channel, listener),
    removeListener: (channel: string) => ipcListeners.delete(channel)
  }
}))
vi.mock('../external-browsers/installed-browser-catalog', () => ({
  listInstalledBrowsers: () =>
    Promise.resolve([
      { id: 'com.google.Chrome', name: 'Google Chrome' },
      { id: 'com.microsoft.edgemac', name: 'Microsoft Edge' }
    ])
}))
vi.mock('../external-browsers/open-external-url', () => ({
  openExternalUrl,
  readConfiguredExternalBrowserId: () => 'com.microsoft.edgemac'
}))

const mainWindow = new BrowserWindow()

function params(
  overrides: Partial<Electron.ContextMenuParams> = {}
): Pick<Electron.ContextMenuParams, 'x' | 'y' | 'isEditable' | 'linkURL'> {
  return {
    x: 12,
    y: 34,
    isEditable: true,
    linkURL: 'https://github.com/o/r/pull/1',
    ...overrides
  }
}

describe('installRichMarkdownLinkContextMenu', () => {
  beforeEach(() => {
    ipcListeners.clear()
    openExternalUrl.mockClear()
  })

  it('offers Orca Browser only for the link the renderer reported, with the catalog loaded', async () => {
    const menu = installRichMarkdownLinkContextMenu(mainWindow)
    ipcListeners.get(richMarkdownContextMenuLinkTargetChannel)?.(
      { sender: mainWindow.webContents },
      {
        x: 12,
        y: 34
      }
    )
    const open = vi.fn()

    menu.withLinkActions(params(), open)
    await vi.waitFor(() => expect(open).toHaveBeenCalledTimes(1))

    const link = open.mock.calls[0][0]
    expect(link).toMatchObject({ canOpenInOrca: true, externalDefaultName: 'Microsoft Edge' })
    expect(link.browsers.map((browser: { name: string }) => browser.name)).toEqual([
      'Google Chrome',
      'Microsoft Edge'
    ])
    link.openUrl('https://github.com/o/r/pull/1', 'com.google.Chrome')
    expect(openExternalUrl).toHaveBeenCalledWith('https://github.com/o/r/pull/1', {
      browserId: 'com.google.Chrome'
    })

    const next = vi.fn()
    menu.withLinkActions(params(), next)
    await vi.waitFor(() => expect(next).toHaveBeenCalledTimes(1))
    expect(next.mock.calls[0][0]).toMatchObject({ canOpenInOrca: false })
  })

  it('opens the plain menu immediately off an http(s) link', () => {
    const menu = installRichMarkdownLinkContextMenu(mainWindow)
    const open = vi.fn()

    menu.withLinkActions(params({ linkURL: '' }), open)
    menu.withLinkActions(params({ linkURL: 'mailto:someone@example.com' }), open)

    expect(open.mock.calls).toEqual([[], []])
  })
})
