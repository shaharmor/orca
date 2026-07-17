import type { TerminalKeyboardAvoidanceMetrics } from './terminal-webview-contract'

type ActiveTerminalKeyboardLiftParams = {
  // Screen-space keyboard lift (keyboard height minus the home-indicator inset
  // on iOS); 0 when the keyboard is closed.
  keyboardLift: number
  // Latest keyboard-avoidance metrics for the active terminal, or undefined
  // when none have been reported yet.
  metrics: TerminalKeyboardAvoidanceMetrics | undefined
  // Measured height of the terminal frame in px.
  terminalFrameHeight: number
}

// Why: when the keyboard opens we translate the terminal up instead of resizing
// the PTY. How far to translate depends on what content must stay visible:
//   - alt-screen TUIs (vim, etc.): the whole viewport is meaningful -> full lift.
//   - main-buffer full-screen TUIs (e.g. the Pi agent): footer/status rows render
//     BELOW the input caret, so anchoring on the cursor alone leaves them under
//     the keyboard. Anchor on the bottom-most content row instead.
//   - short shell output near the top: nothing at the bottom -> no lift.
//   - scrolled shell with the prompt at the bottom: the prompt is the last
//     content row, so this matches cursor-based behavior.
export function computeActiveTerminalKeyboardLift(
  params: ActiveTerminalKeyboardLiftParams
): number {
  const { keyboardLift, metrics, terminalFrameHeight } = params
  if (keyboardLift <= 0) {
    return 0
  }
  if (!metrics || metrics.rows <= 0 || terminalFrameHeight <= 0) {
    return keyboardLift
  }
  if (metrics.altScreen) {
    return keyboardLift
  }
  const rowHeight = terminalFrameHeight / metrics.rows
  // Anchor on the lower of the caret and the last non-blank viewport row so
  // below-caret chrome (Pi's footer/status) clears the raised input dock.
  const anchorRow = Math.max(metrics.cursorY, metrics.contentBottomRow)
  const anchorBottom = (anchorRow + 1) * rowHeight
  const dockTop = terminalFrameHeight - keyboardLift
  const margin = rowHeight
  return Math.min(keyboardLift, Math.max(0, anchorBottom + margin - dockTop))
}
