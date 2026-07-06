import type { MetadataRoute } from 'next'
import { BOARDS } from '@/lib/boards'
import { GUIDES } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

// Real content dates — bump the relevant entry when a page's content changes.
// Never use new Date() here: stamping every page as modified on every deploy
// teaches crawlers to ignore the lastmod signal entirely.
const LAST_MODIFIED = {
  home: '2026-07-06',
  about: '2026-06-23',
  legal: '2026-06-23',
  support: '2026-06-23',
  boards: '2026-07-06',
} as const

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      lastModified: LAST_MODIFIED.home,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE}/about`,
      lastModified: LAST_MODIFIED.about,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...BOARDS.map((b) => ({
      url: `${BASE}/for/${b.slug}`,
      lastModified: LAST_MODIFIED.boards,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    {
      url: `${BASE}/guides`,
      lastModified: GUIDES.reduce((max, g) => (g.date > max ? g.date : max), GUIDES[0].date),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...GUIDES.map((g) => ({
      url: `${BASE}/guides/${g.slug}`,
      lastModified: g.date,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    {
      url: `${BASE}/privacy`,
      lastModified: LAST_MODIFIED.legal,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE}/terms`,
      lastModified: LAST_MODIFIED.legal,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE}/support`,
      lastModified: LAST_MODIFIED.support,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]
}
