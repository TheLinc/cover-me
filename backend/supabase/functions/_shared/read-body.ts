// Reads a request body as text. Gzip bodies (the extension's scrape
// snapshots) are decompressed first. Stops reading past maxBytes, so a small
// compressed body can't expand without limit; null means too large.
export async function readBody(req: Request, maxBytes: number): Promise<string | null> {
  if (!req.body) return ''
  const stream = req.headers.get('content-encoding') === 'gzip'
    ? req.body.pipeThrough(new DecompressionStream('gzip'))
    : req.body
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of stream) {
    size += chunk.byteLength
    if (size > maxBytes) return null
    chunks.push(chunk)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) {
    bytes.set(c, offset)
    offset += c.byteLength
  }
  return new TextDecoder().decode(bytes)
}
