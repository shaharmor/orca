import { useAppStore } from '@/store'
import type { ExternalLinkMenuTarget } from '@/components/link-actions/external-link-menu-model'
import { canNativeChatOpenOwnedBrowser } from '../native-chat/native-chat-http-link-source-owner'
import type { PtyTransport } from './pty-transport-types'
import { resolveTerminalHttpLinkSourceOwner } from './terminal-http-link-source-owner'

/** The right-clicked terminal URL with the pane's owner, so remote panes only offer reachable browsers. */
export function resolveTerminalLinkMenuTarget(
  url: string,
  transport: PtyTransport | undefined,
  worktreeId: string
): ExternalLinkMenuTarget {
  const sourceOwner = resolveTerminalHttpLinkSourceOwner(transport)
  return {
    url,
    worktreeId,
    sourceOwner,
    canOpenOwnedBrowser: canNativeChatOpenOwnedBrowser(
      useAppStore.getState(),
      worktreeId,
      sourceOwner
    )
  }
}
