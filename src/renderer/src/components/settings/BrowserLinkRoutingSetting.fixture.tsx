import { defineFixture } from '../../component-fixtures/component-fixture'
import { getDefaultSettings } from '../../../../shared/constants'
import { BrowserLinkRoutingSetting } from './BrowserLinkRoutingSetting'
import { getBrowserLinkRoutingDescription } from './browser-link-routing-copy'

const SETTINGS_ROW_WIDTH = 640

export const linkRouting = defineFixture({
  width: SETTINGS_ROW_WIDTH,
  render: () => (
    <BrowserLinkRoutingSetting
      settings={getDefaultSettings('/home/fixture')}
      installedBrowsers={[
        { id: 'com.google.Chrome', name: 'Google Chrome' },
        { id: 'com.microsoft.edgemac', name: 'Microsoft Edge' }
      ]}
      linkRoutingDescription={getBrowserLinkRoutingDescription({ isMac: true })}
      isMac
      updateSettings={() => {}}
    />
  )
})

// Dropdown open with Microsoft Edge chosen as the default browser.
export const linkRoutingOpen = defineFixture({
  width: SETTINGS_ROW_WIDTH,
  render: () => (
    <div style={{ paddingTop: 110, paddingBottom: 60 }}>
      <BrowserLinkRoutingSetting
        settings={{
          ...getDefaultSettings('/home/fixture'),
          externalBrowserId: 'com.microsoft.edgemac'
        }}
        installedBrowsers={[
          { id: 'com.google.Chrome', name: 'Google Chrome' },
          { id: 'com.microsoft.edgemac', name: 'Microsoft Edge' },
          { id: 'com.apple.Safari', name: 'Safari' }
        ]}
        linkRoutingDescription={getBrowserLinkRoutingDescription({ isMac: true })}
        isMac
        updateSettings={() => {}}
      />
    </div>
  ),
  interact: (frame) => {
    const trigger = frame.querySelector<HTMLElement>('[data-slot="select-trigger"]')
    trigger?.focus()
    trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  }
})
