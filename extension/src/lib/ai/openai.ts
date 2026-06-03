const OPENAI_API = 'https://api.openai.com/v1/chat/completions'

export async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `OpenAI API error ${res.status}`)
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  const text = data.choices[0]?.message.content ?? ''
  if (!text) throw new Error('Empty response from OpenAI')
  return text
}
