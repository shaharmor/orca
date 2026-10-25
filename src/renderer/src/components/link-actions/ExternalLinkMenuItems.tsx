import { AppWindow, Copy, ExternalLink, Globe } from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import {
  buildExternalLinkMenuModel,
  type ExternalLinkMenuDestination,
  type ExternalLinkMenuTarget
} from './external-link-menu-model'

function openInLabel(destination: ExternalLinkMenuDestination): string {
  return translate('components.linkActions.openInBrowser', 'Open in {{browser}}', {
    browser: destination.name
  })
}

/** The shared right-click link section for DropdownMenu-based surfaces. */
export function ExternalLinkMenuItems({
  target
}: {
  target: ExternalLinkMenuTarget
}): React.JSX.Element {
  const installedBrowsers = useAppStore((state) => state.installedBrowsers)
  // Subscribed so the external row relabels when the configured browser changes.
  useAppStore((state) => state.settings?.externalBrowserId)
  const model = buildExternalLinkMenuModel(target, installedBrowsers)
  return (
    <>
      {model.orcaBrowser ? (
        <DropdownMenuItem onSelect={model.orcaBrowser.open}>
          <Globe />
          {openInLabel(model.orcaBrowser)}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onSelect={model.externalDefault.open}>
        <ExternalLink />
        {openInLabel(model.externalDefault)}
      </DropdownMenuItem>
      <ExternalLinkOpenInSubmenu browsers={model.installedBrowsers} />
      <DropdownMenuItem
        onSelect={() => {
          // Best-effort like other menu copies: the clipboard can reject when unfocused.
          window.api.ui.writeClipboardText(model.url).catch(() => {})
        }}
      >
        <Copy />
        {translate('components.linkActions.copyLink', 'Copy Link')}
      </DropdownMenuItem>
    </>
  )
}

/** "Open in ▸ <browser>" for one link; renders nothing when no browser can be chosen. */
export function ExternalLinkOpenInSubmenu({
  browsers
}: {
  browsers: readonly ExternalLinkMenuDestination[]
}): React.JSX.Element | null {
  if (browsers.length === 0) {
    return null
  }
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <AppWindow />
        {translate('components.linkActions.openInSubmenu', 'Open in')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {browsers.map((browser) => (
          <DropdownMenuItem key={browser.id} onSelect={browser.open}>
            {browser.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
