---
name: Cover Me dashboard
description: The signed-in web app, where account holders find an application and get its letter and tailored resume back out.
colors:
  paper: "#F5F3F2"
  panel: "#ECEAE7"
  card: "#FFFFFF"
  line: "#E2DFDB"
  ink: "#1E1B4B"
  body: "#2A2A2A"
  ink-2: "#5A534D"
  subtle: "#6B635D"
  brand: "#6366F1"
  brand-strong: "#4F46E5"
  brand-deep: "#4338CA"
  brand-tint: "#EEEEFF"
  brand-ink: "#4338CA"
  gap-tint: "#FFEDD5"
  gap-ink: "#9A3412"
  destructive: "hsl(17 88% 40%)"
typography:
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.02em"
  tile-title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.6
  letter:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.4
  control:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1
  search:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  monogram: "12px"
  tile: "20px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  tile: "20px"
  lg: "24px"
  xl: "32px"
  page-top: "48px"
components:
  button-primary:
    backgroundColor: "{colors.brand-strong}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 16px"
  document-chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    height: "32px"
    padding: "0 12px"
  document-chip-hover:
    textColor: "{colors.brand-strong}"
  filter-chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  filter-chip-active:
    backgroundColor: "{colors.brand-tint}"
    textColor: "{colors.brand-ink}"
  search-input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.search}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 20px 0 56px"
  application-tile:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.tile}"
    padding: "20px"
  monogram:
    backgroundColor: "{colors.brand-tint}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.monogram}"
    size: "40px"
  ats-capsule:
    backgroundColor: "{colors.brand-tint}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
  gap-chip:
    backgroundColor: "{colors.gap-tint}"
    textColor: "{colors.gap-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  badge-pro:
    backgroundColor: "{colors.brand-strong}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  badge-free:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  badge-interview:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: Cover Me dashboard

This file covers the signed-in app: `/dashboard`, `/dashboard/applications` and the details drawer. Marketing pages follow `web/BRAND.md`, which owns the palette, Geist and the product visuals. Everything here uses BRAND.md's tokens from `web/app/globals.css` and adds the app's own component rules on top.

## Overview

**Creative North Star: "Documents on the desk"**

The app is the brand's warm paper ground with white tiles laid straight on it. Each tile is one application, and its documents (cover letter, tailored resume) sit on the tile as pill chips you click to download. Nothing is boxed twice: there is no panel around the tiles, no bordered section around a bordered card. Depth comes from a soft two-part shadow, not from frames.

Density is compact but calm. A page opens with a 34px heading and one line of context, then the thing you came for: a full-width pill search on Applications, the plan strip and recent tiles on home. Detail lives one step away in a right-hand drawer, which repeats the same white tile on paper for each letter and resume.

Indigo is used sparingly and mostly as a tint. Solid indigo marks the one primary action, the Pro badge, the usage bar and links; the pale tint with deep indigo text marks things that belong to Cover Me's output (monograms, the ATS score, an active filter).

**Key Characteristics:**
- Warm paper page, white tiles floating on a two-part shadow with an 80% hairline.
- Pills for every control: buttons, search, filter chips, badges, document chips.
- 20px tile corners, 12px monogram squares.
- Indigo tint with indigo ink for Cover Me output; orange tint only for missing keywords.
- Geist throughout, numbers in tabular figures.

## Colors

Warm neutrals with Cover Me indigo as the only accent, and orange reserved for ATS gaps. Values are the ones in BRAND.md and `globals.css`; the app adds no new colors.

### Primary
- **Cover Me Indigo** (`brand-strong`) is the solid fill of the primary button, the Pro badge and the usage bar, and the color of text links ("See all", "Install the extension", the posting host in the drawer). It also tints the hover border and text of document chips.
- **Pressed Indigo** (`brand-deep`) is the primary button's hover fill.
- **Signal Indigo** (`brand`) is for focus rings only (the search's focus ring and the global button ring). It never colors text.
- **Indigo Tint** (`brand-tint`) with **Indigo Ink** (`brand-ink`) mark Cover Me's output and active state: company monograms, the avatar fallback, the ATS score in the Resume chip and in the drawer, and a date or interview filter that is set.

### Secondary
- **Gap Tint** (`gap-tint`) with **Gap Ink** (`gap-ink`) mark missing keywords in the drawer and nothing else.

### Neutral
- **Warm Paper** (`paper`) is every page background and the drawer's background.
- **White Card** (`card`) is every tile, the search field, chips and outline buttons. In code it is written `bg-surface`, a legacy alias for `--card`.
- **Soft Panel** (`panel`) fills skeleton blocks, ghost-button hover and the Free badge.
- **Hairline** (`line`) is tile borders at 80% opacity, chip and button outlines, dashed empty states and the rules above the extension row and the drawer footer.
- **Deep Ink** (`ink`) is headings, tile titles, letter text and strong numbers.
- **Warm Grey** (`ink-2`) is secondary lines: the email line, company and applied date, drawer section headings.
- **Caption Grey** (`subtle`) is small labels ("Plan", "Missing", letter dates), the count line, placeholders and idle icons.
- **Rust** (`destructive`) is delete actions and error text.

### Named Rules
**The Tint Not Fill Rule.** Cover Me's output is marked with indigo tint and indigo ink, never a solid indigo block. Solid indigo is kept for the single primary action, the Pro badge and the usage bar.

**The Orange Means Missing Rule.** Gap tint and gap ink appear only on missing-keyword chips. No warning, badge or decoration borrows them.

## Typography

**Body Font:** Geist (with system-ui, sans-serif), loaded by `next/font` as `--font-sans`.

**Character:** One family at a few close sizes, with weight and tracking doing the work. Headings are 600 with negative tracking, everything else 400 or 500.

### Hierarchy
- **Headline** (600, 34px, 1.25, -0.03em): the page heading, "Good to see you." and "Applications".
- **Title** (600, 20px, -0.02em): section headings ("Recent applications"), the drawer's job title, and the usage number in the plan strip.
- **Tile title** (600, 15px, -0.01em): the job title on a tile, truncated to one line. Empty-state headings use the same size.
- **Body** (400, 13.5px to 14px): the context line under a heading, empty-state text, the extension row. Empty-state text caps at 46ch.
- **Letter** (400, 13.5px, 1.65): the full letter in the drawer, ink on white.
- **Control** (13px): chip and small-button text; 500 when a filter value is set or a button is primary.
- **Label** (400, 12.5px): captions in Caption Grey. Sentence case, no tracking, no uppercase.
- **Search** (16px): the search field's text, large enough that phones don't zoom.

### Named Rules
**The Tabular Numbers Rule.** Usage counts, ATS scores and the result count use tabular figures so they don't shift as they change.

## Layout

Pages sit in a 1040px centered column with 20px side padding, 48px from the header and 96px of bottom room. Home stacks its blocks 32px apart; Applications stacks 20px apart under the heading and 24px between the filter block and the list.

Applications tiles form a grid of two equal columns from 768px up with a 16px gap, and one column below that. Home shows the newest six in the same grid with "See all" on the section's baseline.

The Applications filter block (search, chips, count line) is sticky directly under the 64px site header from 768px up and sits on the paper background so tiles scroll under it. On phones it scrolls with the page. Tiles keep 16px between their header and their chip row; tile padding is 20px.

The details drawer opens from the right, full width on phones and 520px from 640px up, with 24px side padding, 32px between sections, and a sticky footer for the interview mark and Delete.

## Elevation & Depth

Depth is one soft two-part shadow under white tiles on paper: a tight 1px contact shadow plus a wide, low-opacity drop tinted with ink (`rgba(30,27,75,…)`), never black. Tiles also carry an 80% hairline so the edge holds on bright screens. The sticky filter block, chips and the drawer footer are flat. Hover lifts a tile 1px and deepens its drop.

### Shadow Vocabulary
- **Tile rest** (`box-shadow: 0 1px 2px rgba(30,27,75,0.05), 0 10px 28px -16px rgba(30,27,75,0.22)`): application tiles, the plan strip, drawer document tiles.
- **Tile hover** (`box-shadow: 0 1px 2px rgba(30,27,75,0.06), 0 16px 36px -16px rgba(30,27,75,0.32)`): application tile hover, with `translateY(-1px)` over 200ms ease-out.
- **Search lift** (`box-shadow: 0 1px 2px rgba(30,27,75,0.05), 0 10px 28px -18px rgba(30,27,75,0.25)`): the pill search.
- **Primary glow** (`box-shadow: 0 10px 30px -12px rgba(79,70,229,0.6)`): the primary button.

### Named Rules
**The Floating Tile Rule.** White tiles sit directly on paper. Never wrap a group of tiles in a panel, card or bordered section.

## Shapes

Three radii. Every control is a pill (search, buttons, filter chips, document chips, badges, ATS and gap capsules). Every container is 20px (application tiles, the plan strip, drawer tiles, empty states, skeleton tiles). Company monograms are 40px squares at 12px. The avatar is the only circle, and it holds a picture or an initial, never a status.

Empty states are a 20px dashed hairline outline on paper with no fill, so they read as a place a tile will go.

## Components

### Buttons
Pill buttons from the shared shadcn `Button`. Primary is Cover Me Indigo with white text and the primary glow, darkening to Pressed Indigo on hover; it appears once per view at most (the monthly upgrade on a Free account). Outline buttons are white with a hairline, the border darkening to Warm Grey on hover. Ghost buttons are text only with a Soft Panel hover ("Details", "Clear", the tile's ⋮ menu). Small buttons are 36px tall with 13px text; chips inside tiles and the drawer are 32px. Focus shows a 2px Signal Indigo ring offset from paper. Busy buttons swap their icon for a spinner and keep their label ("Redirecting", "Loading", "Deleting").

### Document chips
The tile's signature: an outline pill per document with a download icon ("Cover letter", "Resume"). The Resume chip carries the newest ATS score as a small Indigo Tint capsule at its end. Hover turns the border and text Cover Me Indigo. One click downloads the newest PDF.

### Filter chips
36px white pills under the search: two date pickers ("From Any date", "To Any date") and the "Got an interview" toggle. Idle text is Warm Grey with a Caption Grey label. When set, the chip fills with Indigo Tint, a 40% indigo border and Indigo Ink text, and the toggle gains a check. A ghost "Clear" pill appears only while a filter is set. Date chips open the shadcn Calendar in a Popover.

### Application tile
White, 20px corners, 20px padding, tile shadow. Top row: the monogram (company initial on Indigo Tint), the job title as a button that opens the drawer, then company and applied date in Warm Grey, and a ghost ⋮ menu (view details, go to posting, interview mark, delete). Bottom row: document chips on the left; the Interview badge and "Details" on the right. On phones "Details" collapses to its caret.

### Search
A 56px white pill across the full column, 16px text, a 20px magnifier inset 20px from the left, the search lift shadow, and a Signal Indigo focus ring. Placeholder "Search company or job title" in Caption Grey. Under the chips, one Caption Grey count line ("8 applications", "3 match", "30 shown").

### Plan strip
One tile-styled row on home read left to right: Plan (Pro or Free badge), usage (label, big number "of" limit, 6px indigo bar, reset line), then the account action (outline "Manage billing" for Pro; the primary monthly upgrade and an outline quarterly button for Free). Free accounts get one plain sentence under the strip about what Pro adds.

### Badges
Pills, 12px semibold. Pro is solid Cover Me Indigo with a small filled star. Free is Soft Panel with Warm Grey text. Interview is white with a hairline, Deep Ink text and a check.

### Details drawer
A right sheet on Warm Paper. Header: job title (Title), then company, applied date and the posting host as an indigo link. Sections are headed in 13px semibold Warm Grey, sentence case, with a count when there is more than one ("Cover letters (2)"). Each letter is a borderless white tile with its date, the full text and Copy and Download pills. The resume section heading carries the "ATS 72" capsule, then a "Missing" row of gap chips, then one slim white tile per tailored resume. The sticky footer holds the interview toggle (outline) and Delete (ghost, Rust) at the far right.

## Do's and Don'ts

### Do:
- **Do** lay white 20px tiles straight on Warm Paper with the tile rest shadow and an 80% hairline.
- **Do** make every control a pill and every container 20px.
- **Do** put a document one click from the tile: a download chip per document, the ATS score on the Resume chip.
- **Do** mark Cover Me output and set filters with Indigo Tint and Indigo Ink.
- **Do** keep missing keywords in Gap Tint and Gap Ink, labeled "Missing".
- **Do** use tabular figures for counts and scores, and write all text in sentence case.
- **Do** follow `web/BRAND.md` for anything on the marketing pages.

### Don't:
- **Don't** wrap tiles in a panel or bordered section, or nest a bordered card in a bordered card.
- **Don't** use Signal Indigo (`brand`) for text; text uses Cover Me Indigo or Indigo Ink.
- **Don't** use circular dots or bullets as status markers; status is a labeled pill (Interview, Pro, Free).
- **Don't** add uppercase, mono or tracked-out labels above headings in the app; a section is named by its own heading.
- **Don't** use black or hard offset shadows; shadows are ink-tinted and soft.
