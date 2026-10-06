// Mouse Back/Forward over a local browser page drive that page's history, never worktree history.

import type { ElectronApplication, Page } from '@stablyai/playwright-test'
import { expect, test } from './helpers/orca-app'
import { createTerminalBrowserSplit } from './helpers/browser-split-fixture'
import {
  navigateGuest,
  waitForGuestIdle,
  waitForGuestUrl
} from './helpers/browser-split-guest-probes'
import {
  startBrowserSplitPageServer,
  type BrowserSplitPageServer
} from './helpers/browser-split-page-server'
import {
  ensureTerminalVisible,
  getActiveWorktreeId,
  waitForActiveWorktree,
  waitForSessionReady
} from './helpers/store'

type MouseSideButton = 'back' | 'forward'

async function guestWebContentsId(page: Page, browserTabId: string): Promise<number> {
  return page.evaluate((tabId) => {
    const webview = document.querySelector<Electron.WebviewTag>(
      `[data-browser-overlay-tab-id="${tabId}"] webview`
    )
    if (!webview) {
      throw new Error('Browser guest unavailable')
    }
    return webview.getWebContentsId()
  }, browserTabId)
}

/** Delivers the button straight to the guest, the way real input over its surface arrives. */
async function clickSideButtonInGuest(
  electronApp: ElectronApplication,
  webContentsId: number,
  button: MouseSideButton
): Promise<void> {
  await electronApp.evaluate(
    async ({ webContents }, { targetId, targetButton }) => {
      const guest = webContents.fromId(targetId)
      if (!guest) {
        throw new Error(`Missing guest webContents ${targetId}`)
      }
      const attachedHere = !guest.debugger.isAttached()
      if (attachedHere) {
        guest.debugger.attach('1.3')
      }
      try {
        for (const type of ['mousePressed', 'mouseReleased']) {
          await guest.debugger.sendCommand('Input.dispatchMouseEvent', {
            type,
            x: 20,
            y: 20,
            button: targetButton,
            clickCount: 1
          })
        }
      } finally {
        if (attachedHere) {
          guest.debugger.detach()
        }
      }
    },
    { targetId: webContentsId, targetButton: button }
  )
}

/** Delivers the button to the host renderer at the webview's position. */
async function clickSideButtonOverWebviewInHost(
  page: Page,
  browserTabId: string,
  button: MouseSideButton
): Promise<void> {
  const point = await page.evaluate((tabId) => {
    const rect = document
      .querySelector(`[data-browser-overlay-tab-id="${tabId}"] webview`)
      ?.getBoundingClientRect()
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null
  }, browserTabId)
  if (!point) {
    throw new Error('Browser guest has no layout box')
  }
  const cdp = await page.context().newCDPSession(page)
  try {
    for (const type of ['mousePressed', 'mouseReleased'] as const) {
      await cdp.send('Input.dispatchMouseEvent', { type, ...point, button, clickCount: 1 })
    }
  } finally {
    await cdp.detach()
  }
}

async function worktreeHistoryIndex(page: Page): Promise<number> {
  return page.evaluate(() => {
    type StoreLike = { getState: () => { worktreeNavHistoryIndex: number } }
    const store = window.__store as unknown as StoreLike
    return store.getState().worktreeNavHistoryIndex
  })
}

test.describe('browser mouse Back/Forward', () => {
  let server: BrowserSplitPageServer

  test.beforeEach(async ({ orcaPage }) => {
    server = await startBrowserSplitPageServer()
    await waitForSessionReady(orcaPage)
    await waitForActiveWorktree(orcaPage)
    await ensureTerminalVisible(orcaPage)
  })

  test.afterEach(async () => {
    await server.close()
  })

  test('side buttons pressed in a local page navigate that page only', async ({
    orcaPage,
    electronApp
  }) => {
    const fixture = await createTerminalBrowserSplit(orcaPage, server.pageUrl('a', 1))
    await waitForGuestUrl(orcaPage, fixture.browserTabId, server.pageUrl('a', 1))
    await navigateGuest(orcaPage, fixture.browserTabId, server.pageUrl('a', 2))
    await waitForGuestIdle(orcaPage, fixture.browserTabId)
    const worktreeBefore = await getActiveWorktreeId(orcaPage)
    const historyIndexBefore = await worktreeHistoryIndex(orcaPage)
    const guestId = await guestWebContentsId(orcaPage, fixture.browserTabId)

    await clickSideButtonInGuest(electronApp, guestId, 'back')
    await waitForGuestUrl(orcaPage, fixture.browserTabId, server.pageUrl('a', 1))

    await clickSideButtonInGuest(electronApp, guestId, 'forward')
    await waitForGuestUrl(orcaPage, fixture.browserTabId, server.pageUrl('a', 2))

    expect(await getActiveWorktreeId(orcaPage)).toBe(worktreeBefore)
    expect(await worktreeHistoryIndex(orcaPage)).toBe(historyIndexBefore)
  })

  test('a press the host sees over a local page leaves worktree history alone', async ({
    orcaPage
  }) => {
    const fixture = await createTerminalBrowserSplit(orcaPage, server.pageUrl('a', 1))
    await waitForGuestUrl(orcaPage, fixture.browserTabId, server.pageUrl('a', 1))
    await navigateGuest(orcaPage, fixture.browserTabId, server.pageUrl('a', 2))
    await waitForGuestIdle(orcaPage, fixture.browserTabId)
    const worktreeBefore = await getActiveWorktreeId(orcaPage)
    const historyIndexBefore = await worktreeHistoryIndex(orcaPage)
    const hostUrlBefore = orcaPage.url()

    await clickSideButtonOverWebviewInHost(orcaPage, fixture.browserTabId, 'back')

    await orcaPage.waitForTimeout(300)
    expect(await getActiveWorktreeId(orcaPage)).toBe(worktreeBefore)
    expect(await worktreeHistoryIndex(orcaPage)).toBe(historyIndexBefore)
    expect(orcaPage.url()).toBe(hostUrlBefore)
  })
})
