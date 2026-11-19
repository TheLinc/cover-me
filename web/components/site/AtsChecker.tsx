'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { CheckIcon, DeviceMobileIcon, PencilSimpleIcon, UploadSimpleIcon, XIcon } from '@phosphor-icons/react/dist/ssr'
import { ExtensionPopup } from '@/components/landing/ExtensionPopup'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { checkResumeText, postingTitle } from '@/lib/ats-checker/hints'
import { checkResume, marks, readPosting, type Level, type Mark, type Posting } from '@/lib/ats-checker/keywords'
import { readResumeFile } from '@/lib/ats-checker/read-resume'
import { SAMPLE_POSTING, SAMPLE_RESUME } from '@/lib/ats-checker/sample'
import { cn, storeUrl } from '@/lib/utils'

const GROUPS: { level: Level; title: string }[] = [
  { level: 'required', title: 'Must-have' },
  { level: 'preferred', title: 'Nice to have' },
  { level: 'mentioned', title: 'Also in the posting' },
]

function analyse(posting: string, read: Posting, resume: string, pages?: number) {
  const keywords = checkResume(read.keywords, resume)
  return {
    keywords,
    years: read.years,
    checks: { ...checkResumeText(resume, posting), pages },
    resumeMarks: marks(resume, keywords.filter((k) => k.found)),
    postingMarks: marks(posting, keywords),
  }
}
type Result = ReturnType<typeof analyse>
type Checked = Result['keywords'][number]

const SAMPLE = analyse(SAMPLE_POSTING, readPosting(SAMPLE_POSTING), SAMPLE_RESUME, 1)
const SHARE_URL = 'https://www.cover-me.dev/ats-checker?utm_source=share&utm_medium=phone&utm_campaign=ats-phone-send'

export function AtsChecker() {
  const [posting, setPosting] = useState('')
  const [resume, setResume] = useState('')
  const [file, setFile] = useState<{ name: string; pages?: number } | null>(null)
  const [fileNote, setFileNote] = useState<{ text: string; error?: boolean } | null>(null)
  const [folded, setFolded] = useState(false)
  const [inputTab, setInputTab] = useState('posting')
  const [resultTab, setResultTab] = useState('keywords')
  const [view, setView] = useState('resume')
  const [selected, setSelected] = useState<{ name: string; at: number } | null>(null)
  const [checks, setChecks] = useState(0)
  const [fromPhone, setFromPhone] = useState(false)
  const counted = useRef('')
  const postingBox = useRef<HTMLTextAreaElement>(null)
  const resumeBox = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const campaign = new URLSearchParams(window.location.search).get('utm_campaign')
    setFromPhone(campaign === 'ats-phone-send' && window.matchMedia('(min-width: 1024px)').matches)
  }, [])

  const deferredPosting = useDeferredValue(posting)
  const deferredResume = useDeferredValue(resume)
  const read = useMemo(() => (deferredPosting.trim() ? readPosting(deferredPosting) : null), [deferredPosting])
  const mine = useMemo(
    () => (read && deferredResume.trim() ? analyse(deferredPosting, read, deferredResume, file?.pages) : null),
    [read, deferredPosting, deferredResume, file?.pages],
  )
  const result = mine ?? SAMPLE
  const shown = mine ? { posting: deferredPosting, resume: deferredResume } : { posting: SAMPLE_POSTING, resume: SAMPLE_RESUME }

  function fold(p: string, r: string) {
    if (!p.trim() || !r.trim()) return
    setFolded(true)
    if (p !== counted.current) {
      counted.current = p
      setChecks((n) => n + 1)
    }
  }

  function edit(which: 'posting' | 'resume') {
    setFolded(false)
    setInputTab(which)
    requestAnimationFrame(() => (which === 'posting' ? postingBox : resumeBox).current?.focus())
  }

  function onType(which: 'posting' | 'resume', e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    if (which === 'posting') setPosting(value)
    else {
      setResume(value)
      setFile(null)
      setFileNote(null)
    }
    if ((e.nativeEvent as InputEvent).inputType === 'insertFromPaste') {
      if (which === 'posting') fold(value, resume)
      else fold(posting, value)
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    setFileNote({ text: `Reading ${picked.name}...` })
    try {
      const { text, pages } = await readResumeFile(picked)
      if (!text) throw new Error(`No text found in ${picked.name}. If it's a scanned image, paste the text instead.`)
      setResume(text)
      setFile({ name: picked.name, pages })
      setFileNote({ text: `Read ${picked.name}. Check its text under Your resume.` })
      fold(posting, text)
    } catch (err) {
      setFileNote({ text: err instanceof Error ? err.message : `Couldn't read ${picked.name}.`, error: true })
    }
  }

  function trySample() {
    setPosting(SAMPLE_POSTING)
    setResume(SAMPLE_RESUME)
    setFile({ name: 'Sample resume', pages: 1 })
    setFileNote(null)
    fold(SAMPLE_POSTING, SAMPLE_RESUME)
  }

  function anotherPosting() {
    setPosting('')
    edit('posting')
  }

  function pick(k: Checked) {
    setSelected({ name: k.via ?? k.name, at: Date.now() })
    setView(k.found ? 'resume' : 'posting')
    if (k.found) setResultTab('resume')
  }

  const ready = !!mine && folded

  return (
    <div className="flex flex-col gap-5">
      {fromPhone && (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-white px-4 py-3 text-[14px] text-body">
          <DeviceMobileIcon size={18} aria-hidden className="text-brand" />
          <span className="flex-1">Sent from your phone? Install Cover Me, then paste the posting again or open it on LinkedIn or Indeed.</span>
          <Button asChild size="sm">
            <a href={storeUrl('ats-phone-return')} target="_blank" rel="noreferrer">Install Cover Me free</a>
          </Button>
        </div>
      )}

      {ready ? (
        <div className="grid gap-2 max-sm:gap-1.5 sm:grid-cols-2">
          <FoldedInput label="Posting" value={postingTitle(posting) ?? `${posting.trim().slice(0, 40)}...`} onEdit={() => edit('posting')} />
          <FoldedInput label="Resume" value={file?.name ?? resume.trim().split('\n')[0].slice(0, 40)} onEdit={() => edit('resume')} />
        </div>
      ) : (
        <Tabs value={inputTab} onValueChange={setInputTab}>
          <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
            <TabsList>
              <TabsTrigger value="posting">Posting{posting.trim() && <CheckIcon size={12} weight="bold" className="ml-1" aria-hidden />}</TabsTrigger>
              <TabsTrigger value="resume">Resume{resume.trim() && <CheckIcon size={12} weight="bold" className="ml-1" aria-hidden />}</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={trySample} className="ml-auto lg:hidden">Try a sample</Button>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <TabsContent forceMount value="posting" className="mt-0 flex flex-col gap-2 data-[state=inactive]:max-lg:hidden">
              <div className="flex h-9 items-center justify-between gap-3">
                <Label htmlFor="posting" className="text-[15px] font-semibold text-ink">Job posting</Label>
                <Button variant="outline" size="sm" onClick={trySample} className="max-lg:hidden">Try a sample</Button>
              </div>
              <Textarea
                id="posting"
                ref={postingBox}
                value={posting}
                onChange={(e) => onType('posting', e)}
                placeholder="Paste the whole posting, including its requirements"
                className="h-[200px] resize-y bg-white text-[14px] leading-[1.55]"
              />
            </TabsContent>
            <TabsContent forceMount value="resume" className="mt-0 flex flex-col gap-2 data-[state=inactive]:max-lg:hidden">
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
                ref={resumeBox}
                value={resume}
                onChange={(e) => onType('resume', e)}
                placeholder="Paste your resume, or upload it as a PDF or Word file"
                className="h-[200px] resize-y bg-white text-[14px] leading-[1.55]"
              />
            </TabsContent>
          </div>
        </Tabs>
      )}
      {fileNote && (
        <p role="status" className={cn('-mt-2 text-[13px]', fileNote.error ? 'text-gap-ink' : 'text-ink-2', ready && 'max-sm:sr-only')}>{fileNote.text}</p>
      )}

      <section aria-labelledby="results" className="relative rounded-[22px] border border-line bg-panel p-4 sm:p-5">
        {!mine && (
          <p className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-semibold text-white">Sample</span>
            A made-up posting and resume. Paste yours above to see your own result.
          </p>
        )}
        <Tabs value={resultTab} onValueChange={setResultTab}>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="flex flex-col gap-4 max-lg:contents">
              <Summary result={result} sample={!mine} />
              <TabsList className="w-full lg:hidden">
                <TabsTrigger value="keywords" className="flex-1">Keywords</TabsTrigger>
                <TabsTrigger value="resume" className="flex-1">Your resume</TabsTrigger>
              </TabsList>
              <TabsContent forceMount value="keywords" className="mt-0 flex flex-col gap-4 data-[state=inactive]:max-lg:hidden">
                <Chips keywords={result.keywords} selected={selected?.name} onPick={pick} pitch={<Pitch result={result} checks={checks} />} />
                {mine && (
                  <Button variant="outline" size="sm" onClick={anotherPosting} className="self-start">Check another posting</Button>
                )}
              </TabsContent>
            </div>
            <TabsContent forceMount value="resume" className="mt-0 flex flex-col gap-4 data-[state=inactive]:max-lg:hidden">
              <Viewer
                view={view}
                onView={setView}
                resume={shown.resume}
                posting={shown.posting}
                result={result}
                selected={selected}
              />
              <ResumeChecks result={result} />
            </TabsContent>
          </div>
        </Tabs>
      </section>
    </div>
  )
}

function FoldedInput({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] border border-line bg-white px-3.5 py-2.5 text-[14px] max-sm:py-1 max-sm:text-[13px]">
      <span className="font-semibold text-ink">{label}:</span>
      <span className="min-w-0 flex-1 truncate text-ink-2">{value}</span>
      <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit the ${label.toLowerCase()}`}>
        <PencilSimpleIcon size={14} aria-hidden /> Edit
      </Button>
    </div>
  )
}

function headline(keywords: Checked[]) {
  const must = keywords.filter((k) => k.level === 'required')
  const pool = must.length ? must : keywords
  const found = pool.filter((k) => k.found).length
  return { must: must.length > 0, pool, found, missing: pool.length - found }
}

function Summary({ result, sample }: { result: Result; sample: boolean }) {
  const { must, pool, found } = headline(result.keywords)
  const nice = result.keywords.filter((k) => k.level === 'preferred')
  return (
    <div className="sticky top-[72px] z-10 flex flex-col gap-2.5 rounded-[16px] border border-line bg-white p-4 shadow-[0_10px_30px_-18px_rgba(30,27,75,0.35)]">
      <h2 id="results" aria-live="polite" className="text-[clamp(20px,2.2vw,26px)] leading-[1.15] text-ink">
        {!pool.length
          ? 'No keywords found in this posting. Paste all of it, including the requirements.'
          : must
            ? `Must-haves on your resume: ${found} of ${pool.length}`
            : `Skills the posting names on your resume: ${found} of ${pool.length}`}
      </h2>
      {pool.length > 0 && <Segments found={found} total={pool.length} />}
      {nice.length > 0 && (
        <p className="text-[13px] text-ink-2">Nice to have: {nice.filter((k) => k.found).length} of {nice.length}</p>
      )}
      {!sample && (
        <Button size="sm" className="self-start lg:hidden" onClick={sendToComputer}>
          <DeviceMobileIcon size={16} aria-hidden /> Send this to my computer
        </Button>
      )}
    </div>
  )
}

function Segments({ found, total }: { found: number; total: number }) {
  if (total > 20) {
    return (
      <div className="h-2.5 overflow-hidden rounded-full border border-dashed border-gap bg-white" aria-hidden>
        <div className="h-full bg-brand" style={{ width: `${(found / total) * 100}%` }} />
      </div>
    )
  }
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn('h-2.5 flex-1 rounded-[3px]', i < found ? 'bg-brand' : 'border-[1.5px] border-dashed border-gap bg-white')} />
      ))}
    </div>
  )
}

const SHOWN = 15

function Chips({ keywords, selected, onPick, pitch }: { keywords: Checked[]; selected?: string; onPick: (k: Checked) => void; pitch: ReactNode }) {
  const [open, setOpen] = useState<Level[]>([])
  const levels = GROUPS.filter(({ level }) => keywords.some((k) => k.level === level))
  return (
    <div className="flex flex-col gap-3.5">
      {levels.map(({ level, title }, i) => {
        const group = keywords.filter((k) => k.level === level)
        const all = open.includes(level) || group.length <= SHOWN
        return (
          <div key={level} className="contents">
            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-semibold text-ink">
                {title} <span className="font-normal text-ink-2">({group.filter((k) => k.found).length} of {group.length})</span>
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {(all ? group : group.slice(0, SHOWN)).map((k) => (
                  <li key={k.name}>{k.found ? <FoundChip k={k} on={selected === k.name} onPick={onPick} /> : <MissingChip k={k} on={selected === k.name} onPick={onPick} />}</li>
                ))}
                {!all && (
                  <li>
                    <button type="button" onClick={() => setOpen([...open, level])} className={cn(chipClass, 'border border-line bg-white text-ink-2 hover:text-ink')}>
                      Show all {group.length}
                    </button>
                  </li>
                )}
              </ul>
            </div>
            {i === 0 && pitch}
          </div>
        )
      })}
      {!levels.length && pitch}
    </div>
  )
}

const chipClass = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13.5px] transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function FoundChip({ k, on, onPick }: { k: Checked; on: boolean; onPick: (k: Checked) => void }) {
  return (
    <button type="button" onClick={() => onPick(k)} className={cn(chipClass, 'bg-brand-tint text-brand-ink hover:ring-1 hover:ring-brand', on && 'ring-2 ring-brand')}>
      <CheckIcon size={13} weight="bold" aria-hidden />
      {k.name}
      {k.via && <span className="text-[12.5px] opacity-75">or {k.via}</span>}
      <span className="sr-only">{k.via ? ', the resume has the other option. Show it.' : ', on your resume. Show where.'}</span>
    </button>
  )
}

function MissingChip({ k, on, onPick }: { k: Checked; on: boolean; onPick: (k: Checked) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={() => onPick(k)}
          className={cn(chipClass, 'border border-dashed border-gap bg-gap-tint text-gap-ink hover:border-solid', on && 'ring-2 ring-gap')}
        >
          <XIcon size={13} weight="bold" aria-hidden />
          {k.name}
          <span className="sr-only">, not on your resume. Open tips.</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-[300px] flex-col gap-2.5 text-[13.5px] leading-[1.5] text-body">
        {k.line && <q className="text-ink-2 italic">{k.line.length > 140 ? `${k.line.slice(0, 137)}...` : k.line}</q>}
        <p>
          <span className="font-semibold text-ink">Not on your resume: {k.name}.</span> If you&apos;ve used it, name it in the bullet where you
          used it. If you haven&apos;t, leave it out.
        </p>
        <a href={storeUrl('ats-gap')} target="_blank" rel="noreferrer" className="font-medium text-brand-strong underline underline-offset-2 max-lg:hidden">
          Done it under another name? Cover Me&apos;s AI reads your bullets for it.
        </a>
        <button type="button" onClick={sendToComputer} className="text-left font-medium text-brand-strong underline underline-offset-2 lg:hidden">
          Done it under another name? Cover Me&apos;s AI reads your bullets for it. Send this to your computer.
        </button>
      </PopoverContent>
    </Popover>
  )
}

function Pitch({ result, checks }: { result: Result; checks: number }) {
  const { must, missing } = headline(result.keywords)
  const repeat = checks >= 3
  const [one, many] = must ? ['must-have', 'must-haves'] : ['skill the posting names', 'skills the posting names']
  return (
    <ExtensionPopup status="Chrome extension" className="shadow-none">
      <div className="flex flex-col gap-2 px-4 py-3.5 text-[14px] leading-[1.5]">
        <p className="text-[16px] font-semibold text-white">
          {missing === 0 ? `Every ${one} is on your resume.` : `${missing} ${missing === 1 ? `${one} isn't` : `${many} aren't`} on your resume.`}
        </p>
        <p className="text-ext-text-2">
          {repeat
            ? 'Cover Me reads the posting on LinkedIn, Indeed, Greenhouse, Lever and Workday when you click, so you skip the copy and paste.'
            : missing
              ? "Cover Me checks each one against your bullets, works in the ones you've done and leaves the rest out."
              : 'Cover Me rewrites your bullets around this posting and writes a matching cover letter.'}
        </p>
        <a
          href={storeUrl(repeat ? 'ats-repeat' : 'ats-result')}
          target="_blank"
          rel="noreferrer"
          className="mt-1 self-start rounded-full bg-brand px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-brand-strong max-lg:hidden"
        >
          Tailor this resume in Chrome, free
        </a>
        <Button size="sm" onClick={sendToComputer} className="mt-1 self-start lg:hidden">
          <DeviceMobileIcon size={16} aria-hidden /> Send this to my computer
        </Button>
        <p className="text-[12.5px] text-ext-muted">
          <span className="max-lg:hidden">About 30 seconds for a tailored resume and letter. Free plan, no card.</span>
          <span className="lg:hidden">Cover Me runs in Chrome on a computer. Send yourself the link and tailor this resume there.</span>
        </p>
      </div>
    </ExtensionPopup>
  )
}

function sendToComputer() {
  if (navigator.share) {
    navigator.share({ title: 'Cover Me ATS checker', text: 'Tailor my resume on my computer', url: SHARE_URL }).catch(() => {})
  } else {
    window.location.href = `mailto:?subject=${encodeURIComponent('Tailor my resume with Cover Me')}&body=${encodeURIComponent(SHARE_URL)}`
  }
}

function Viewer({
  view,
  onView,
  resume,
  posting,
  result,
  selected,
}: {
  view: string
  onView: (v: string) => void
  resume: string
  posting: string
  result: Result
  selected: { name: string; at: number } | null
}) {
  const box = useRef<HTMLDivElement>(null)
  const missing = useMemo(() => new Set(result.keywords.filter((k) => !k.found).map((k) => k.name)), [result])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const scroller = box.current
      const target = selected && scroller?.querySelector<HTMLElement>(`[data-kw="${CSS.escape(selected.name)}"]`)
      if (!scroller || !target) return
      scroller.scrollTo({ top: target.offsetTop - scroller.clientHeight / 3, behavior: 'smooth' })
      const { top, bottom } = scroller.getBoundingClientRect()
      if (top < 0 || bottom > window.innerHeight) scroller.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [selected, view])

  return (
    <Tabs value={view} onValueChange={onView} className="flex flex-col gap-2 rounded-[16px] border border-line bg-white p-3">
      <TabsList className="self-start">
        <TabsTrigger value="resume">Resume</TabsTrigger>
        <TabsTrigger value="posting">Posting</TabsTrigger>
      </TabsList>
      <div ref={box} className="relative max-h-[440px] overflow-y-auto px-1.5 text-[13.5px] leading-[1.7] text-body">
        <TabsContent value="resume" className="mt-0 whitespace-pre-wrap">
          <Marked text={resume} marks={result.resumeMarks} missing={missing} selected={selected?.name} />
        </TabsContent>
        <TabsContent value="posting" className="mt-0 whitespace-pre-wrap">
          <Marked text={posting} marks={result.postingMarks} missing={missing} selected={selected?.name} />
        </TabsContent>
      </div>
    </Tabs>
  )
}

function Marked({ text, marks: list, missing, selected }: { text: string; marks: Mark[]; missing: Set<string>; selected?: string }) {
  const parts: ReactNode[] = []
  let at = 0
  for (const m of list) {
    if (m.start > at) parts.push(text.slice(at, m.start))
    parts.push(
      <mark
        key={m.start}
        data-kw={m.name}
        className={cn(
          'rounded-[4px] px-px text-inherit',
          missing.has(m.name) ? 'border border-dashed border-gap bg-gap-tint text-gap-ink' : 'bg-brand-tint text-brand-ink',
          selected === m.name && 'ring-2 ring-offset-1',
          selected === m.name && (missing.has(m.name) ? 'ring-gap' : 'ring-brand'),
        )}
      >
        {text.slice(m.start, m.end)}
      </mark>,
    )
    at = m.end
  }
  parts.push(text.slice(at))
  return <>{parts}</>
}

function ResumeChecks({ result }: { result: Result }) {
  const { bullets, title, email, phone, pages } = result.checks
  const cards: { title: string; body: ReactNode }[] = []
  const fine: string[] = []

  if (bullets.total && bullets.withoutNumber.length) {
    cards.push({
      title: `${bullets.withoutNumber.length} of ${bullets.total} ${bullets.total === 1 ? 'bullet has' : bullets.withoutNumber.length === 1 ? 'bullets has' : 'bullets have'} no number`,
      body: (
        <>
          {bullets.withoutNumber.slice(0, 2).map((b) => (
            <q key={b} className="block text-ink-2 italic">{b.length > 120 ? `${b.slice(0, 117)}...` : b}</q>
          ))}
          <span>How many people, projects, hours or dollars? Add one where it&apos;s true.</span>
        </>
      ),
    })
  } else if (bullets.total) fine.push(bullets.total === 1 ? 'your bullet has a number' : `all ${bullets.total} bullets have a number`)

  if (title && !title.onResume) {
    cards.push({
      title: `The posting's title, ${title.posting}, isn't on your resume`,
      body: "If it's the job you're after and your work shows that level, use it in your summary. Keep your past job titles as they were.",
    })
  } else if (title) fine.push(`title ${title.posting}`)

  const missingContact = [!email && 'email address', !phone && 'phone number'].filter(Boolean)
  if (missingContact.length) {
    cards.push({ title: `No ${missingContact.join(' or ')} found`, body: 'Put your contact details as plain text at the top, not in a header or an image.' })
  } else fine.push('email and phone')

  if (pages && pages >= 3) {
    cards.push({ title: `${pages} pages`, body: 'Recruiters skim, so put the experience that matches this posting on page one.' })
  } else if (pages) fine.push(`${pages} page${pages > 1 ? 's' : ''}`)

  return (
    <div className="flex flex-col gap-2.5 rounded-[16px] border border-line bg-white p-4">
      <h3 className="text-[14px] font-semibold text-ink">Your resume</h3>
      {cards.slice(0, 3).map((c) => (
        <div key={c.title} className="flex flex-col gap-1.5 rounded-[12px] bg-gap-tint/60 p-3 text-[13.5px] leading-[1.5] text-body">
          <p className="font-semibold text-ink">{c.title}</p>
          {c.body}
        </div>
      ))}
      {fine.length > 0 && (
        <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
          <CheckIcon size={13} weight="bold" className="text-brand" aria-hidden />
          Looks fine: {fine.join(', ')}.
        </p>
      )}
      {result.years.length > 0 && (
        <div className="text-[13px] text-ink-2">
          <p>The posting asks for these. Compare them with the dates on your resume:</p>
          <ul className="mt-1 list-disc pl-5 text-body">
            {result.years.map((y) => <li key={y}>{y}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
