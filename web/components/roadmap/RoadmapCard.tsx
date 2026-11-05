import type { RoadmapItem } from '@/lib/roadmap'

const SUPPORT_EMAIL = 'support@cover-me.dev'

export function RoadmapCard({ item }: { item: RoadmapItem }) {
  return (
    <div className="soft-card flex h-full flex-col gap-2 px-6 py-5">
      {item.shipped && <span className="text-[12px] text-subtle">{item.shipped}</span>}
      <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink">{item.title}</h3>
      {item.blurb && <p className="text-[15px] leading-[1.6] text-ink-2">{item.blurb}</p>}
    </div>
  )
}

export function FeatureRequest() {
  return (
    <p className="text-[14px] text-ink-2">
      Want a feature added? Email us at{' '}
      <a href={`mailto:${SUPPORT_EMAIL}`} className="whitespace-nowrap font-medium text-brand-strong hover:underline">{SUPPORT_EMAIL}</a>
    </p>
  )
}
