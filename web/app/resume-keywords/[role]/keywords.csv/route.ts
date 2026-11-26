import { kindOf } from '@/lib/role-keywords'
import { ROLES, getRole, percent } from '@/lib/roles'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return ROLES.map((r) => ({ role: r.slug }))
}

const cell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))

export async function GET(_: Request, { params }: { params: Promise<{ role: string }> }) {
  const role = getRole((await params).role)
  if (!role) return new Response('Not found', { status: 404 })
  const rows = [
    ['keyword', 'type', 'postings', 'of', 'share_percent'],
    ...role.counts.keywords.map((k) => [k.name, kindOf(k.name), k.postings, role.counts.postings, percent(role, k)]),
  ]
  return new Response(`${rows.map((r) => r.map(cell).join(',')).join('\n')}\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `inline; filename="${role.slug}-resume-keywords.csv"`,
    },
  })
}
