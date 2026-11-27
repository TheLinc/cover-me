import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { jsonLdApp, jsonLdOrg, jsonLdWebSite } from './structured-data'
import { GUIDES, guideArticleJsonLd } from './guides'

describe('Organization @id', () => {
  it('is set on the Organization', () => {
    expect(jsonLdOrg['@id']).toBe('https://www.cover-me.dev/#organization')
  })

  it.each([
    ['WebSite', jsonLdWebSite],
    ['SoftwareApplication', jsonLdApp('1.0.0')],
    ['guide Article', guideArticleJsonLd(GUIDES[0])],
  ])('is the publisher of the %s markup', (_, markup) => {
    expect(markup.publisher['@id']).toBe('https://www.cover-me.dev/#organization')
  })
})

describe('descriptions', () => {
  it.each([
    ['WebSite', jsonLdWebSite.description],
    ['SoftwareApplication', jsonLdApp('1.0.0').description],
  ])('the %s description opens with what a job seeker gets, not open source', (_, description) => {
    const first = description.split('. ')[0]
    expect(first).toMatch(/tailors your resume/)
    expect(first).not.toMatch(/open.source|api key/i)
  })
})

describe('llms.txt', () => {
  it('holds only link lists under its H2 headings, as llmstxt.org defines them', () => {
    const llms = readFileSync(join(__dirname, '../public/llms.txt'), 'utf8')
    const sections = llms.slice(llms.indexOf('\n## ')).split(/\r?\n/)
    const stray = sections.filter((line) => line.trim() && !line.startsWith('## ') && !line.startsWith('- ['))
    expect(stray).toEqual([])
  })
})
