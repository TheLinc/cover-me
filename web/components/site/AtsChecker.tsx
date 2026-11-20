'use client'

import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { CaretDownIcon, CheckIcon, DeviceMobileIcon, PencilSimpleIcon, UploadSimpleIcon, XIcon } from '@phosphor-icons/react/dist/ssr'
import { ExtensionPopup } from '@/components/landing/ExtensionPopup'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { checkResumeText, postingTitle } from '@/lib/ats-checker/hints'
import { askAi, fromAi, MAX_CHARS, type AiReport, type Fallback } from '@/lib/ats-checker/ai'
import { botCheckToken, preloadBotCheck } from '@/lib/ats-checker/turnstile'
import { checkResume, firstAt, markFor, marks, oneEntryPerAsk, readPosting, type Keyword, type Level, type Mark } from '@/lib/ats-checker/keywords'
import { readResumeFile } from '@/lib/ats-checker/read-resume'
import { SAMPLE_AI, SAMPLE_POSTING, SAMPLE_RESUME } from '@/lib/ats-checker/sample'
import { BASE } from '@/lib/structured-data'
import { cn, storeUrl } from '@/lib/utils'

const GROUPS: { level: Level; title: string }[] = [
  { level: 'required', title: 'Must-have' },
  { level: 'preferred', title: 'Nice to have' },
  { level: 'mentioned', title: 'Also in the posting' },
]

type Found = Keyword & { found: boolean; via?: string; mark?: string }

type FromAi = { score: number; gates: string[]; title: string }

function analyse(posting: string, resume: string, keywords: Found[], pages: number | undefined, fallback?: Fallback, ai?: FromAi) {
  const postingMarks = marks(posting, keywords)
  const resumeMarks = marks(resume, keywords.filter((k) => k.found))
  const shown = oneEntryPerAsk(keywords.map((k) => ({
    ...k,
    mark: k.mark ?? (k.found ? markFor(resume, resumeMarks, k) : markFor(posting, postingMarks, k)),
  })))
  return {
    fallback,
    score: ai?.score,
    gates: ai?.gates ?? [],
    keywords: shown,
    missing: new Set(shown.filter((k) => !k.found).flatMap((k) => [k.name, ...(k.alternatives ?? [])])),
    years: ai ? [] : readPosting(posting).years,
    checks: { ...checkResumeText(resume, posting, ai?.title), pages },
    resumeMarks,
    postingMarks,
  }
}
type Result = ReturnType<typeof analyse>
type Checked = Result['keywords'][number]

const byWords = (posting: string, resume: string, pages: number | undefined, fallback: Fallback) =>
  analyse(posting, resume, checkResume(readPosting(posting).keywords, resume), pages, fallback)
function byAi(posting: string, resume: string, report: AiReport, pages: number | undefined) {
  const { keywords, gates } = fromAi(posting, report)
  return analyse(posting, resume, keywords, pages, undefined, { score: report.score, gates, title: report.title })
}

type Selected = { name: string; target: string; at: number }
type Check = { posting: string; resume: string; result: Result | null }

let morphing: ViewTransition | null = null

function morph(update: () => void, then?: () => void) {
  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    if (then) requestAnimationFrame(then)
    return
  }
  const root = document.documentElement
  root.classList.add('ats-morph')
  const t = (morphing = document.startViewTransition(() => flushSync(update)))
  if (then) void t.updateCallbackDone.then(then)
  void t.finished.finally(() => {
    if (morphing === t) root.classList.remove('ats-morph')
  })
}

const SAMPLE = byAi(SAMPLE_POSTING, SAMPLE_RESUME, SAMPLE_AI, 1)
const SHARE_URL = `${BASE}/ats-checker?utm_source=share&utm_medium=phone&utm_campaign=ats-phone-send`

export function AtsChecker() {
  const [posting, setPosting] = useState('')
  const [resume, setResume] = useState('')
  const [file, setFile] = useState<{ name: string; pages?: number } | null>(null)
  const [fileNote, setFileNote] = useState<{ text: string; error?: boolean } | null>(null)
  const [folded, setFolded] = useState(false)
  const [inputTab, setInputTab] = useState('posting')
  const [resultTab, setResultTab] = useState<string>('required')
  const [view, setView] = useState('resume')
  const [selected, setSelected] = useState<Selected | null>(null)
  const [checks, setChecks] = useState(0)
  const [fromPhone, setFromPhone] = useState(false)
  const [check, setCheck] = useState<Check | null>(null)
  const pending = useRef<AbortController | null>(null)
  const botBox = useRef<HTMLDivElement>(null)
  const counted = useRef('')
  const replacing = useRef(false)
  const postingBox = useRef<HTMLTextAreaElement>(null)
  const resumeBox = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const campaign = new URLSearchParams(window.location.search).get('utm_campaign')
    setFromPhone(campaign === 'ats-phone-send' && !window.matchMedia('(pointer: coarse)').matches)
  }, [])

  const mine = check?.result ?? null
  const loading = !!check && !check.result
  const result = mine ?? SAMPLE
  const shown = mine && check ? check : { posting: SAMPLE_POSTING, resume: SAMPLE_RESUME }
  const changed = !!posting.trim() && !!resume.trim() && (!check || check.posting !== posting || check.resume !== resume)

  async function run(p: string, r: string, pages: number | undefined) {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    if (p.length > MAX_CHARS || r.length > MAX_CHARS) return setCheck({ posting: p, resume: r, result: byWords(p, r, pages, 'long') })
    setCheck({ posting: p, resume: r, result: null })
    try {
      const token = botBox.current ? await botCheckToken(botBox.current) : null
      if (controller.signal.aborted) return
      const reply = await askAi(p, r, token, controller.signal)
      const result = 'error' in reply ? byWords(p, r, pages, reply.error) : byAi(p, r, reply, pages)
      morph(() => setCheck({ posting: p, resume: r, result }))
    } catch {
      if (!controller.signal.aborted) morph(() => setCheck({ posting: p, resume: r, result: byWords(p, r, pages, 'failed') }))
    }
  }

  function fold(p: string, r: string, pages: number | undefined, count = true) {
    if (!p.trim() || !r.trim()) return
    morph(() => {
      if (count) void run(p, r, pages)
      setFolded(true)
      setResultTab('required')
    }, () => document.getElementById('results')?.focus())
    if (count && p !== counted.current) {
      counted.current = p
      setChecks((n) => n + 1)
    }
  }

  function edit(which: 'posting' | 'resume') {
    morph(() => {
      setFolded(false)
      setInputTab(which)
    }, () => (which === 'posting' ? postingBox : resumeBox).current?.focus())
  }

  function onType(which: 'posting' | 'resume', e: ChangeEvent<HTMLTextAreaElement>) {
    preloadBotCheck()
    const value = e.target.value
    const pasted = replacing.current && (e.nativeEvent as InputEvent).inputType === 'insertFromPaste'
    const fresh = pasted || (!(which === 'posting' ? posting : resume).trim() && value.length > 100)
    replacing.current = false
    if (which === 'posting') setPosting(value)
    else {
      setResume(value)
      setFile(null)
      setFileNote(null)
    }
    if (fresh) {
      if (which === 'posting') fold(value, resume, file?.pages)
      else fold(posting, value, undefined)
    }
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const box = e.currentTarget
    replacing.current = box.selectionStart === 0 && box.selectionEnd === box.value.length
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    preloadBotCheck()
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
      fold(posting, text, pages)
    } catch (err) {
      setFileNote({ text: err instanceof Error ? err.message : `Couldn't read ${picked.name}.`, error: true })
    }
  }

  function trySample() {
    setPosting(SAMPLE_POSTING)
    setResume(SAMPLE_RESUME)
    setFile({ name: 'Sample resume', pages: 1 })
    setFileNote(null)
    pending.current?.abort()
    setCheck({ posting: SAMPLE_POSTING, resume: SAMPLE_RESUME, result: SAMPLE })
    fold(SAMPLE_POSTING, SAMPLE_RESUME, 1, false)
  }

  function anotherPosting() {
    setPosting('')
    edit('posting')
  }

  function pick(k: Checked) {
    setSelected({ name: k.name, target: k.mark ?? k.name, at: Date.now() })
    setView(k.found ? 'resume' : 'posting')
    if (k.found) setResultTab('resume')
  }

  const ready = !!check && folded
  const tiers = GROUPS.map(({ level, title }) => {
    const group = result.keywords.filter((k) => k.level === level)
    return { level, title, group, total: group.length, missing: group.filter((k) => !k.found).length }
  }).filter((t) => t.total)
  const tabs: string[] = [...tiers.map((t) => t.level), 'resume']
  const fixes = resumeFixes(result)

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

      <div className="[view-transition-name:ats-inputs]">
      {ready ? (
        <div className="grid gap-2 max-sm:gap-1.5 sm:grid-cols-2">
          <FoldedInput label="Posting" value={mine?.checks.title?.posting ?? postingTitle(posting) ?? posting.trim().split('\n')[0]} onEdit={() => edit('posting')} />
          <FoldedInput label="Resume" value={file?.name ?? resume.trim().split('\n')[0].slice(0, 40)} onEdit={() => edit('resume')} />
        </div>
      ) : (
        <Tabs value={inputTab} onValueChange={setInputTab}>
          <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
            <TabsList>
              <TabsTrigger value="posting">Posting{posting.trim() && <CheckIcon size={12} weight="bold" className="ml-1" aria-hidden />}</TabsTrigger>
              <TabsTrigger value="resume">Resume{resume.trim() && <CheckIcon size={12} weight="bold" className="ml-1" aria-hidden />}</TabsTrigger>
            </TabsList>
            {!posting.trim() && !resume.trim() && (
              <Button variant="outline" size="sm" onClick={trySample} className="ml-auto lg:hidden">Try a sample</Button>
            )}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <TabsContent forceMount tabIndex={-1} value="posting" className="mt-0 flex flex-col gap-2 data-[state=inactive]:max-lg:hidden">
              <div className="flex h-9 items-center justify-between gap-3">
                <Label htmlFor="posting" className="text-[15px] font-semibold text-ink">Job posting</Label>
                {!posting.trim() && !resume.trim() && (
                  <Button variant="outline" size="sm" onClick={trySample} className="max-lg:hidden">Try a sample</Button>
                )}
              </div>
              <Textarea
                id="posting"
                ref={postingBox}
                value={posting}
                onChange={(e) => onType('posting', e)}
                onPaste={onPaste}
                placeholder="Paste the whole posting, including its requirements"
                className="h-[200px] resize-y bg-white text-[14px] leading-[1.55]"
              />
            </TabsContent>
            <TabsContent forceMount tabIndex={-1} value="resume" className="mt-0 flex flex-col gap-2 data-[state=inactive]:max-lg:hidden">
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
                onPaste={onPaste}
                placeholder="Paste your resume, or upload it as a PDF or Word file"
                className="h-[200px] resize-y bg-white text-[14px] leading-[1.55]"
              />
            </TabsContent>
          </div>
        </Tabs>
      )}
      </div>
      {fileNote && (
        <p role="status" className={cn('-mt-2 text-[13px]', fileNote.error ? 'text-gap-ink' : 'text-ink-2', ready && 'max-sm:sr-only')}>{fileNote.text}</p>
      )}

      {!ready && (
        <p className="-mt-2 text-[13px] text-ink-2">
          The check sends the posting and your resume to Anthropic&apos;s AI. We don&apos;t store them.
        </p>
      )}

      <div ref={botBox} className="empty:hidden" />

      {changed && !loading && (
        <Button onClick={() => fold(posting, resume, file?.pages)} className="-mt-1 self-start">
          {check ? 'Check again' : 'Check my resume'}
        </Button>
      )}

      {loading ? (
        <Checking />
      ) : (
      <section aria-labelledby="results" className="relative rounded-[22px] [view-transition-name:ats-results] border border-line bg-panel p-4 sm:p-5">
        {result.fallback && (
          <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-[12px] border border-line bg-white px-3.5 py-2.5 text-[13.5px] text-body">
            <span className="flex-1">
              {result.fallback === 'busy'
                ? "You've run a lot of checks, so the AI check is paused for now."
                : result.fallback === 'long'
                  ? `The posting or resume is over ${MAX_CHARS.toLocaleString('en-US')} characters, so the AI check can't run.`
                  : "The AI check couldn't run."} This is a quick word
              match instead. It can miss skills your resume names in other words.
            </span>
            {result.fallback === 'failed' && (
              <Button variant="outline" size="sm" onClick={() => check && void run(check.posting, check.resume, result.checks.pages)}>Try again</Button>
            )}
          </div>
        )}
        {!mine && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
            <Badge className="bg-ink text-[12px] text-white">Sample</Badge>
            A made-up posting and resume. Paste yours above to see your own result.
          </div>
        )}
        <div className="flex flex-col gap-4">
          <Summary result={result} sample={!mine} />
          <Tabs value={tabs.includes(resultTab) ? resultTab : tabs[0]} onValueChange={setResultTab}>
            <TabsList className="grid h-auto w-full rounded-[14px] border border-line bg-white/50 p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
              {tiers.map(({ level, title, missing, total }) => (
                <TabsTrigger key={level} value={level} className={TIER_TAB}>
                  <span>{title}</span>
                  <span className={cn('text-[12px] font-normal', missing ? 'text-gap-ink' : 'text-ink-2')}>{missing ? `${missing} missing` : `all ${total} found`}</span>
                </TabsTrigger>
              ))}
              <TabsTrigger value="resume" className={TIER_TAB}>
                <span>Your resume</span>
                <span className="text-[12px] font-normal text-ink-2">{fixes.cards.length ? `${fixes.cards.length} to fix` : 'looks fine'}</span>
              </TabsTrigger>
            </TabsList>
            {tiers.map(({ level, group }) => (
              <TabsContent key={level} value={level} className="mt-3 rounded-[16px] border border-line bg-white p-4">
                <Tier group={group} selected={selected?.name} onPick={pick} />
              </TabsContent>
            ))}
            <TabsContent value="resume" className="mt-3 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <ResumeChecks result={result} fixes={fixes} />
              <Viewer view={view} onView={setView} resume={shown.resume} posting={shown.posting} result={result} selected={selected} />
            </TabsContent>
          </Tabs>
          <Pitch result={result} checks={checks} />
          {mine && (
            <Button variant="outline" size="sm" onClick={anotherPosting} className="self-start">Check another posting</Button>
          )}
        </div>
      </section>
      )}
    </div>
  )
}

// Timed to the check's usual 15-20 s; the model reports no progress of its own (#278).
const STEPS: [number, string][] = [
  [0, 'Reading the job posting...'],
  [2500, 'Reading your resume...'],
  [6000, 'Comparing your resume with the posting...'],
  [11000, 'Scoring what it found...'],
  [19000, 'Almost done...'],
]

function Checking() {
  const [step, setStep] = useState(STEPS[0][1])
  useEffect(() => {
    const timers = STEPS.slice(1).map(([at, text]) => setTimeout(() => setStep(text), at))
    return () => timers.forEach(clearTimeout)
  }, [])
  return (
    <section className="flex min-h-[240px] [view-transition-name:ats-results] flex-col items-center justify-center gap-3 rounded-[22px] border border-line bg-panel p-6 text-center">
      <span className="size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden />
      <p className="text-[15px] font-semibold text-ink">Checking your resume against the posting</p>
      <p aria-live="polite" className="text-[13.5px] text-ink-2">{step}</p>
    </section>
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

const TIER_TAB = 'flex-col gap-0.5 rounded-[10px] py-2 whitespace-normal text-ink-2 data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-[0_1px_4px_rgba(30,27,75,0.14)]'

// Must match the tier weights in scoreFromMatch, backend/supabase/functions/_shared/ats-score.ts (#278).
const TIER_POINTS = [
  { level: 'required', title: 'Must-haves', points: 70 },
  { level: 'preferred', title: 'Nice to have', points: 30 },
] as const

function Summary({ result, sample }: { result: Result; sample: boolean }) {
  const { must, pool, found } = headline(result.keywords)
  const scored = result.score !== undefined && pool.length > 0
  const bars = TIER_POINTS.map(({ level, title, points }) => {
    const group = result.keywords.filter((k) => k.level === level)
    return { level, title, points, total: group.length, found: group.filter((k) => k.found).length }
  }).filter((b) => b.total)
  return (
    <div className="flex flex-col gap-2.5 rounded-[16px] border border-line bg-white p-4 shadow-[0_10px_30px_-18px_rgba(30,27,75,0.35)]">
      <h2 id="results" tabIndex={-1} aria-live="polite" className="text-[clamp(18px,2.2vw,26px)] leading-[1.15] text-ink outline-none">
        {!pool.length
          ? 'No keywords found in this posting. Paste all of it, including the requirements.'
          : scored
            ? `ATS match: ${result.score} out of 100`
            : must
              ? `Must-haves on your resume: ${found} of ${pool.length}`
              : `Skills the posting names on your resume: ${found} of ${pool.length}`}
      </h2>
      {bars.length ? (
        <div className="flex gap-x-5 gap-y-3 max-sm:flex-col">
          {bars.map(({ level, title, points, found: f, total }) => (
            <div key={level} style={{ flexGrow: scored ? points : total }} className="flex min-w-0 basis-0 flex-col gap-1.5">
              <p className="text-[12.5px] text-ink-2">
                {title}{scored && ` · ${points} points`}
                <span className="sr-only">: {f} of {total} on your resume</span>
              </p>
              <Segments found={f} total={total} />
            </div>
          ))}
        </div>
      ) : (
        pool.length > 0 && <Segments found={found} total={pool.length} />
      )}
      {result.gates.length > 0 && (
        <div className="text-[13px] text-ink-2">
          <p>Requirements your resume doesn&apos;t meet:</p>
          <ul className="mt-1 list-disc pl-5 text-gap-ink">
            {result.gates.map((g) => <li key={g}>{g}</li>)}
          </ul>
        </div>
      )}
      {!sample && (
        <Button size="sm" className="self-start [@media(pointer:fine)]:hidden" onClick={sendToComputer}>
          <DeviceMobileIcon size={16} aria-hidden /> Send this to my computer
        </Button>
      )}
    </div>
  )
}

function Segments({ found, total }: { found: number; total: number }) {
  if (total > 20) {
    return <Progress value={(found / total) * 100} aria-hidden className="h-2.5 border border-dashed border-gap bg-white [&>div]:bg-brand" />
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

function Tier({ group, selected, onPick }: { group: Checked[]; selected?: string; onPick: (k: Checked) => void }) {
  const missing = group.filter((k) => !k.found)
  const found = group.filter((k) => k.found)
  return (
    <div className="flex flex-col gap-3">
      {missing.length ? (
        <>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-2">Missing</h3>
          <ChipList keywords={missing} selected={selected} onPick={onPick} />
          <p className="text-[13px] text-ink-2">Pick one to see where the posting asks for it.</p>
        </>
      ) : (
        <h3 className="text-[15px] font-semibold text-ink">All {found.length} are on your resume.</h3>
      )}
      {found.length > 0 && (
        <details open={!missing.length} className="accordion group rounded-[12px] border border-line px-3.5 py-2.5">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[6px] text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <CheckIcon size={13} weight="bold" className="shrink-0 text-brand" aria-hidden />
            <span className="shrink-0 font-semibold text-ink">You have {found.length}</span>
            <span className="min-w-0 flex-1 truncate text-ink-2 group-open:invisible">{found.map((k) => k.name).join(', ')}</span>
            <CaretDownIcon size={14} weight="bold" aria-hidden className="shrink-0 text-ink-2 transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-2 pt-2.5">
            <ChipList keywords={found} selected={selected} onPick={onPick} />
            <p className="text-[13px] text-ink-2">Pick one to see it on your resume.</p>
          </div>
        </details>
      )}
    </div>
  )
}

function ChipList({ keywords, selected, onPick }: { keywords: Checked[]; selected?: string; onPick: (k: Checked) => void }) {
  const [all, setAll] = useState(keywords.length <= SHOWN)
  return (
    <ul className="flex flex-wrap gap-1.5">
      {(all ? keywords : keywords.slice(0, SHOWN)).map((k) => (
        <li key={k.name}>{k.found ? <FoundChip k={k} on={selected === k.name} onPick={onPick} /> : <MissingChip k={k} on={selected === k.name} onPick={onPick} />}</li>
      ))}
      {!all && (
        <li>
          <button type="button" onClick={() => setAll(true)} className={cn(chipClass, 'border border-line bg-white text-ink-2 hover:text-ink')}>
            Show all {keywords.length}
          </button>
        </li>
      )}
    </ul>
  )
}

const chipClass = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13.5px] transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function FoundChip({ k, on, onPick }: { k: Checked; on: boolean; onPick: (k: Checked) => void }) {
  return (
    <button type="button" onClick={() => onPick(k)} className={cn(chipClass, 'border border-brand/60 bg-white text-brand-ink hover:border-brand hover:bg-brand-tint', on && 'ring-2 ring-brand')}>
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
          {asked(k)}
          <span className="sr-only">, not on your resume. Open tips.</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-[300px] flex-col gap-2.5 text-[13.5px] leading-[1.5] text-body">
        {k.line && <q className="text-ink-2 italic">{quoteAround(k)}</q>}
        <p>
          <span className="font-semibold text-ink">Not on your resume: {asked(k)}.</span> If you&apos;ve used it, name it in the bullet where you
          used it. If you haven&apos;t, leave it out.
        </p>
        <a href={storeUrl('ats-gap')} target="_blank" rel="noreferrer" className="font-medium text-brand-strong underline underline-offset-2 [@media(pointer:coarse)]:hidden">
          Done it under another name? Cover Me&apos;s AI reads your bullets for it.
        </a>
        <button type="button" onClick={sendToComputer} className="text-left font-medium text-brand-strong underline underline-offset-2 [@media(pointer:fine)]:hidden">
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
        <Button asChild className="mt-1 self-start [@media(pointer:coarse)]:hidden">
          <a href={storeUrl(repeat ? 'ats-repeat' : 'ats-result')} target="_blank" rel="noreferrer">Tailor this resume in Chrome, free</a>
        </Button>
        <Button size="sm" onClick={sendToComputer} className="mt-1 self-start [@media(pointer:fine)]:hidden">
          <DeviceMobileIcon size={16} aria-hidden /> Send this to my computer
        </Button>
        <p className="text-[12.5px] text-ext-muted">
          <span className="[@media(pointer:coarse)]:hidden">About 30 seconds for a tailored resume and letter. Free plan, no card.</span>
          <span className="[@media(pointer:fine)]:hidden">Cover Me runs in Chrome on a computer. Send yourself the link and tailor this resume there.</span>
        </p>
      </div>
    </ExtensionPopup>
  )
}

function sendToComputer() {
  if (navigator.share) {
    navigator.share({ title: 'Cover Me ATS checker', text: 'Tailor my resume on my computer', url: SHARE_URL }).catch((err: Error) => {
      if (err.name !== 'AbortError') mailLink()
    })
  } else mailLink()
}

function mailLink() {
  window.location.href = `mailto:?subject=${encodeURIComponent('Tailor my resume with Cover Me')}&body=${encodeURIComponent(SHARE_URL)}`
}

function asked(k: Checked) {
  return [k.name, ...(k.alternatives ?? [])].join(' or ')
}

function quoteAround(k: Checked) {
  const line = k.line ?? ''
  if (line.length <= 140) return line
  const at = firstAt(line, k) ?? 0
  const start = Math.max(0, Math.min(at - 50, line.length - 137))
  return `${start ? '...' : ''}${line.slice(start, start + 137).trim()}${start + 137 < line.length ? '...' : ''}`
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
  selected: Selected | null
}) {
  const box = useRef<HTMLDivElement>(null)
  const missing = result.missing

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const scroller = box.current
      const target = selected && scroller?.querySelector<HTMLElement>(`[data-kw="${CSS.escape(selected.target)}"]`)
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
          <Marked text={resume} marks={result.resumeMarks} missing={missing} selected={selected?.target} />
        </TabsContent>
        <TabsContent value="posting" className="mt-0 whitespace-pre-wrap">
          <Marked text={posting} marks={result.postingMarks} missing={missing} selected={selected?.target} />
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

function resumeFixes(result: Result) {
  const { bullets, title, email, phone, pages } = result.checks
  const cards: { title: string; body: ReactNode }[] = []
  const fine: string[] = []

  if (bullets.total && bullets.withoutNumber.length) {
    cards.push({
      title: `${bullets.withoutNumber.length} of ${bullets.total} ${bullets.total === 1 ? 'bullet has' : bullets.withoutNumber.length === 1 ? 'bullets has' : 'bullets have'} no number`,
      body: (
        <>
          {bullets.withoutNumber.slice(0, 2).map((b, i) => (
            <q key={i} className="block text-ink-2 italic">{b.length > 120 ? `${b.slice(0, 117)}...` : b}</q>
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
  } else if (title) fine.push(`the title ${title.core}`)

  const missingContact = [!email && 'email address', !phone && 'phone number'].filter(Boolean)
  if (missingContact.length) {
    cards.push({ title: `No ${missingContact.join(' or ')} found`, body: 'Put your contact details as plain text at the top, not in a header or an image.' })
  } else fine.push('email and phone')

  if (pages && pages >= 3) {
    cards.push({ title: `${pages} pages`, body: 'Recruiters skim, so put the experience that matches this posting on page one.' })
  } else if (pages) fine.push(`${pages} page${pages > 1 ? 's' : ''}`)

  return { cards: cards.slice(0, 3), fine }
}

function ResumeChecks({ result, fixes: { cards, fine } }: { result: Result; fixes: ReturnType<typeof resumeFixes> }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[16px] border border-line bg-white p-4">
      <h3 className="text-[14px] font-semibold text-ink">Resume checks</h3>
      {cards.map((c) => (
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
