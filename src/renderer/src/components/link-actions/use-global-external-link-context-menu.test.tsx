// @vitest-environment happy-dom

import React from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalExternalLinkContextMenu } from './use-global-external-link-context-menu'

type ItemProps = { onSelect?: () => void; children?: React.ReactNode }

vi.mock('@/components/ui/dropdown-menu', async () => {
  const React_ = await import('react')
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    React_.createElement(React_.Fragment, null, children)
  return {
    DropdownMenu: passthrough,
    DropdownMenuContent: ({ children }: { children?: React.ReactNode }) =>
      React_.createElement('div', { role: 'menu' }, children),
    DropdownMenuSub: passthrough,
    DropdownMenuSubContent: passthrough,
    DropdownMenuSubTrigger: passthrough,
    DropdownMenuTrigger: () => null,
    DropdownMenuItem: ({ onSelect, children }: ItemProps) =>
      React_.createElement('button', { role: 'menuitem', onClick: onSelect }, children)
  }
})
vi.mock('@/i18n/i18n', () => ({
  translate: vi.fn((_key: string, fallback: string, options?: Record<string, string>) =>
    fallback.replace(/\{\{browser\}\}/g, options?.browser ?? '{{browser}}')
  )
}))
const storeState = vi.hoisted(() => ({
  activeWorktreeId: 'wt-1',
  settings: null,
  installedBrowsers: [
    { id: 'com.google.Chrome', name: 'Google Chrome' },
    { id: 'com.apple.Safari', name: 'Safari' }
  ]
}))
vi.mock('@/store', () => ({
  useAppStore: Object.assign(
    (selector: (state: typeof storeState) => unknown) => selector(storeState),
    { getState: () => storeState }
  )
}))

const writeClipboardText = vi.fn(() => Promise.resolve())

function menuItems(): string[] {
  return Array.from(document.querySelectorAll('[role="menuitem"]')).map(
    (item) => item.textContent ?? ''
  )
}

function rightClick(element: Element): void {
  act(() => {
    fireEvent.contextMenu(element, { clientX: 10, clientY: 20 })
  })
}

function renderWithMenu(page: React.ReactNode): ReturnType<typeof render> {
  return render(
    <>
      {page}
      <GlobalExternalLinkContextMenu />
    </>
  )
}

beforeEach(() => {
  writeClipboardText.mockClear()
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { ui: { writeClipboardText } }
  })
})

afterEach(cleanup)

describe('GlobalExternalLinkContextMenu', () => {
  it('opens the shared link menu for a right-clicked http(s) anchor', () => {
    const view = renderWithMenu(<a href="https://github.com/o/r/pull/1">PR #1</a>)

    rightClick(view.getByText('PR #1'))

    expect(menuItems()).toEqual([
      'Open in Orca Browser',
      'Open in System Browser',
      'Google Chrome',
      'Safari',
      'Copy Link'
    ])
    fireEvent.click(view.getByText('Copy Link'))
    expect(writeClipboardText).toHaveBeenCalledWith('https://github.com/o/r/pull/1')
  })

  it('opens the menu for the URL on a marked control', () => {
    const view = renderWithMenu(
      <button type="button" data-orca-external-url="https://github.com/o/r/issues/2">
        Open on GitHub
      </button>
    )

    rightClick(view.getByText('Open on GitHub'))
    fireEvent.click(view.getByText('Copy Link'))

    expect(writeClipboardText).toHaveBeenCalledWith('https://github.com/o/r/issues/2')
  })

  it('offers installed browsers on a task-page row even inside a surface with its own menu', () => {
    const surfaceMenu = vi.fn((event: React.MouseEvent) => event.preventDefault())
    const view = renderWithMenu(
      <div onContextMenuCapture={surfaceMenu}>
        <div role="button" data-orca-external-url="https://linear.app/o/issue/ENG-1">
          <span>ENG-1 Fix login</span>
        </div>
      </div>
    )

    rightClick(view.getByText('ENG-1 Fix login'))

    expect(surfaceMenu).not.toHaveBeenCalled()
    expect(menuItems()).toEqual(expect.arrayContaining(['Google Chrome', 'Safari', 'Copy Link']))
  })

  it('leaves an event another surface already handled alone', () => {
    const view = renderWithMenu(
      <div onContextMenu={(event) => event.preventDefault()}>
        <a href="https://github.com/o/r/pull/1">PR #1</a>
      </div>
    )

    rightClick(view.getByText('PR #1'))

    expect(menuItems()).toEqual([])
  })

  it.each(['mailto:someone@example.com', 'docs/readme.md'])('ignores a %s href', (href) => {
    const view = renderWithMenu(<a href={href}>link</a>)

    rightClick(view.getByText('link'))

    expect(menuItems()).toEqual([])
  })
})
