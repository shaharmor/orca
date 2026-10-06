import { useRef } from 'react'
import { getRemoteBrowserHistoryMethod } from './remote-browser-page-input-model'

/** Mouse Back/Forward over the remote frame: page history, owned by the surface the press began on. */
export function useRemoteBrowserSideButtonPress({
  enqueueRemoteInput,
  runRemoteNavigation
}: {
  enqueueRemoteInput: (operation: () => Promise<void>) => Promise<void>
  runRemoteNavigation: (method: 'browser.back' | 'browser.forward') => Promise<void> | void
}): {
  /** True when the event was a side-button press, which never reaches the remote page. */
  claimSideButtonDown: (event: React.PointerEvent<HTMLImageElement>) => boolean
  claimSideButtonUp: (event: React.PointerEvent<HTMLImageElement>) => boolean
  handleRemoteLostPointerCapture: () => void
} {
  const pendingButtonRef = useRef<number | null>(null)

  const claimSideButtonDown = (event: React.PointerEvent<HTMLImageElement>): boolean => {
    if (!getRemoteBrowserHistoryMethod(event.button)) {
      return false
    }
    // Why: navigation fires on release; cancel the press so it never reaches the remote page.
    event.preventDefault()
    // Why capture: mouse pointers get no implicit capture, so a release over chrome would be lost.
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pendingButtonRef.current = event.button
    return true
  }

  const claimSideButtonUp = (event: React.PointerEvent<HTMLImageElement>): boolean => {
    const historyMethod = getRemoteBrowserHistoryMethod(event.button)
    if (!historyMethod) {
      return false
    }
    event.preventDefault()
    // Why: a press that began over Orca chrome is not this page's to navigate.
    const startedHere = pendingButtonRef.current === event.button
    pendingButtonRef.current = null
    if (startedHere) {
      // Why queue: a click still in flight must land before Back, or Back undoes the wrong entry.
      void enqueueRemoteInput(async () => {
        await runRemoteNavigation(historyMethod)
      })
    }
    return true
  }

  // Why: pointercancel or an interrupted capture ends the press without a navigating release.
  const handleRemoteLostPointerCapture = (): void => {
    pendingButtonRef.current = null
  }

  return { claimSideButtonDown, claimSideButtonUp, handleRemoteLostPointerCapture }
}
