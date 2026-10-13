import { summarizeApplication, type Application } from '@/lib/applications'
import { CopyLetterButton } from './CopyLetterButton'
import { LocalDate } from './LocalDate'

// Read-only: letters to read and copy, tailored resumes with their ATS score.
export function ApplicationList({ applications }: { applications: Application[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {applications.map((app) => {
        const s = summarizeApplication(app)
        return (
          <li key={app.id} className="py-3">
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-foreground truncate">{app.title || 'Untitled role'}</p>
                <p className="text-[12.5px] text-muted-foreground truncate">
                  {app.company || 'Unknown company'} · <LocalDate iso={app.createdAt} options={{ month: 'short', day: 'numeric', year: 'numeric' }} />
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
                <pre className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-[1.6] text-foreground font-sans">{cl.letter}</pre>
                <CopyLetterButton letter={cl.letter} />
              </details>
            ))}
          </li>
        )
      })}
    </ul>
  )
}
