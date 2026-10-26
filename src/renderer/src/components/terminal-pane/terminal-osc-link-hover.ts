import type { Terminal } from '@xterm/xterm'
import { parseHttpUrl } from '../../../../shared/external-browser-types'

// xterm hands an OSC 8 link's URI only to its link handler, so right-clicks read the hovered one.
const hoveredOscLinks = new WeakMap<Terminal, string>()

export function setHoveredTerminalOscLink(terminal: Terminal, uri: string | null): void {
  if (uri) {
    hoveredOscLinks.set(terminal, uri)
  } else {
    hoveredOscLinks.delete(terminal)
  }
}

/** The http(s) OSC 8 link under the pointer, or null. */
export function readHoveredTerminalOscHttpLink(terminal: Terminal): string | null {
  return parseHttpUrl(hoveredOscLinks.get(terminal))
}
