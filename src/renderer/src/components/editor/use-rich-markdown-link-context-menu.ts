import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { canSourceOwnerOpenInOrca, openRoutedHttpLink } from '@/lib/http-link-destinations'
import type { HttpLinkSourceOwner } from '@/lib/http-link-routing'
import { useAppStore } from '@/store'
import { canNativeChatOpenOwnedBrowser } from '../native-chat/native-chat-http-link-source-owner'
import type { RichMarkdownHtmlSuperscriptLinkContext } from './rich-markdown-html-superscript-link-context'

type CapturedLinkTarget = {
  url: string
  x: number
  y: number
  worktreeId: string
  sourceOwner: HttpLinkSourceOwner
}

function readHttpHref(anchor: Element | null): string | null {
  const href = anchor?.getAttribute('href')
  if (!href) {
    return null
  }
  try {
    const parsed = new URL(href)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}

/** Tells main's native menu whether a right-clicked link can open in Orca Browser, and opens it there. */
export function useRichMarkdownLinkContextMenu(
  editor: Editor | null,
  linkContext: Pick<RichMarkdownHtmlSuperscriptLinkContext, 'getSnapshot'>
): void {
  const capturedTargetRef = useRef<CapturedLinkTarget | null>(null)

  useEffect(() => {
    if (!editor) {
      return
    }
    const editorDom = editor.view.dom
    const captureTarget = (event: MouseEvent): void => {
      capturedTargetRef.current = null
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      const url = anchor && editorDom.contains(anchor) ? readHttpHref(anchor) : null
      const { worktreeId, sourceOwner } = linkContext.getSnapshot()
      const canOpenInOrca =
        url !== null &&
        canSourceOwnerOpenInOrca(
          sourceOwner,
          canNativeChatOpenOwnedBrowser(useAppStore.getState(), worktreeId, sourceOwner)
        )
      if (!url || !canOpenInOrca) {
        window.api.ui.setRichMarkdownContextMenuLinkTarget(null)
        return
      }
      capturedTargetRef.current = {
        url,
        x: event.clientX,
        y: event.clientY,
        worktreeId,
        sourceOwner
      }
      window.api.ui.setRichMarkdownContextMenuLinkTarget({ x: event.clientX, y: event.clientY })
    }
    const unsubscribe = window.api.ui.onRichMarkdownContextCommand((payload) => {
      if (payload.command !== 'open-link-in-orca-browser') {
        return
      }
      const target = capturedTargetRef.current
      capturedTargetRef.current = null
      if (!target || payload.x !== target.x || payload.y !== target.y) {
        return
      }
      openRoutedHttpLink(target.url, {
        worktreeId: target.worktreeId,
        sourceOwner: target.sourceOwner,
        forceDestination: 'orca'
      })
    })
    editorDom.addEventListener('contextmenu', captureTarget)
    return () => {
      editorDom.removeEventListener('contextmenu', captureTarget)
      unsubscribe()
    }
  }, [editor, linkContext])
}
