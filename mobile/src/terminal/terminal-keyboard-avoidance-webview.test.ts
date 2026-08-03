import { readFileSync } from 'node:fs'
import { Script } from 'node:vm'
import { Terminal } from '@xterm/xterm'
import { describe, expect, it, vi } from 'vitest'
import { TERMINAL_KEYBOARD_AVOIDANCE_METRICS_JS } from './terminal-keyboard-avoidance-metrics-injected'

const terminalHtmlSource = readFileSync(
  new URL('./terminal-webview-html.ts', import.meta.url),
  'utf8'
)
const reflowSource = readFileSync(
  new URL('./terminal-webview-reflow-injected.ts', import.meta.url),
  'utf8'
)

type Cell = { isBgDefault: () => boolean; isInverse: () => number }

function makeLine(text = '', styledColumns: number[] = []) {
  const styled = new Set(styledColumns)
  return {
    isWrapped: false,
    length: 10,
    translateToString: vi.fn(() => text),
    getCell: (column: number): Cell => ({
      isBgDefault: () => !styled.has(column),
      isInverse: () => 0
    })
  }
}

function runMetrics(lines: Array<ReturnType<typeof makeLine> | undefined>, altScreen = false) {
  const notifications: Array<Record<string, unknown>> = []
  const buffer = {
    cursorY: 2,
    viewportY: 3,
    type: altScreen ? 'alternate' : 'normal',
    getLine: (index: number) => lines[index - 3],
    getNullCell: () => ({})
  }
  const context = {
    notifications,
    notify: (message: Record<string, unknown>) => notifications.push(message),
    term: { buffer: { active: buffer }, cols: 10, rows: lines.length }
  }
  new Script(
    `${TERMINAL_KEYBOARD_AVOIDANCE_METRICS_JS}\nemitKeyboardAvoidanceMetrics();`
  ).runInNewContext(context)
  return notifications[0]
}

function runTerminalMetrics(term: Terminal) {
  const notifications: Array<Record<string, unknown>> = []
  new Script(
    `${TERMINAL_KEYBOARD_AVOIDANCE_METRICS_JS}\nemitKeyboardAvoidanceMetrics();`
  ).runInNewContext({
    notify: (message: Record<string, unknown>) => notifications.push(message),
    term
  })
  return notifications[0]
}

function write(term: Terminal, data: string): Promise<void> {
  return new Promise((resolve) => term.write(data, resolve))
}

describe('terminal keyboard-avoidance WebView metrics', () => {
  it('finds text on wrapped rows using the visible viewport offset', () => {
    const lines = [makeLine('header'), makeLine(''), makeLine('wrapped footer')]
    lines[2]!.isWrapped = true
    expect(runMetrics(lines)).toMatchObject({ contentBottomRow: 2 })
  })

  it('ignores blank rows but keeps background-only ANSI chrome visible', () => {
    expect(runMetrics([makeLine('header'), makeLine(''), makeLine('')])).toMatchObject({
      contentBottomRow: 0
    })
    expect(runMetrics([makeLine('header'), makeLine(''), makeLine('', [4])])).toMatchObject({
      contentBottomRow: 2
    })
  })

  it('ignores real xterm default spaces but keeps visible rows', async () => {
    const cases = [
      { data: '     ', expected: 0 },
      { data: 'footer', expected: 7 },
      { data: '\x1b[41m     \x1b[0m', expected: 7 },
      { data: '\x1b[7m     \x1b[0m', expected: 7 }
    ]

    for (const { data, expected } of cases) {
      const term = new Terminal({ cols: 10, rows: 8 })
      try {
        await write(term, `\x1b[8;1H${data}`)
        expect(runTerminalMetrics(term)).toMatchObject({ contentBottomRow: expected })
      } finally {
        term.dispose()
      }
    }
  })

  it('stops at the first bottom-up match and skips scans on alternate screen', () => {
    const footer = makeLine('footer')
    const header = makeLine('header')
    expect(runMetrics([header, makeLine(''), footer])).toMatchObject({ contentBottomRow: 2 })
    expect(footer.translateToString).toHaveBeenCalledTimes(1)
    expect(header.translateToString).not.toHaveBeenCalled()

    footer.translateToString.mockImplementation(() => {
      throw new Error('alternate screen must not scan')
    })
    expect(runMetrics([header, makeLine(''), footer], true)).toMatchObject({
      altScreen: true,
      contentBottomRow: 0
    })
  })

  it('refreshes metrics after every buffer geometry reset', () => {
    const resizeStart = terminalHtmlSource.indexOf('  function resize(cols, rows)')
    const resizeEnd = terminalHtmlSource.indexOf('\n  // reflow()', resizeStart)
    const clearStart = terminalHtmlSource.indexOf("} else if (msg.type === 'clear') {")
    const clearEnd = terminalHtmlSource.indexOf("} else if (msg.type === 'measure')", clearStart)
    const textScaleStart = terminalHtmlSource.indexOf('  function applyTextScale(scale)')
    const textScaleEnd = terminalHtmlSource.indexOf('\n  var panX', textScaleStart)

    for (const block of [
      terminalHtmlSource.slice(resizeStart, resizeEnd),
      terminalHtmlSource.slice(clearStart, clearEnd),
      terminalHtmlSource.slice(textScaleStart, textScaleEnd),
      reflowSource
    ]) {
      expect(block.indexOf('emitKeyboardAvoidanceMetrics()')).toBeGreaterThan(
        block.includes('term.resize') ? block.indexOf('term.resize') : block.indexOf('term.reset')
      )
    }
  })
})
