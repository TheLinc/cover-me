import { corsHeaders } from './cors.ts'

// Chrome stops an extension service worker whose fetch() gets no response for
// 30 s, and some answers take longer: a letter plus a lint retry (median
// 17.6 s, max 23.5 s without one), or the parse of a long resume (31 s). So
// the headers go out now and a space every 5 s until the JSON is ready; JSON
// parsers skip leading whitespace, so the published extension reads it
// unchanged. The status is already 200 by then, so a late failure is
// reported as { error } in the body.
export function heartbeatJson(name: string, failure: string, work: () => Promise<Record<string, unknown>>): Response {
  const enc = new TextEncoder()
  let beat: number | undefined
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => {
        try { controller.enqueue(enc.encode(s)) } catch { /* client went away */ }
      }
      send(' ')
      beat = setInterval(() => send(' '), 5000)
      let result: Record<string, unknown>
      try {
        result = await work()
      } catch (err) {
        console.error(`${name} error:`, err instanceof Error ? err.message : String(err))
        result = { error: failure }
      }
      clearInterval(beat)
      send(JSON.stringify(result))
      try { controller.close() } catch { /* already closed */ }
    },
    cancel() {
      clearInterval(beat)
    },
  })
  return new Response(body, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
