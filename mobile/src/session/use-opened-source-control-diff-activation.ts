import { useCallback, useRef, type MutableRefObject } from 'react'
import { useFocusEffect } from 'expo-router'
import {
  activateOpenedSourceControlDiffTab,
  type OpenedMobileSessionTabCandidate
} from './opened-mobile-session-tab'
import { takePendingSourceControlDiffOpen } from './pending-source-control-diff-open'

type Options<T extends OpenedMobileSessionTabCandidate> = {
  worktreeId: string
  activeSessionTabIdRef: MutableRefObject<string | null>
  sessionTabsRef: MutableRefObject<T[]>
  switchSessionTabRef: MutableRefObject<((tab: T) => void) | null>
  fetchSessionTabs: () => Promise<void>
  scheduleDelayedAction: (fn: () => void, ms: number) => void
}

// Owns activating the diff tab opened by tapping a changed file in mobile Source Control.
// Docked panels call handleFileOpenStart at tap (snapshotting the active tab so a mid-RPC
// switch isn't stolen back) then handleOpenedFileDiff once the desktop opens it. The
// full-screen route can't reach these across the nav stack, so it records the path and this
// hook claims it on refocus — treating the current tab as the tap-time tab since the route
// covered the session.
export function useOpenedSourceControlDiffActivation<T extends OpenedMobileSessionTabCandidate>(
  options: Options<T>
): { handleFileOpenStart: () => void; handleOpenedFileDiff: (relativePath: string) => void } {
  const {
    worktreeId,
    activeSessionTabIdRef,
    sessionTabsRef,
    switchSessionTabRef,
    fetchSessionTabs,
    scheduleDelayedAction
  } = options

  const activationSeqRef = useRef(0)
  const fileOpenStartActiveTabIdRef = useRef<string | null>(null)

  const handleFileOpenStart = useCallback(() => {
    fileOpenStartActiveTabIdRef.current = activeSessionTabIdRef.current
  }, [activeSessionTabIdRef])

  const handleOpenedFileDiff = useCallback(
    (relativePath: string) => {
      const activationSeq = ++activationSeqRef.current
      const activeTabIdAtTap = fileOpenStartActiveTabIdRef.current

      let activated = false
      const activateOpenedTab = async (): Promise<void> => {
        // Route matching through the shared helper so the repro test exercises the same logic production runs.
        const settled = await activateOpenedSourceControlDiffTab<T>({
          relativePath,
          activeTabIdAtTap,
          fetchSessionTabs,
          getTabs: () => sessionTabsRef.current,
          getActiveTabId: () => activeSessionTabIdRef.current,
          getActivationState: () => ({
            activated,
            activationSeq,
            latestActivationSeq: activationSeqRef.current
          }),
          switchSessionTab: (tab) => switchSessionTabRef.current?.(tab)
        })
        if (settled) {
          activated = true
        }
      }

      scheduleDelayedAction(() => void activateOpenedTab(), 300)
      scheduleDelayedAction(() => void activateOpenedTab(), 900)
      scheduleDelayedAction(() => void activateOpenedTab(), 1800)
    },
    [
      activeSessionTabIdRef,
      fetchSessionTabs,
      scheduleDelayedAction,
      sessionTabsRef,
      switchSessionTabRef
    ]
  )

  useFocusEffect(
    useCallback(() => {
      const relativePath = takePendingSourceControlDiffOpen(worktreeId)
      if (!relativePath) {
        return
      }
      fileOpenStartActiveTabIdRef.current = activeSessionTabIdRef.current
      handleOpenedFileDiff(relativePath)
    }, [activeSessionTabIdRef, handleOpenedFileDiff, worktreeId])
  )

  return { handleFileOpenStart, handleOpenedFileDiff }
}
