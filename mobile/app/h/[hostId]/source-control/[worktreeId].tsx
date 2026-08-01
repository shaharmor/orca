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
      // diff to the session (origin:'session' only) so it switches on focus after pop.
      onOpenedFileDiff={(relativePath) =>
        recordPendingSourceControlDiffOpen({ worktreeId, relativePath })
      }
    />
  )
}
