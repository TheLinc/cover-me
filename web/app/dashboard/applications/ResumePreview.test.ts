import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { TailoredResume } from '@/lib/pdf/types'
import { ResumePreview } from './ResumePreview'

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')

describe('ResumePreview', () => {
  const resume: TailoredResume = {
    name: 'Pat Lee', phone: '555-0100', email: 'pat@example.com', website: '',
    headline: 'Backend Engineer',
    experience: [],
    projects: [{ name: 'tidewatch', tech: 'Go, SQLite', link: 'github.com/pat/tidewatch', bullets: ['Uptime monitor'] }],
    education: [],
    skills: 'Languages: Go, Python\nInfrastructure: Terraform, AWS',
    otherSections: [{
      heading: 'Open Source',
      lines: ['Speaker, GopherCon 2024'],
      entries: [{ name: 'pg-outbox', subtitle: 'Creator', link: 'github.com/pat/pg-outbox', bullets: ['Outbox library'] }],
    }],
  }
  const html = renderToStaticMarkup(createElement(ResumePreview, { resume }))

  it('shows the headline, and a project with its tech and link', () => {
    expect(text(html)).toContain('Backend Engineer')
    expect(text(html)).toMatch(/tidewatch \| Go, SQLite github\.com\/pat\/tidewatch/)
  })

  it('shows each skills group on its own line with the label in bold', () => {
    expect(html).toContain('<p><b>Languages:</b> Go, Python</p>')
    expect(html).toContain('<p><b>Infrastructure:</b> Terraform, AWS</p>')
  })

  it("shows a section's entries and its loose lines", () => {
    const t = text(html)
    expect(t).toMatch(/pg-outbox \| Creator github\.com\/pat\/pg-outbox/)
    expect(t).toContain('Outbox library')
    expect(t).toContain('Speaker, GopherCon 2024')
  })
})
