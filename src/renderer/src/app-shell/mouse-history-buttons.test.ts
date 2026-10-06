// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BROWSER_PAGE_SURFACE_ATTRIBUTE } from '@/lib/browser-page-surface'
import { installMouseHistoryButtons } from './mouse-history-buttons'

describe('installMouseHistoryButtons', () => {
  const runHistoryAction = vi.fn()
  let uninstall: () => void

  beforeEach(() => {
    runHistoryAction.mockReset()
    uninstall = installMouseHistoryButtons(window, runHistoryAction)
  })

  afterEach(() => {
    uninstall()
    document.body.innerHTML = ''
  })

  function press(
    type: 'mousedown' | 'mouseup',
    button: number,
    target: EventTarget = document.body
  ): MouseEvent {
    const event = new MouseEvent(type, { button, bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    return event
  }

  it('runs history back on mouse Back release', () => {
    const event = press('mouseup', 3)

    expect(runHistoryAction).toHaveBeenCalledExactlyOnceWith('worktree.history.back')
    expect(event.defaultPrevented).toBe(true)
  })

  it('runs history forward on mouse Forward release', () => {
    press('mouseup', 4)

    expect(runHistoryAction).toHaveBeenCalledExactlyOnceWith('worktree.history.forward')
  })

  it('cancels the press without navigating so one click moves one step', () => {
    const down = press('mousedown', 3)
    expect(down.defaultPrevented).toBe(true)
    expect(runHistoryAction).not.toHaveBeenCalled()

    press('mouseup', 3)
    expect(runHistoryAction).toHaveBeenCalledOnce()
  })

  it.each([0, 1, 2])('ignores button %i', (button) => {
    const down = press('mousedown', button)
    const up = press('mouseup', button)

    expect(down.defaultPrevented).toBe(false)
    expect(up.defaultPrevented).toBe(false)
    expect(runHistoryAction).not.toHaveBeenCalled()
  })

  it('cancels but does not navigate worktree history inside a browser page surface', () => {
    // Same literal markup the remote screencast frame renders.
    document.body.innerHTML = '<div data-browser-page-surface=""><img></div>'
    const inner = document.querySelector('img')!
    expect(inner.closest(`[${BROWSER_PAGE_SURFACE_ATTRIBUTE}]`)).not.toBeNull()

    const down = press('mousedown', 3, inner)
    const up = press('mouseup', 3, inner)

    expect(down.defaultPrevented).toBe(true)
    expect(up.defaultPrevented).toBe(true)
    expect(runHistoryAction).not.toHaveBeenCalled()
  })

  it('cancels but does not navigate worktree history over a webview guest', () => {
    const webview = document.createElement('webview')
    document.body.append(webview)

    const up = press('mouseup', 4, webview)

    expect(up.defaultPrevented).toBe(true)
    expect(runHistoryAction).not.toHaveBeenCalled()
  })

  it('ignores events an earlier capture handler already claimed', () => {
    uninstall()
    const claim = (event: Event): void => event.preventDefault()
    window.addEventListener('mouseup', claim, { capture: true })
    uninstall = installMouseHistoryButtons(window, runHistoryAction)

    press('mouseup', 3)

    window.removeEventListener('mouseup', claim, { capture: true })
    expect(runHistoryAction).not.toHaveBeenCalled()
  })

  it('stops listening after uninstall', () => {
    uninstall()

    const event = press('mouseup', 3)

    expect(event.defaultPrevented).toBe(false)
    expect(runHistoryAction).not.toHaveBeenCalled()
  })
})
