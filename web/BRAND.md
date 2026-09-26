# Cover Me brand: made to measure

The resume is a garment and Cover Me is the tailor. The visual language comes from
sewing patterns: cream tissue paper, dashed cut lines, notches, small mono
annotations, a red thread, a yellow tape measure. Headline idea: one resume doesn't
fit every job.

Promo videos are flat motion graphics that show the product flow, not live action.
Use the same palette, type, and assets as the site so a video frame and a page
screenshot look like the same brand.

## Palette

| Token | Hex | Use |
|---|---|---|
| tissue | #F2EADB | background |
| tissue-2 | #E8DCC6 | panels, pattern pieces |
| ink | #1C1A17 | text, outlines |
| ink-2 | #5E574C | secondary text |
| pattern-line | #B3A489 | dashed rules, outlines, dress-form heads |
| thread | #C4321F | the one accent: CTAs, the thread |
| thread-deep | #A3281A | hover, small red text on tissue-2 |
| tape | #E6B422 | ATS score and tape measures only |
| chalk | #3B5B8F | "your resume" and "matched" only |
| night | #141311 | footer, dark end cards |

## Type

- Bodoni Moda 500 for headlines. Set one word in italic, often in thread red ("every", "hired.").
- Hanken Grotesk for body and UI.
- IBM Plex Mono, uppercase with wide tracking, for pattern notes ("PIECE 1 OF 3", "TAILORED FOR:").

## Assets

- `public/brand/hero-scene.svg`: two dress forms wearing a suit and a dress cut from the same
  resume, joined by a red thread. Groups `#suit`, `#dress`, `#thread` animate separately.
  Source: Higgsfield, Recraft V4.1 vector mode, job `f98289d0-0a20-4cc9-9059-e29f53672b39`,
  prompt: "Minimal flat vector illustration, cream background: two dress forms on thin stands,
  one wearing a tailored blazer and one wearing a dress, both garments made of white resume
  paper with thin grey text lines and dashed cutting lines. A red thread loops from one garment
  to the other. A yellow tape measure hangs over one form. Bold simple shapes, thin black
  outlines, modern editorial motion-graphics style, generous negative space. No legible text."
  Regenerate the site component and this file with `node scripts/svg-to-scene.mjs <recraft.svg>`.
- `app/opengraph-image.tsx`: the 1200×630 share card (headline plus the scene).

## Motion

- The thread draws itself (stroke-dashoffset), one segment after another, about 1 s each.
- Dress forms sway ±0.6° from the base, out of phase, on a slow 7 s loop.
- The footer wordmark is stitched: a dashed red outline revealed left to right.
- Scores count up on a tape measure (52% → 78% in the site example).
- Hard cuts between scenes; no glows, gradients, or blur.
