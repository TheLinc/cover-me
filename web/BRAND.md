# Cover Me brand

Graphics first. A visitor should understand the product from the pictures and the
headings alone: a job posting goes in, the Cover Me popup scores it, a tailored
resume and cover letter come out. Body text only adds detail. Promo videos are flat
motion graphics built from the same pieces.

## Palette

Warm neutrals with Cover Me indigo as the only accent. The extension uses the same
indigo, so the popup and the site match.

| Token | Hex | Use |
|---|---|---|
| paper | #F5F3F2 | page background |
| panel | #ECEAE7 | soft panels behind product visuals |
| card | #FFFFFF | cards |
| line | #E2DFDB | dividers, borders |
| ink | #1E1B4B | headings, strong text |
| body | #2A2A2A | body text |
| ink-2 | #5A534D | secondary text |
| subtle | #6B635D | small labels, captions |
| brand | #6366F1 | Cover Me indigo: graphics, rings, focus |
| brand-strong | #4F46E5 | buttons and links (white text passes AA) |
| brand-tint / brand-ink | #EEEEFF / #4338CA | matched-keyword chips |
| gap / gap-tint / gap-ink | #F97316 / #FFEDD5 / #9A3412 | missing keywords |
| night | #15132B | dark bands, footer |

The extension popup keeps its own dark palette (`--ext-*` in `app/globals.css`) inside
product visuals, so the site shows exactly what people install.

## Type and shape

- Geist 600 for headings with tight tracking (-0.025 to -0.035em), Geist 400/500 for body.
- Geist Mono for small labels ("HOW IT WORKS", sources).
- Soft corners: 16 to 32px panels and cards, pill buttons.

## Building blocks (web/components/landing)

- `ExtensionPopup`, `ScoreRing`: the real popup and its ATS ring.
- `JobCard`, `ResumeDoc`, `LetterDoc`, `BrowserFrame`, `Chip` (`visuals.tsx`): the
  job posting and the two outputs. Example data lives in `EXAMPLE`.

## Motion

- Animated flow lines between the posting, the popup and the output.
- The ATS ring and the stats count up the first time they scroll into view.
- Hero scene tabs auto-advance like a demo until the visitor picks one.
- Sticky walkthrough: the visual follows the step you're reading.
- Everything snaps to its final state under reduced motion, and without scroll
  timelines (Firefox) content simply shows.

## Claims

- Job boards: only the sites the extension reads (LinkedIn, Indeed, Greenhouse, Lever,
  Workday, Ashby, BambooHR, Workable). Everywhere else is "paste it in".
- Stats must carry a source: Huntr (2.1× interviews), Jobscan (97.8% of Fortune 500
  use an ATS), Ladders (7.4 s first look). The 40 s figure is our arithmetic, stated on
  the page.
