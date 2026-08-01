import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOpenedSourceControlDiffActivation } from './use-opened-source-control-diff-activation'
import {
  recordPendingSourceControlDiffOpen,
  takePendingSourceControlDiffOpen
} from './pending-source-control-diff-open'

// Run the focus callback once on mount, mirroring a screen refocus.
vi.mock('expo-router', async () => {
  const react = await import('react')
  return {
    useFocusEffect: (cb: () => undefined | (() => void)) => {
      react.useEffect(() => cb(), [cb])
    }
  }
})

type TestTab = { type: string; id: string; mode?: string; relativePath?: string }

const TABS: TestTab[] = [
  { type: 'terminal', id: 'terminal-1' },
  { type: 'file', id: 'diff-1', mode: 'diff', relativePath: 'src/app.ts' }
]

// Let the void-wrapped async activation settle (fetchSessionTabs + sync work).
async function flushActivation(run: () => void): Promise<void> {
  await act(async () => {
    run()
    await Promise.resolve()
    await Promise.resolve()
  })
}

function createHarness(tabs: TestTab[], activeTabId: string) {
  const scheduled: Array<() => void> = []
  const switched: string[] = []
  const activeRef = { current: activeTabId as string | null }
  const tabsRef = { current: tabs }
  const switchRef = {
    current: ((tab: TestTab) => {
      activeRef.current = tab.id
      switched.push(tab.id)
    }) as ((tab: TestTab) => void) | null
  }
  let handlers: {
    handleFileOpenStart: () => void
    handleOpenedFileDiff: (relativePath: string) => void
  } | null = null
  function Harness(): null {
    handlers = useOpenedSourceControlDiffActivation<TestTab>({
      worktreeId: 'wt-1',
      activeSessionTabIdRef: activeRef,
      sessionTabsRef: tabsRef,
      switchSessionTabRef: switchRef,
      fetchSessionTabs: async () => {},
      scheduleDelayedAction: (fn) => scheduled.push(fn)
    })
    return null
  }
  return { Harness, scheduled, switched, activeRef, getHandlers: () => handlers }
}

describe('useOpenedSourceControlDiffActivation', () => {
  let renderer: ReactTestRenderer | null = null

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
    // Drain any leftover bridge state so a singleton record can't leak across cases.
    takePendingSourceControlDiffOpen('wt-1')
    takePendingSourceControlDiffOpen('other')
  })

  async function mount(harness: ReturnType<typeof createHarness>): Promise<void> {
    await act(async () => {
      renderer = create(createElement(harness.Harness))
      await Promise.resolve()
    })
  }

  it('activates a diff the full-screen route recorded once the session refocuses', async () => {
    // Route side: opening a changed file records the pending diff before it pops back.
    recordPendingSourceControlDiffOpen({ worktreeId: 'wt-1', relativePath: 'src/app.ts' })
    const harness = createHarness(TABS, 'terminal-1')

    await mount(harness)
    // Focus claimed the pending open and scheduled the activation retries.
    expect(harness.scheduled.length).toBeGreaterThan(0)

    await flushActivation(() => harness.scheduled[0]?.())

    expect(harness.switched).toEqual(['diff-1'])
    expect(harness.activeRef.current).toBe('diff-1')
  })

  it('consumes the pending open once, so a later refocus does not re-activate', async () => {
    recordPendingSourceControlDiffOpen({ worktreeId: 'wt-1', relativePath: 'src/app.ts' })

    await mount(createHarness(TABS, 'terminal-1'))
    // The record is claimed on first focus; a fresh mount finds nothing to do.
    const second = createHarness(TABS, 'terminal-1')
    await mount(second)

    expect(second.scheduled).toEqual([])
    expect(second.switched).toEqual([])
  })

  it('ignores a pending open recorded for a different worktree', async () => {
    recordPendingSourceControlDiffOpen({ worktreeId: 'other', relativePath: 'src/app.ts' })
    const harness = createHarness(TABS, 'terminal-1')

    await mount(harness)

    expect(harness.scheduled).toEqual([])
    expect(harness.switched).toEqual([])
  })

  it('does nothing on focus when no file open is pending', async () => {
    const harness = createHarness(TABS, 'terminal-1')

    await mount(harness)

    expect(harness.scheduled).toEqual([])
    expect(harness.switched).toEqual([])
  })

  it('still activates via the docked handlers (snapshot at tap, switch after open)', async () => {
    const harness = createHarness(TABS, 'terminal-1')
    await mount(harness)
    expect(harness.scheduled).toEqual([])

    act(() => harness.getHandlers()?.handleFileOpenStart())
    act(() => harness.getHandlers()?.handleOpenedFileDiff('src/app.ts'))
    expect(harness.scheduled.length).toBeGreaterThan(0)

    await flushActivation(() => harness.scheduled[0]?.())

    expect(harness.switched).toEqual(['diff-1'])
  })
})
