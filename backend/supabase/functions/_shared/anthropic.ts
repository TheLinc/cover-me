// Anthropic Messages endpoint. ANTHROPIC_BASE_URL is unset in production; the
// local test run points it at a mock server (backend/tests/mock-anthropic.ts)
// so function tests exercise the full request path without paid API calls.
const BASE_URL = (Deno.env.get('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com').replace(/\/+$/, '')

export const ANTHROPIC_MESSAGES_URL = `${BASE_URL}/v1/messages`
