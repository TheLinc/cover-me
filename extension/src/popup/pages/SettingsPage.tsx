import PageReadSetting from '../components/PageReadSetting'
import AccountPanel from '../components/AccountPanel'
import { ReviewLinksSetting } from '../components/ReviewAsk'
import { TemplateSetting } from '../components/TemplatePicker'
import { WhatsNewSetting } from '../components/WhatsNew'

export default function SettingsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Your account, or your own API key</p>
      </div>
      <AccountPanel />
      <TemplateSetting />
      <PageReadSetting />
      <WhatsNewSetting />
      <ReviewLinksSetting />
    </div>
  )
}
