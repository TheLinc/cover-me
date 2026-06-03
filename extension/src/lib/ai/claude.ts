const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

export async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `Claude API error ${res.status}`)
  }

  const data = (await res.json()) as { content: Array<{ type: string; text: string }> }
  const text = data.content.find((b) => b.type === 'text')?.text ?? ''
  if (!text) throw new Error('Empty response from Claude')
  return text
}
