// Deterministic post-generation lint for cover letters.
//
// The prompt asks the model to avoid these; this module verifies it actually
// did, so the rules are guarantees rather than hopes. On violations the caller
// sends one corrective retry (see generateCoverLetter / the generate function).
//
// Keep this file dependency-free and identical to
// backend/supabase/functions/_shared/letter-lint.ts — scripts/check-prompt-sync.mjs
// fails the build if the two copies drift.

export interface LetterLintResult {
  violations: string[]
  wordCount: number
}

// Words that essentially never belong in a good cover letter. AI models emit
// them at 10–150x human base rates, and recruiters read them as machine output.
const AI_VOCAB = [
  'delve', 'delves', 'delving',
  'realm', 'tapestry', 'beacon',
  'intricate', 'intricacies',
  'showcase', 'showcasing', 'showcased',
  'pivotal', 'paramount', 'holistic', 'multifaceted',
  'synergy', 'synergistic',
  'testament', 'underscore', 'underscores', 'underscored',
  'facilitate', 'facilitated', 'facilitating',
  'meticulous', 'meticulously',
  'transformative', 'groundbreaking', 'revolutionize', 'revolutionized',
  'leverage', 'leveraged', 'leveraging',
  'utilize', 'utilized', 'utilizing', 'utilise', 'utilised', 'utilising',
  'robust', 'seamless', 'seamlessly',
  'honed', 'fostered', 'garnered',
  'empower', 'empowers', 'empowered', 'empowering',
  'embark', 'embarked', 'embarking',
  'unlock', 'unleash',
  'spearheaded', 'orchestrated',
  'cutting-edge', 'state-of-the-art',
  'crucial', 'comprehensive', 'innovative',
]

// Phrases HR research consistently finds on rejected/AI-flagged letters.
const CLICHE_PHRASES = [
  'hard worker', 'hard-working', 'team player', 'detail-oriented',
  'results-driven', 'results-oriented', 'go-getter', 'self-starter',
  'think outside the box', 'proven track record', 'fast learner',
  'strong communication skills', 'fast-paced environment', 'steep learning curve',
  'i believe i would be a great fit', 'i am confident that my background',
  'aligns perfectly', 'perfect fit', 'passionate', 'dynamic', 'dedicated',
  'motivated', 'enthusiastic',
]

// Generic openers — 83% of recruiters stop reading at these.
const FORBIDDEN_OPENERS = [
  'i am writing to apply', 'i am writing to express',
  'i am excited to apply', 'i am thrilled to apply',
  'please accept this letter', 'please find enclosed',
  'i have always been passionate', 'my name is',
  'to whom it may concern',
]

// Passive or presumptuous closes.
const PASSIVE_CLOSES = [
  'i hope to hear from you', 'feel free to contact me',
  'i would be happy to discuss', 'i look forward to hearing from you',
  'at your earliest convenience', 'thanks for your time',
]

// Formulaic connectives and filler that mark templated AI prose.
const AI_PATTERN_PHRASES = [
  'not only', 'moreover,', 'furthermore,', 'additionally,',
  "in today's", 'it is important to note', "it's important to note",
  'at the end of the day',
]

const SIGN_OFF_RE = /^(kind regards|sincerely|best regards|respectfully)[,.]?$/i
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.\w{2,}\b/
const PHONE_RE = /(\+?\d[\d ().-]{8,}\d)/
const MARKDOWN_RE = /(\*\*|^#{1,6}\s|^[-*]\s|\[.+?\]\(.+?\))/m
const URL_RE = /\b(https?:\/\/|www\.)\S+/i

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsWord(text: string, word: string): boolean {
  return new RegExp(`(^|[^a-z-])${escapeRegex(word)}($|[^a-z-])`, 'i').test(text)
}

function containsPhrase(text: string, phrase: string): boolean {
  return text.toLowerCase().includes(phrase.toLowerCase())
}

/** Body of the letter with salutation and sign-off block removed. */
function letterBody(letter: string): string {
  const lines = letter.split('\n')
  let start = 0
  let end = lines.length

  // Drop the salutation line ("Dear ...").
  const firstIdx = lines.findIndex((l) => l.trim().length > 0)
  if (firstIdx !== -1 && /^dear\b/i.test(lines[firstIdx].trim())) start = firstIdx + 1

  // Drop the sign-off + name block at the end.
  const nonEmptyFromEnd: number[] = []
  for (let i = lines.length - 1; i >= 0 && nonEmptyFromEnd.length < 2; i--) {
    if (lines[i].trim().length > 0) nonEmptyFromEnd.push(i)
  }
  const signOffIdx = nonEmptyFromEnd.find((i) => SIGN_OFF_RE.test(lines[i].trim()))
  if (signOffIdx !== undefined) end = signOffIdx

  return lines.slice(start, end).join('\n').trim()
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length
}

export function lintLetter(
  letter: string,
  opts: { companyName?: string } = {},
): LetterLintResult {
  const violations: string[] = []
  const body = letterBody(letter)
  const wordCount = countWords(body)

  for (const w of AI_VOCAB) {
    if (containsWord(letter, w)) {
      violations.push(`Contains AI-flagged word "${w}" — replace it with plain, specific language.`)
    }
  }
  for (const p of CLICHE_PHRASES) {
    if (p.includes(' ') ? containsPhrase(letter, p) : containsWord(letter, p)) {
      violations.push(`Contains cliché "${p}" — cut it or replace it with a concrete example.`)
    }
  }
  for (const p of FORBIDDEN_OPENERS) {
    if (containsPhrase(letter, p)) {
      violations.push(`Contains forbidden generic phrase "${p}" — open with a specific achievement or claim instead.`)
    }
  }
  for (const p of PASSIVE_CLOSES) {
    if (containsPhrase(letter, p)) {
      violations.push(`Contains passive close "${p}" — end with a direct, confident request for a conversation.`)
    }
  }
  for (const p of AI_PATTERN_PHRASES) {
    if (containsPhrase(letter, p)) {
      violations.push(`Contains templated connective/filler "${p}" — restructure the sentence without it.`)
    }
  }

  const emDashes = (letter.match(/—/g) ?? []).length
  if (emDashes > 2) {
    violations.push(`Uses ${emDashes} em-dashes — use at most 2 in the whole letter; rewrite the rest as separate sentences or with commas.`)
  }

  if (wordCount < 230) {
    violations.push(`Letter body is ${wordCount} words — too short; expand to 250–400 words with concrete detail from the resume.`)
  } else if (wordCount > 430) {
    violations.push(`Letter body is ${wordCount} words — too long; tighten to 250–400 words.`)
  }

  if (MARKDOWN_RE.test(letter)) {
    violations.push('Contains markdown formatting (**, #, list markers, or links) — output plain text only.')
  }
  if (EMAIL_RE.test(body)) {
    violations.push('Contains an email address in the letter body — remove all contact details from the body.')
  }
  if (PHONE_RE.test(body)) {
    violations.push('Contains a phone number in the letter body — remove all contact details from the body.')
  }

  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  const lastPara = paragraphs[paragraphs.length - 1] ?? ''
  if (URL_RE.test(lastPara)) {
    violations.push('Contains a URL in the closing paragraph — a portfolio/GitHub link may only appear inline in the core proof paragraph.')
  }

  if (opts.companyName && opts.companyName !== 'Unknown Company') {
    const mentions = (letter.match(new RegExp(escapeRegex(opts.companyName), 'gi')) ?? []).length
    if (mentions < 2) {
      violations.push(`Mentions the company name only ${mentions} time(s) — reference ${opts.companyName} at least twice, naturally.`)
    }
  }

  return { violations, wordCount }
}

/** Builds the follow-up user message for the single corrective retry. */
export function buildLintRetryMessage(violations: string[]): string {
  return `Your draft violates these rules from the original instructions:

${violations.map((v) => `- ${v}`).join('\n')}

Rewrite the complete letter fixing exactly these issues. Keep everything that already works — the same accomplishments, the same structure, the same specifics — and change only what the violations require. All original rules still apply (250–400 words, plain text, no fabricated qualifications or metrics). Output only the finished letter, nothing else.`
}
