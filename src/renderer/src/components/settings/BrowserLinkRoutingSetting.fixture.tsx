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
      linkRoutingDescription={getBrowserLinkRoutingDescription({ isMac: true })}
      isMac
      updateSettings={() => {}}
    />
  )
})
