// Bridges the full-screen mobile Source Control route back to the session screen.
//
// On narrow layouts, tapping Source Control pushes a full-screen route (with
// origin: 'session') instead of docking a pane. Tapping a changed file there opens
// a diff tab on the desktop via files.openDiff, but the route lives on a separate
// navigation-stack entry and cannot reach the session screen's tab-activation logic.
// It records the opened path here; the session consumes it on focus (after the route
// pops) and switches its active session tab to the matching diff. Without this the
// diff tab appears in the strip but the session never switches to it.
//
// Scoped by worktreeId so a stale record from one worktree can't activate a tab in
// another; single-consume so a focus re-fire can't re-activate an already-shown diff.
type PendingSourceControlDiffOpen = { worktreeId: string; relativePath: string }

let pending: PendingSourceControlDiffOpen | null = null

export function recordPendingSourceControlDiffOpen(open: PendingSourceControlDiffOpen): void {
  pending = open
}

export function takePendingSourceControlDiffOpen(worktreeId: string): string | null {
  if (pending?.worktreeId === worktreeId) {
    const { relativePath } = pending
    pending = null
    return relativePath
  }
  return null
}
