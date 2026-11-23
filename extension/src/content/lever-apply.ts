// Lever's apply page, where LinkedIn's Apply button lands, has the title and
// form but no description. The posting page carries it as JSON-LD (#325).
export async function addLeverPostingJsonLd(): Promise<void> {
  if (!/(^|\.)lever\.co$/.test(location.hostname)) return
  const posting = location.pathname.match(/^(\/[^/]+\/[^/]+)\/apply\/?$/)?.[1]
  if (!posting || document.querySelector('script[data-cover-me-posting]')) return
  const res = await fetch(location.origin + posting, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) return
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
  // The JSON-LD description can leave out the posting's closing section (#325)
  const sections = Array.from(doc.querySelectorAll('.section.page-centered:not(.posting-header):not(.last-section-apply)'))
    .map((s) => s.innerHTML).join('')
  for (const ld of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(ld.textContent ?? '')
    } catch {
      continue
    }
    if (sections && [data['@type']].flat().includes('JobPosting')) data.description = sections
    const copy = document.createElement('script')
    copy.type = 'application/ld+json'
    copy.dataset.coverMePosting = ''
    copy.textContent = JSON.stringify(data).replace(/</g, '\\u003c')
    document.head.append(copy)
  }
}
