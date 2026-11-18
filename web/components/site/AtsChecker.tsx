'use client'

import { useDeferredValue, useMemo, useState, type ChangeEvent } from 'react'
import { CheckIcon, UploadSimpleIcon, XIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { checkResume, readPosting, type Level } from '@/lib/ats-checker/keywords'
import { readResumeFile } from '@/lib/ats-checker/read-resume'
import { cn, CHROME_STORE_URL } from '@/lib/utils'

const GROUPS: { level: Level; title: string }[] = [
  { level: 'required', title: 'Must-have' },
  { level: 'preferred', title: 'Nice to have' },
  { level: 'mentioned', title: 'Also in the posting' },
]

export function AtsChecker() {
  const [posting, setPosting] = useState('')
  const [resume, setResume] = useState('')
  const [fileNote, setFileNote] = useState<{ text: string; error?: boolean } | null>(null)

  const deferredPosting = useDeferredValue(posting)
  const read = useMemo(() => (deferredPosting.trim() ? readPosting(deferredPosting) : null), [deferredPosting])
  const result = useMemo(
    () => (read && resume.trim() ? { keywords: checkResume(read.keywords, resume), years: read.years } : null),
    [read, resume],
  )

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileNote({ text: `Reading ${file.name}...` })
    try {
      const text = await readResumeFile(file)
      if (!text) throw new Error(`No text found in ${file.name}. If it's a scanned image, paste the text instead.`)
      setResume(text)
      setFileNote({ text: `Read ${file.name}. Check the text below came through.` })
    } catch (err) {
      setFileNote({ text: err instanceof Error ? err.message : `Couldn't read ${file.name}.`, error: true })
    }
  }

  const found = result?.keywords.filter((k) => k.found).length ?? 0

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="posting" className="flex h-9 items-center text-[15px] font-semibold text-ink">Job posting</Label>
          <Textarea
            id="posting"
            value={posting}
            onChange={(e) => setPosting(e.target.value)}
            placeholder="Paste the whole posting, including its requirements"
            className="min-h-[320px] bg-white text-[14px] leading-[1.55]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex h-9 items-center justify-between gap-3">
            <Label htmlFor="resume" className="text-[15px] font-semibold text-ink">Your resume</Label>
            <Button asChild variant="outline" size="sm">
              <label className="cursor-pointer focus-within:ring-2 focus-within:ring-ring">
                <UploadSimpleIcon size={16} aria-hidden />
                Upload PDF or Word
                <input type="file" accept=".pdf,.docx,.txt,application/pdf" onChange={onFile} className="sr-only" />
              </label>
            </Button>
          </div>
          <Textarea
            id="resume"
            value={resume}
            onChange={(e) => {
              setResume(e.target.value)
              setFileNote(null)
            }}
            placeholder="Paste your resume, or upload it as a PDF or Word file"
            className="min-h-[320px] bg-white text-[14px] leading-[1.55]"
          />
          {fileNote && (
            <p role="status" className={cn('text-[13px]', fileNote.error ? 'text-gap-ink' : 'text-ink-2')}>{fileNote.text}</p>
          )}
        </div>
      </div>
      <p className="-mt-6 text-[13px] text-ink-2">
        Both stay in your browser. Nothing is uploaded or saved, and no AI reads them.
      </p>

      <section aria-labelledby="results" className="flex flex-col gap-8">
        <h2 id="results" aria-live="polite" className="text-[clamp(24px,2.6vw,32px)] leading-[1.15]">
          {!result
            ? 'Paste a posting and your resume to see the keywords.'
            : result.keywords.length
              ? `${found} of ${result.keywords.length} keywords found`
              : 'No keywords found in this posting. Paste all of it, including the requirements.'}
        </h2>

        {result && GROUPS.map(({ level, title }) => {
          const group = result.keywords.filter((k) => k.level === level)
          if (!group.length) return null
          return (
            <div key={level} className="flex flex-col gap-3">
              <h3 className="text-[15px] font-semibold text-ink">
                {title} <span className="font-normal text-ink-2">({group.filter((k) => k.found).length} of {group.length})</span>
              </h3>
              <ul className="flex flex-wrap gap-2">
                {group.map((k) => (
                  <li
                    key={k.name}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px]',
                      k.found ? 'bg-brand-tint text-brand-ink' : 'border border-dashed border-gap bg-gap-tint text-gap-ink',
                    )}
                  >
                    {k.found ? <CheckIcon size={14} weight="bold" aria-hidden /> : <XIcon size={14} weight="bold" aria-hidden />}
                    {k.name}
                    {k.via && <span className="text-[13px] opacity-75">or {k.via}</span>}
                    <span className="sr-only">{k.via ? ', the resume has the other option' : k.found ? ', on your resume' : ', missing'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}

        {result && result.years.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-[15px] font-semibold text-ink">Experience the posting asks for</h3>
            <p className="text-[14px] text-ink-2">Compare these with the dates on your resume. The checker doesn&apos;t count years.</p>
            <ul className="list-disc space-y-1 pl-5 text-[14px] text-body">
              {result.years.map((y) => <li key={y}>{y}</li>)}
            </ul>
          </div>
        )}

        {result && result.keywords.length > 0 && (
          <div className="flex flex-col gap-4 rounded-[18px] border border-line bg-panel p-6">
            <h3 className="text-[17px] font-semibold text-ink">What this list can&apos;t tell you</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-[1.55] text-body">
              <li>Whether a missing keyword is something you&apos;ve done under another name. &quot;Managed vendor contracts&quot; can be the experience a posting calls vendor management.</li>
              <li>How to work a keyword into a bullet so it reads as real experience, not a list of buzzwords.</li>
              <li>Which gaps to leave alone. Adding a skill you don&apos;t have gets caught in the interview.</li>
            </ul>
            <p className="text-[15px] leading-[1.55] text-body">
              Cover Me is a free Chrome extension that tailors your resume to the posting you have open. It works in the
              keywords your experience backs up and removes any skill your original resume doesn&apos;t support.
            </p>
            <Button asChild className="self-start">
              <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer">Install Cover Me free</a>
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
