import { parseHTML } from 'linkedom'
import { describe, expect, test } from 'vitest'
import { fieldMaxLength, fieldQuestion } from './answer-field'

const field = (html: string, selector = '#f') => {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`)
  return document.querySelector(selector) as unknown as HTMLElement
}

describe('fieldQuestion', () => {
  test('reads a label pointing at the box, without the required mark (Greenhouse, Ashby)', () => {
    const el = field(`<label for="f">Why do you want to work at Acme? <span aria-hidden="true">*</span></label><textarea id="f"></textarea>`)
    expect(fieldQuestion(el)).toBe('Why do you want to work at Acme?')
  })

  test('reads a label wrapped around the box, leaving out the box itself', () => {
    const el = field(`<label>Describe a project you led<textarea id="f">draft text</textarea></label>`)
    expect(fieldQuestion(el)).toBe('Describe a project you led')
  })

  test('reads aria-labelledby, joining every id it names', () => {
    const el = field(`<p id="q">Tell us about a hard bug.</p><p id="h">Max 200 words.</p><div id="f" contenteditable="true" aria-labelledby="q h"></div>`)
    expect(fieldQuestion(el)).toBe('Tell us about a hard bug. Max 200 words.')
  })

  test('reads aria-label', () => {
    expect(fieldQuestion(field(`<textarea id="f" aria-label="Cover note"></textarea>`))).toBe('Cover note')
  })

  test('falls back to the nearest text above the box (Lever)', () => {
    const el = field(`<ul><li class="application-question">
      <div class="application-label"><div class="text">What interests you about this role?<span class="required">✱</span></div></div>
      <div class="application-field"><textarea id="f" name="cards[abc][field0]"></textarea></div>
    </li></ul>`)
    expect(fieldQuestion(el)).toBe('What interests you about this role?')
  })

  test('uses the placeholder when nothing else names the box', () => {
    expect(fieldQuestion(field(`<div><textarea id="f" placeholder="Anything else we should know?"></textarea></div>`))).toBe('Anything else we should know?')
  })

  test('is empty when nothing names the box', () => {
    expect(fieldQuestion(field(`<div><textarea id="f"></textarea></div>`))).toBe('')
  })
})

describe('fieldMaxLength', () => {
  test("reads the box's maxlength", () => {
    expect(fieldMaxLength(field(`<textarea id="f" maxlength="500"></textarea>`))).toBe(500)
  })

  test('is undefined with no limit, or a meaningless one', () => {
    expect(fieldMaxLength(field(`<textarea id="f"></textarea>`))).toBeUndefined()
    expect(fieldMaxLength(field(`<textarea id="f" maxlength="-1"></textarea>`))).toBeUndefined()
    expect(fieldMaxLength(field(`<div id="f" contenteditable="true"></div>`))).toBeUndefined()
  })
})
