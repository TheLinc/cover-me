import type { MetadataRoute } from 'next'
import { BOARDS } from '@/lib/boards'
import { GUIDES } from '@/lib/guides'
import { FETCHED, ROLES } from '@/lib/roles'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

// Real content dates, not new Date(): Google ignores lastmod once it stops matching real changes
// (https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap#additional-notes-about-xml-sitemaps).
const LAST_MODIFIED = {
  home: '2026-11-27',
  about: '2026-11-27',
  legal: '2026-11-11',
  support: '2026-10-29',
  atsChecker: '2026-11-18',
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
      url: `${BASE}/ats-checker`,
      lastModified: LAST_MODIFIED.atsChecker,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/about`,
      lastModified: LAST_MODIFIED.about,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...BOARDS.map((b) => ({
      url: `${BASE}/for/${b.slug}`,
      lastModified: b.updated,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...['', ...ROLES.map((r) => `/${r.slug}`)].map((path) => ({
      url: `${BASE}/resume-keywords${path}`,
      lastModified: FETCHED,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    {
      url: `${BASE}/guides`,
      lastModified: GUIDES.map((g) => g.updated ?? g.date).reduce((max, date) => (date > max ? date : max)),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...GUIDES.map((g) => ({
      url: `${BASE}/guides/${g.slug}`,
      lastModified: g.updated ?? g.date,
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
    {
      url: `${BASE}/roadmap`,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${BASE}/changelog`,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ]
}
