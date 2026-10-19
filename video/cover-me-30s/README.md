# Cover Me, 30 s product video

The Chrome Web Store and YouTube video. 16:9, 1920×1080, 30 s, music and UI sounds, no captions. Every frame is drawn by `film.js` from nothing but the time, then screenshotted by a headless browser and encoded with ffmpeg. Built with the `motion-video` skill.

## Files

| File | What it is |
|---|---|
| `film.js` | The film: nine shots on a 96 BPM grid (a bar is 2.5 s). `window.seek(t)` paints frame t. |
| `motion.js`, `stage.html` | Springs, layout units and the stage page. Fonts load from `extension/src/fonts`, the logo and board logos from `web/public`. |
| `render.mjs` | Renders frames to video. |
| `score.mjs` | The music, synthesized: D, Bm, G, A at 96 BPM. |
| `cues.mjs` → `cues.json` → `sfx.mjs` | UI sounds, one per on-screen action, placed from the timeline. |
| `mix.mjs` | Puts the score and UI sounds under a render at -14 LUFS. |
| `review.mjs`, `sheet.mjs` | Contact sheets, phone test, strips and still sheets for reviewing a render. |
| `capture-popup.mjs` | Captures the real popup from `extension/dist` at 3x, seeded through storage, and renders the real tailored PDF, into `assets/popup/`. |
| `capture-site.mjs` | Screenshots and tokens from the website, for reference. |
| `beats.py` | Writes a beat grid (`--bpm 96 --dur 30`), or measures one from a track. |

`out/`, `assets/` and `cues.json` are generated and not committed. The planning docs (brief, brand notes, cut list, style guide, shot list, review log) sit in `docs/`, which the repo keeps local.

## Render

Needs Node 22, ffmpeg on PATH, and a built extension (`pnpm build` in `extension/`, for the popup captures and pdf.js).

```
pnpm install
pnpm exec playwright install chromium   # once
pnpm capture    # the real popup states and PDF → assets/popup/ (again whenever the popup or the example data changes)
pnpm audio      # score, cue times and UI sounds → out/
pnpm draft      # 30 fps, about 1.5 min → out/16x9/draft.mp4
pnpm final      # 60 fps with 4 blended subframes, about 10 min → out/16x9/final.mp4
```

Videos render at 2x and scale down to 1080p (`--ss 1` turns that off). Chromium draws text on whole device pixels under a transform, so text that moves slowly steps a pixel at a time. Rendering at 2x halves those steps, and two rules in `film.js` keep text from stepping when it's meant to be still:

- Text moves decisively or holds still. Don't give a text-bearing camera or card a slow "keep it alive" drift. Drift the images instead (the popup captures are images).
- Springs end. `spring()` in `motion.js` returns its target exactly once the remaining motion is under 0.02%, so a settled camera never creeps.

One frame: `node render.mjs --stills 12.8` (→ `out/16x9/stills/`). Preview in a browser: open `stage.html`, or `stage.html?t=12.8` for one frame. A review pass: `pnpm review`, plus strip times as extra arguments (`node review.mjs out/16x9/silent.mp4 13.6 15.5`).

For the store listing, the final video, its thumbnail (the end card at 29.5 s) and the YouTube title and description sit in `chrome-store/video/`, which is local.

## Data

Everyone and everything is made up: Alex Rivera, Northwind, Brightline, Fieldstone, the montage's companies. The popup is seeded with the same Northwind application, so the drawn resume, the real popup and the real PDF agree. Two choices are illustrations, not the real scorer's output, by the owner's decision: the base score (44, rising to 86), and keeping 86 with three gaps (HubSpot, Salesforce, SQL), which the real 70/30 weights would score 74.

## With another round

- Make SEO's flight a tracking shot (the camera locked to the word from the posting to bullet 3), so the middle flight reads as its own shot.
- The push onto the ring passes the resume's contact line at large size; a tighter route would keep only the ring, the chips and paper in frame.
- The score is synthesized. A licensed track, re-cut to its beat grid (`python beats.py track.wav`), would sound better.
- A 9:16 cut for Shorts would need its own composition; nothing here is laid out for portrait.
