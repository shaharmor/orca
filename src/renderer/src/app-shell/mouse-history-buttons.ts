import { isInsideBrowserPageSurface } from '@/lib/browser-page-surface'

export type MouseHistoryAction = 'worktree.history.back' | 'worktree.history.forward'

// DOM button values for the side Back/Forward buttons on every platform.
const MOUSE_HISTORY_ACTIONS = new Map<number, MouseHistoryAction>([
  [3, 'worktree.history.back'],
  [4, 'worktree.history.forward']
])

/** Routes mouse Back/Forward to worktree history; act on release so one press moves one step. */
export function installMouseHistoryButtons(
  target: Window,
  runHistoryAction: (action: MouseHistoryAction) => void
): () => void {
  // Why: a press that starts on page content belongs to the page even if released over Orca chrome.
  const pressStartedOnPage = new Map<number, boolean>()

  // Why pointer events: an element that cancels pointerdown (dividers, the remote frame) suppresses
  // the compat mouse events, which would let Blink's default navigate the document unchecked. For
  // the same reason defaultPrevented is not an opt-out here.
  const onPointerButton = (event: PointerEvent): void => {
    const action = MOUSE_HISTORY_ACTIONS.get(event.button)
    if (!action) {
      return
    }
    const onPage = isInsideBrowserPageSurface(event.target)
    if (event.type === 'pointerdown') {
      pressStartedOnPage.set(event.button, onPage)
    }
    // Why: Blink's default for these buttons navigates the document itself — Orca's renderer, or
    // the web client's browser tab. Cancel even over web pages so a leaked guest press can't.
    event.preventDefault()
    if (event.type !== 'pointerup') {
      return
    }
    const startedOnPage = pressStartedOnPage.get(event.button) ?? onPage
    pressStartedOnPage.delete(event.button)
    if (!startedOnPage && !onPage) {
      runHistoryAction(action)
    }
  }
  const forgetPresses = (): void => pressStartedOnPage.clear()

  target.addEventListener('pointerdown', onPointerButton, { capture: true })
  target.addEventListener('pointerup', onPointerButton, { capture: true })
  target.addEventListener('blur', forgetPresses)
  return () => {
    target.removeEventListener('pointerdown', onPointerButton, { capture: true })
    target.removeEventListener('pointerup', onPointerButton, { capture: true })
    target.removeEventListener('blur', forgetPresses)
  }
}
