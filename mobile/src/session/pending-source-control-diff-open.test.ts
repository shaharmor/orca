import { afterEach, describe, expect, it } from 'vitest'
import {
  recordPendingSourceControlDiffOpen,
  takePendingSourceControlDiffOpen
} from './pending-source-control-diff-open'

// The bridge is a module singleton; clear it between cases so state can't leak.
afterEach(() => {
  takePendingSourceControlDiffOpen('wt-1')
  takePendingSourceControlDiffOpen('wt-2')
})

describe('pending-source-control-diff-open', () => {
  it('hands the recorded path to the matching worktree and clears it', () => {
    recordPendingSourceControlDiffOpen({ worktreeId: 'wt-1', relativePath: 'src/app.ts' })

    expect(takePendingSourceControlDiffOpen('wt-1')).toBe('src/app.ts')
    // Single-consume: a second read finds nothing so a focus re-fire can't re-activate.
    expect(takePendingSourceControlDiffOpen('wt-1')).toBeNull()
  })

  it('does not hand a record to a different worktree and preserves it', () => {
    recordPendingSourceControlDiffOpen({ worktreeId: 'wt-1', relativePath: 'src/app.ts' })

    expect(takePendingSourceControlDiffOpen('wt-2')).toBeNull()
    // The intended worktree can still consume it later.
    expect(takePendingSourceControlDiffOpen('wt-1')).toBe('src/app.ts')
  })

  it('returns null when nothing is pending', () => {
    expect(takePendingSourceControlDiffOpen('wt-1')).toBeNull()
  })

  it('keeps only the most recent open when the route records twice', () => {
    recordPendingSourceControlDiffOpen({ worktreeId: 'wt-1', relativePath: 'src/first.ts' })
    recordPendingSourceControlDiffOpen({ worktreeId: 'wt-1', relativePath: 'src/second.ts' })

    expect(takePendingSourceControlDiffOpen('wt-1')).toBe('src/second.ts')
  })
})
