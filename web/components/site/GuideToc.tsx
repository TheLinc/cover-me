'use client'

import { useEffect, useState } from 'react'
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

type Item = { id: string; title: string }

function Links({ items, active }: { items: Item[]; active?: string }) {
  return (
    <ol className="space-y-1 border-l border-line">
      {items.map((it) => (
        <li key={it.id}>
          <a
            href={`#${it.id}`}
            aria-current={it.id === active ? 'location' : undefined}
            className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-[14px] leading-[1.45] text-ink-2 transition-colors hover:text-ink aria-[current=location]:border-brand aria-[current=location]:font-medium aria-[current=location]:text-ink"
          >
            {it.title}
          </a>
        </li>
      ))}
    </ol>
  )
}

const Heading = ({ className }: { className?: string }) => (
  <span className={cn('font-mono text-[11px] uppercase tracking-[0.1em] text-subtle', className)}>Contents</span>
)

export function GuideToc({ items }: { items: Item[] }) {
  const [active, setActive] = useState<string>()

  // A section is current while it crosses a band just under the sticky nav.
  useEffect(() => {
    const sections = items.map((it) => document.getElementById(it.id)?.closest('section')).filter((s) => s != null)
    const visible = new Set<Element>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target)
          else visible.delete(e.target)
        }
        const first = sections.find((s) => visible.has(s))
        setActive(first?.querySelector('h2')?.id)
      },
      { rootMargin: '-96px 0px -55% 0px' },
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [items])

  return (
    <nav aria-label="Contents" className="sticky top-24">
      <Heading className="mb-4 block" />
      <Links items={items} active={active} />
    </nav>
  )
}

export function GuideTocCollapsed({ items }: { items: Item[] }) {
  return (
    <Collapsible className="mb-10 rounded-[12px] border border-line bg-surface lg:hidden">
      <CollapsibleTrigger className="group flex w-full items-center justify-between px-5 py-4">
        <Heading />
        <CaretDownIcon className="size-4 text-subtle transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-5 pb-4">
        <nav aria-label="Contents">
          <Links items={items} />
        </nav>
      </CollapsibleContent>
    </Collapsible>
  )
}
