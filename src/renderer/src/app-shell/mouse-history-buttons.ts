import { isInsideBrowserPageSurface } from '@/lib/browser-page-surface'

export type MouseHistoryAction = 'worktree.history.back' | 'worktree.history.forward'

// DOM MouseEvent.button values for the side Back/Forward buttons on every platform.
const MOUSE_HISTORY_ACTIONS = new Map<number, MouseHistoryAction>([
  [3, 'worktree.history.back'],
  [4, 'worktree.history.forward']
])

/** Routes mouse Back/Forward to worktree history; act on release so one press moves one step. */
export function installMouseHistoryButtons(
  target: Window,
  runHistoryAction: (action: MouseHistoryAction) => void
): () => void {
  const onMouseButton = (event: MouseEvent): void => {
    const action = MOUSE_HISTORY_ACTIONS.get(event.button)
    if (!action || event.defaultPrevented) {
      return
    }
    // Why: Blink's default for these buttons navigates the document itself — Orca's renderer, or
    // the web client's browser tab. Cancel even over web pages so a leaked guest press can't.
    event.preventDefault()
    if (event.type === 'mouseup' && !isInsideBrowserPageSurface(event.target)) {
      runHistoryAction(action)
    }
  }
  target.addEventListener('mousedown', onMouseButton, { capture: true })
  target.addEventListener('mouseup', onMouseButton, { capture: true })
  return () => {
    target.removeEventListener('mousedown', onMouseButton, { capture: true })
    target.removeEventListener('mouseup', onMouseButton, { capture: true })
  }
}
