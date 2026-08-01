import { useLocalSearchParams } from 'expo-router'
import { MobileSourceControlPanel } from '../../../../src/source-control/MobileSourceControlPanel'
import { firstParam } from '../../../../src/source-control/mobile-source-control-screen-state'
import { parseSourceControlHubTab } from '../../../../src/source-control/mobile-source-control-hub-tab'
import { recordPendingSourceControlDiffOpen } from '../../../../src/session/pending-source-control-diff-open'

export default function MobileSourceControlScreen() {
  const params = useLocalSearchParams<{
    hostId?: string | string[]
    worktreeId?: string | string[]
    name?: string | string[]
    origin?: string | string[]
    tab?: string | string[]
  }>()
  const worktreeId = firstParam(params.worktreeId)
  return (
    <MobileSourceControlPanel
      hostId={firstParam(params.hostId)}
      worktreeId={worktreeId}
      name={firstParam(params.name)}
      origin={firstParam(params.origin)}
      initialTab={parseSourceControlHubTab(params.tab)}
      embedded={false}
      // Full-screen route can't reach the session's tab activation; hand the opened
      // diff to the session so it switches on focus after pop. Safe to wire
      // unconditionally: the opener only calls onOpenedFileDiff for origin:'session'
      // (non-session origins early-return before the openDiff RPC).
      onOpenedFileDiff={(relativePath) =>
        recordPendingSourceControlDiffOpen({ worktreeId, relativePath })
      }
    />
  )
}
