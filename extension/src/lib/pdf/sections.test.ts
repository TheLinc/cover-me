import { describe, expect, test } from 'vitest'
import { orderedSections } from './sections'
import type { TailoredResume } from './types'

const base: TailoredResume = {
  name: 'Pat Lee', phone: '', email: '', website: '', experience: [], education: [],
  otherSections: [{ heading: 'Talks', lines: ['a'] }, { heading: 'Awards', lines: ['b'] }],
}

describe('print order', () => {
  test('without a saved order: summary, skills, experience, projects, each extra section, education', () => {
    expect(orderedSections(base)).toEqual([
      { key: 'summary' }, { key: 'skills' }, { key: 'experience' }, { key: 'projects' },
      { key: 'other', index: 0 }, { key: 'other', index: 1 }, { key: 'education' }, { key: 'certifications' },
    ])
  })

  test('a saved order is followed, each "other" taking the next extra section', () => {
    const r = { ...base, sectionOrder: ['other', 'skills', 'experience', 'other'] as TailoredResume['sectionOrder'] }
    expect(orderedSections(r).slice(0, 4)).toEqual([{ key: 'other', index: 0 }, { key: 'skills' }, { key: 'experience' }, { key: 'other', index: 1 }])
  })

  test('sections a saved order leaves out still print, after it', () => {
    const r = { ...base, sectionOrder: ['skills'] as TailoredResume['sectionOrder'] }
    const keys = orderedSections(r).map((s) => s.key)
    expect(keys[0]).toBe('skills')
    expect(keys).toEqual(['skills', 'summary', 'experience', 'projects', 'education', 'certifications', 'other', 'other'])
  })
})
