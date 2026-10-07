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

- `ExtensionPopup`, `ProgressStep`, `ScoreRing`: the real popup, its progress rows and its ATS ring.
- `ResumeDoc`, `LetterDoc`, `BrowserFrame`, `Hl` (`visuals.tsx`): the outputs and the page they come from.
- `EXAMPLE`, `TIERS`, `CELLS`, `SCORE` (`visuals.tsx`): the one Northwind application every visual
  shows. The posting text, the original and tailored bullets and the 86 score all live here, and
  the score uses the backend's real 70/30 weights.
- `Ambient`: background depth behind a section (indigo or warm glows, a fading dot field, an
  outlined rounded square that drifts on scroll). Paper grain sits under the whole page.
- The hero is a flow with no stacked cards: the posting in a browser on top, a dark Cover Me status
  pill in the middle, the resume (white) and letter (warm paper) side by side below.

## Story

The page follows one application. The hero shows the result, then replays it over 21 seconds. `RunStory` is the
pinned walkthrough: scroll drives a position from 0 to 5 (click, read, rewrite, score,
letter) and every layer derives its state from it, so it plays backwards too. Then
`FoundInSearch` shows why the wording matters, `NoFakes` lets visitors try to add a gap
and watch it bounce off, and `PrivacyBand` toggles where the data goes. `JourneyDock`
tracks the application's progress at the bottom of the screen and keeps the install
button one click away.

## Motion

- The hero holds the result for about 8 seconds, then changes one card at a time: requirements light
  up, bullets are rewritten and scored, the letter types out. Cards never move.
- The walkthrough is scroll-scrubbed; chapters fade in and out at their boundaries, never overlapping.
- Phones get a portrait stage (`compact`) scaled to fit, and the dock waits until the walkthrough ends.
- Reduced motion: the walkthrough becomes stacked still frames and loops show their finished state.
  Without scroll timelines (Firefox) content simply shows.

## Claims

- Job boards: only the sites the extension reads (LinkedIn, Indeed, Greenhouse, Lever,
  Workday, Ashby, BambooHR, Workable). Everywhere else is "paste it in".
- Stats must carry a source: Huntr (2.1× interviews), Jobscan (97.8% of Fortune 500
  use an ATS), Ladders (7.4 s first look). The 40 s figure is our arithmetic, stated on
  the page.
