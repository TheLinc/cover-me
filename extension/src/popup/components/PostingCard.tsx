import { useState } from 'react'
import type { JobData } from '../../types'

const BOARDS = [
  { name: 'LinkedIn jobs', url: 'https://www.linkedin.com/jobs/' },
  { name: 'Indeed jobs', url: 'https://www.indeed.com/' },
]

function siteOf(url: string) {
  return URL.canParse(url) ? new URL(url).hostname.replace(/^www\./, '') : ''
}

function Logo({ job }: { job: JobData }) {
  const [failed, setFailed] = useState<string>()
  if (job.logo && failed !== job.logo) {
    return <img className="posting-logo" src={job.logo} alt="" referrerPolicy="no-referrer" onError={() => setFailed(job.logo)} />
  }
  return <span className="posting-logo" aria-hidden="true">{job.company.trim().charAt(0).toUpperCase()}</span>
}

// posting: undefined while the tab is read, null when no posting was found (#346).
export default function PostingCard({ posting, onPaste }: { posting: JobData | null | undefined; onPaste: () => void }) {
  if (posting === undefined) {
    return (
      <div className="posting-card posting-reading" aria-busy="true">
        <span className="sr-only">Reading this tab…</span>
        <div className="posting-kicker" aria-hidden="true">This posting</div>
        <div className="posting-main" aria-hidden="true">
          <span className="posting-logo" />
          <div className="posting-text">
            <div className="posting-title"><span className="posting-bar" /></div>
            <div className="posting-meta"><span className="posting-bar short" /></div>
          </div>
        </div>
        <div className="posting-foot" aria-hidden="true"><span className="posting-bar short" /></div>
      </div>
    )
  }

  if (posting === null) {
    return (
      <div className="posting-empty">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </svg>
        <h2 className="posting-empty-title">Couldn't find a job posting here</h2>
        <p className="posting-empty-sub">Some careers pages only show the job once you click. Try anyway, or open a posting on LinkedIn or Indeed.</p>
        <div className="posting-boards">
          {BOARDS.map((b) => (
            <button key={b.url} className="btn btn-secondary btn-sm" onClick={() => void chrome.tabs.create({ url: b.url })}>{b.name}</button>
          ))}
        </div>
        <button className="upload-link posting-paste" onClick={onPaste}>Paste a job description instead</button>
      </div>
    )
  }

  const site = siteOf(posting.url)
  return (
    <div className="posting-card">
      <div className="posting-kicker">This posting</div>
      <div className="posting-main">
        <Logo job={posting} />
        <div className="posting-text">
          <div className="posting-title" title={posting.title}>{posting.title}</div>
          <div className="posting-meta">{[posting.company, site].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      <div className="posting-foot">
        <span>Read from this tab</span>
        <button className="upload-link" onClick={onPaste}>Wrong job? Paste it</button>
      </div>
    </div>
  )
}
