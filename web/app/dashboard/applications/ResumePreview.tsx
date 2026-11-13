import type { ReactNode } from 'react'
import { contactParts } from '@/lib/pdf/contact'
import { SKILL_GROUP } from '@/lib/pdf/layout-rules'
import type { TailoredResume } from '@/lib/pdf/types'

// The tailored resume as the PDF prints it (lib/pdf/resume.ts): Times, centred
// name and contact line, ruled section titles in the same order. Fields can be
// missing from older resumes, as the PDF allows.
export function ResumePreview({ resume }: { resume: TailoredResume }) {
  const contact = contactParts(resume).join(' | ')
  return (
    <div className="rounded-[4px] bg-white px-7 pb-8 pt-6 font-['Times_New_Roman',Times,serif] text-[13px] leading-[1.4] text-body shadow-[0_1px_2px_rgba(42,42,42,0.1),0_18px_40px_-22px_rgba(42,42,42,0.35)] max-sm:px-4">
      <p className="break-words text-center text-[20px] font-bold leading-tight">{resume.name || 'Resume'}</p>
      {resume.headline?.trim() && <p className="break-words text-center text-[13px]">{resume.headline.trim()}</p>}
      {contact && <p className="mt-0.5 break-words text-center text-[11.5px]">{contact}</p>}
      {resume.summary && <Section title="Summary"><p>{resume.summary}</p></Section>}
      {!!resume.experience?.length && (
        <Section title="Experience">
          {resume.experience.map((e, i) => (
            <Entry key={i} left={e.title} right={e.dates} sub={e.company} subRight={e.location} bullets={e.bullets} />
          ))}
        </Section>
      )}
      {!!resume.projects?.length && (
        <Section title="Projects">
          {resume.projects.map((p, i) => <Entry key={i} left={p.name} leftSub={p.tech} right={p.link} bullets={p.bullets} />)}
        </Section>
      )}
      {!!resume.education?.length && (
        <Section title="Education">
          {resume.education.map((e, i) => (
            <Entry key={i} left={e.institution} right={e.dates} sub={e.degree} subRight={e.location} bullets={e.bullets} />
          ))}
        </Section>
      )}
      {!!resume.certifications?.length && <Section title="Certifications"><Bullets items={resume.certifications} /></Section>}
      {resume.skills && <Section title="Skills"><Skills skills={resume.skills} /></Section>}
      {resume.otherSections?.filter((s) => s.lines?.length || s.entries?.some((e) => e?.name)).map((s, i) => (
        <Section key={i} title={String(s.heading ?? '')}>
          {s.entries?.filter((e) => e?.name).map((e, j) => (
            <Entry key={j} left={e.name} leftSub={e.subtitle} right={e.dates || e.link} sub={e.dates ? e.link : undefined} bullets={e.bullets} />
          ))}
          {!!s.lines?.length && <Bullets items={s.lines} />}
        </Section>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-3.5">
      <h4 className="mb-1.5 border-b border-body pb-px text-[11.5px] font-bold uppercase tracking-[0.04em]">{title}</h4>
      {children}
    </section>
  )
}

// Skills a labelled group per line ("Languages: Python, SQL"), label in bold, as the PDF prints them.
function Skills({ skills }: { skills: string }) {
  return (
    <>
      {skills.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((line, i) => {
        const m = SKILL_GROUP.exec(line)
        return <p key={i}>{m ? <><b>{m[1].trim()}:</b> {m[2]}</> : line}</p>
      })}
    </>
  )
}

// leftSub: a project's tech line or an entry's role, in italics after the name.
function Entry({ left, leftSub, right, sub, subRight, bullets }: { left?: string; leftSub?: string; right?: string; sub?: string; subRight?: string; bullets?: string[] }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between gap-3"><span className="min-w-0 break-words"><b>{left}</b>{leftSub && <i>{`  |  ${leftSub}`}</i>}</span><span className="shrink-0">{right}</span></div>
      {(sub || subRight) && <div className="flex justify-between gap-3"><i>{sub}</i><span className="shrink-0">{subRight}</span></div>}
      {!!bullets?.length && <Bullets items={bullets} />}
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-0.5 flex flex-col gap-0.5">
      {items.map((b, i) => <li key={i} className="flex gap-2"><span aria-hidden>•</span><span>{String(b ?? '')}</span></li>)}
    </ul>
  )
}
