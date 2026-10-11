import AccountPanel from '../popup/components/AccountPanel'
import ResumePage from '../popup/pages/ResumePage'
import logoIcon from '../public/icon/48.png'

export default function Welcome() {
  return (
    <main className="welcome">
      <div className="logo">
        <img src={logoIcon} width="32" height="32" alt="" className="logo-icon" />
        <span className="logo-text">Cover Me</span>
      </div>
      <h1 className="page-title" style={{ marginTop: 16 }}>Your first letter is three steps away</h1>

      <section className="welcome-step">
        <h2>1. Create a free account, or add your own API key</h2>
        <AccountPanel />
      </section>

      <section className="welcome-step">
        <h2>2. Add your resume</h2>
        <ResumePage hideHeader />
      </section>

      <section className="welcome-step">
        <h2>3. Open a job posting</h2>
        <p className="hint">
          Pin Cover Me: click the puzzle icon in Chrome's toolbar, then the pin next to Cover Me.
          On any posting (LinkedIn, Indeed, Greenhouse, Lever, Workday and more), click Cover Me, then Generate.
        </p>
      </section>
    </main>
  )
}
