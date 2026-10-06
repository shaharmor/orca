// Marks web page content Orca draws itself (the remote screencast frame). `<webview>` guests
// count without the marker. Mouse Back/Forward there drive the page, not worktree history.
export const BROWSER_PAGE_SURFACE_ATTRIBUTE = 'data-browser-page-surface'

export function isInsideBrowserPageSurface(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(`webview, [${BROWSER_PAGE_SURFACE_ATTRIBUTE}]`) !== null
  )
}
