import type { Application } from '@/lib/applications'
import { summarizeApplication } from '@/lib/applications'

// Pro history, read-only: letters to read, tailored resumes with their ATS
// score. PDFs and a full applications page come in 2f.
export function ApplicationHistory({ applications }: { applications: Application[] }) {
  return (
    <section className="bg-surface border border-border rounded-[10px] px-7 py-6" style={{ animation: 'fadeUp 0.5s ease 0.2s both' }}>
      <h2 className="text-[15px] text-foreground mb-1">Your applications</h2>
      <p className="text-[13px] text-muted-foreground mb-4">
        {applications.length === 0
          ? 'Letters and tailored resumes you make in the extension appear here, on every device.'
          : applications.length >= 30
            ? 'Your 30 most recent, synced from the extension.'
            : 'Synced from the extension.'}
      </p>
      <ul className="flex flex-col divide-y divide-border">
        {applications.map((app) => {
          const s = summarizeApplication(app)
          return (
            <li key={app.id} className="py-3">
              <div className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-foreground truncate">{app.title || 'Untitled role'}</p>
                  <p className="text-[12.5px] text-muted-foreground truncate">
                    {/* UTC on both server and browser, or an evening date differs and hydration fails. */}
                    {app.company || 'Unknown company'} · {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                  </p>
                </div>
                {s.bestScore !== null && (
                  <span className="text-[13px] font-semibold text-ink shrink-0">ATS {s.bestScore}</span>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground mt-1">
                {s.letters} letter{s.letters === 1 ? '' : 's'} · {s.resumes} tailored resume{s.resumes === 1 ? '' : 's'}
                {s.gaps.length > 0 && <> · missing: {s.gaps.slice(0, 3).join(', ')}</>}
              </p>
              {app.coverLetters.map((cl, i) => (
                <details key={cl.id} className="mt-2">
                  <summary className="text-[12.5px] text-brand-light cursor-pointer">
                    Read letter{app.coverLetters.length > 1 ? ` ${i + 1}` : ''}
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.6] text-foreground font-sans">{cl.letter}</pre>
                </details>
              ))}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
