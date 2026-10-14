import { parseHTML } from 'linkedom'
import { describe, expect, test } from 'vitest'
import { STRIP_SELECTOR } from './snapshot'

describe('STRIP_SELECTOR', () => {
  test("removes LinkedIn's messaging dock, so conversation previews never leave the browser", () => {
    const { document } = parseHTML(`<!doctype html><html><body>
      <main><h1>Data Engineer</h1><div class="jobs-description">Build pipelines.</div></main>
      <aside id="msg-overlay" class="msg-overlay-container">
        <div class="msg-overlay-list-bubble"><p>Sam: are you still interested?</p></div>
        <div class="msg-overlay-conversation-bubble"><p>Hi, following up on the role</p></div>
      </aside>
    </body></html>`)
    document.querySelectorAll(STRIP_SELECTOR).forEach((el) => el.remove())
    const html = document.body.innerHTML
    expect(html).not.toContain('Sam: are you still interested?')
    expect(html).not.toContain('following up')
    expect(html).toContain('Build pipelines.')
  })
})
