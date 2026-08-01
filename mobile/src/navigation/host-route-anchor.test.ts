import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Why: pushing a deep /h/[hostId]/... route from outside the group (the Home
// Screen resume/account cards, notification taps) lands on the group's default
// [hostId]/index ("Host") screen instead of the target — cold Expo deep links
// resolve to the group index (see coordinateMobileTasksNavigation, which works
// around the same issue for Tasks). The fix pairs an initialRouteName anchor on
// the /h group with withAnchor on each from-root push. Native-stack focus can
// only be verified on-device, so these guards keep both halves in place.
function readApp(relativePath: string): string {
  return readFileSync(new URL(`../../app/${relativePath}`, import.meta.url), 'utf8')
}

function pushCall(source: string, marker: string): string {
  const markerIndex = source.indexOf(marker)
  expect(markerIndex).toBeGreaterThanOrEqual(0)
  const openParen = source.indexOf('(', source.lastIndexOf('router.push', markerIndex))
  expect(openParen).toBeGreaterThanOrEqual(0)
  // Why: the resume push nests createMobileSessionHref({...}), so match balanced
  // parens rather than stopping at the first ')'.
  let depth = 0
  for (let i = openParen; i < source.length; i++) {
    if (source[i] === '(') {
      depth++
    } else if (source[i] === ')' && --depth === 0) {
      return source.slice(openParen, i + 1)
    }
  }
  throw new Error(`Unbalanced router.push() for marker: ${marker}`)
}

describe('host route group anchoring', () => {
  it('anchors the /h group to the Host screen so from-root deep links keep it underneath', () => {
    const layout = readApp('h/_layout.tsx')
    expect(layout).toContain('export const unstable_settings')
    expect(layout).toMatch(/initialRouteName:\s*'\[hostId\]\/index'/)
  })

  it('opens the resume worktree with withAnchor so it lands on the session, not Host', () => {
    const home = readApp('index.tsx')
    expect(pushCall(home, 'worktreeId: resumeWorktree.worktree.worktreeId')).toContain(
      'withAnchor: true'
    )
  })

  it('opens the Account-usage card with withAnchor', () => {
    const home = readApp('index.tsx')
    expect(pushCall(home, '/accounts`')).toContain('withAnchor: true')
  })

  it('opens notification taps with withAnchor so a session tap lands on the session', () => {
    const root = readApp('_layout.tsx')
    expect(pushCall(root, 'router.push(path')).toContain('withAnchor: true')
  })
})
