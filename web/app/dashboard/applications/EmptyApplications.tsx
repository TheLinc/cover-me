import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr'
import { CHROME_STORE_URL } from '@/lib/utils'

// Before the first application: what will appear here, and where to start.
// Shared by the dashboard section and the applications page.
export function EmptyApplications({ pro }: { pro: boolean }) {
  return (
    <div className="flex flex-col items-start gap-1.5 rounded-[20px] border border-dashed border-line px-6 py-7">
      <p className="text-[15px] font-semibold text-ink">No applications yet</p>
      <p className="max-w-[46ch] text-[13.5px] text-ink-2">
        {pro
          ? 'Letters and tailored resumes you make in the extension appear here, on every device.'
          : 'Jobs you make a letter or resume for in the extension appear here.'}
      </p>
      <p className="max-w-[46ch] text-[13.5px] text-ink-2">
        Haven&apos;t installed the extension yet?{' '}
        <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-strong underline-offset-4 hover:underline">
          Add it to Chrome <ArrowUpRightIcon size={12} aria-hidden />
        </a>{' '}
        and let&apos;s get applying.
      </p>
    </div>
  )
}
