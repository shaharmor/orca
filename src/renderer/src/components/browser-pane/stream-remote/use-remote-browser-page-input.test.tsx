// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHarness } from './remote-browser-stream-lifecycle-test-harness'

vi.mock('@/runtime/runtime-rpc-client', () => ({ callRuntimeRpc: vi.fn(async () => ({})) }))

import { useRemoteBrowserPageInput } from './use-remote-browser-page-input'

const runRemoteNavigation = vi.fn()
const enqueueRemoteInput = vi.fn(async () => {})

function Frame(): React.JSX.Element {
  const { lifecycle } = createHarness()
  lifecycle.tokens.setRemotePage('page-1')
  const viewport = document.createElement('div')
  // Why: happy-dom lays nothing out; left clicks need a non-empty rect to map to a page point.
  viewport.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100)
  const { handleRemotePointerDown, handleRemotePointerUp } = useRemoteBrowserPageInput({
    busy: false,
    imageRef: { current: document.createElement('img') },
    remoteViewportRef: { current: viewport },
    remoteCssViewportSizeRef: { current: { width: 100, height: 100 } },
    remoteViewportSizeRef: { current: { width: 100, height: 100 } },
    frameMetadata: null,
    runtimeTarget: () => ({ kind: 'environment', environmentId: 'env-1' }),
    lifecycle,
    runtimeWorktree: 'worktree-a',
    enqueueRemoteInput,
    createRemoteOperationToken: (remotePageId) =>
      lifecycle.tokens.createOperationToken(remotePageId),
    isCurrentRemoteOperationToken: () => true,
    closeMissingRemotePage: vi.fn(),
    scheduleRemoteTabInfoRefresh: vi.fn(),
    setPaneNotice: vi.fn(),
    runRemoteNavigation
  })
  return (
    <img
      alt=""
      data-testid="frame"
      onPointerDown={handleRemotePointerDown}
      onPointerUp={handleRemotePointerUp}
    />
  )
}

describe('remote browser frame mouse Back/Forward', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('goes back in the remote page on Back release without sending mouse input', () => {
    render(<Frame />)
    const frame = screen.getByTestId('frame')

    expect(fireEvent.pointerDown(frame, { button: 3 })).toBe(false)
    expect(fireEvent.pointerUp(frame, { button: 3 })).toBe(false)

    expect(runRemoteNavigation).toHaveBeenCalledExactlyOnceWith('browser.back')
    expect(enqueueRemoteInput).not.toHaveBeenCalled()
  })

  it('goes forward in the remote page on Forward release', () => {
    render(<Frame />)

    fireEvent.pointerUp(screen.getByTestId('frame'), { button: 4 })

    expect(runRemoteNavigation).toHaveBeenCalledExactlyOnceWith('browser.forward')
  })

  it('keeps sending left clicks to the remote page', () => {
    render(<Frame />)

    fireEvent.pointerDown(screen.getByTestId('frame'), { button: 0 })

    expect(runRemoteNavigation).not.toHaveBeenCalled()
    expect(enqueueRemoteInput).toHaveBeenCalledOnce()
  })
})
