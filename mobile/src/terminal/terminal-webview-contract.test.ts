import { describe, expect, it } from 'vitest'

import { parseTerminalKeyboardAvoidanceMetrics } from './terminal-webview-contract'

describe('parseTerminalKeyboardAvoidanceMetrics', () => {
  it('coerces a full payload', () => {
    expect(
      parseTerminalKeyboardAvoidanceMetrics({
        cursorY: 30,
        contentBottomRow: 34,
        rows: 40,
        altScreen: true
      })
    ).toEqual({ cursorY: 30, contentBottomRow: 34, rows: 40, altScreen: true })
  })

  it('defaults contentBottomRow to cursorY when absent (older WebView bundles)', () => {
    expect(parseTerminalKeyboardAvoidanceMetrics({ cursorY: 12, rows: 40 })).toEqual({
      cursorY: 12,
      contentBottomRow: 12,
      rows: 40,
      altScreen: false
    })
  })

  it('defaults non-numeric fields to zero', () => {
    expect(parseTerminalKeyboardAvoidanceMetrics({})).toEqual({
      cursorY: 0,
      contentBottomRow: 0,
      rows: 0,
      altScreen: false
    })
  })
})
