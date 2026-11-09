import { useEffect, useRef, useState } from 'react'

export interface DownloadOption {
  label: string
  note?: string
  onSelect: () => void
}

// One Download button that lists the formats (#118), so the result row has
// room for Edit. Opens upward at the popup's bottom edge, downward in lists.
export default function DownloadMenu({ options, className = 'btn btn-primary', up = false }: { options: DownloadOption[]; className?: string; up?: boolean }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  // Focus moves into the menu when it opens; it closes when focus leaves
  // (Tab away, or a click anywhere else).
  useEffect(() => {
    if (open) root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [open])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])]
      if (!items.length) return
      e.preventDefault()
      const i = items.indexOf(document.activeElement as HTMLButtonElement)
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus()
    }
  }

  return (
    <div
      className="download-menu"
      ref={root}
      onKeyDown={onKeyDown}
      onBlur={(e) => { if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false) }}
    >
      <button ref={trigger} className={className} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download
        <svg className={`chevron${open !== up ? ' open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className={`download-menu-list${up ? ' up' : ''}`} role="menu">
          {options.map((o) => (
            <button key={o.label} role="menuitem" className="download-menu-item" onClick={() => { setOpen(false); o.onSelect() }}>
              {o.label}
              {o.note && <small>{o.note}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
