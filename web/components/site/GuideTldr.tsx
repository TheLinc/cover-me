// Three-line summary at the top of every guide, after the lead paragraph.
export function GuideTldr({ items }: { items: string[] }) {
  return (
    <div className="border border-border rounded-[12px] bg-surface p-6 !mt-8">
      <h2 className="text-[18px] text-foreground mb-3">TL;DR</h2>
      <ul className="list-disc pl-5 space-y-2 text-[14.5px] leading-[1.6] text-foreground marker:text-brand">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  )
}
