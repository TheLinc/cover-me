---
version: 1
slug: "web-app-dashboard"
primary_target: "web/app/dashboard"
related_targets: ["web/app/dashboard/applications"]
---

# Dashboard (home and applications)

Mode: Operate. Audience: signed-in Cover Me account holders; Pro accounts see every saved application. Job: find an application and grab its documents (letter, tailored resume) to apply, follow up or prep; plan and usage second. Two pages stay separate: /dashboard (home) and /dashboard/applications. Constraint: shadcn components only, the site's world from web/BRAND.md, two-column application grid.

## Direction contract

THESIS: The page opens on the question you came with, which application, and every document is one click from where your eye lands. Refuses the admin-panel default of bordered panels holding bordered cards holding buttons.

OWN-WORLD: The site's warm paper ground with white tiles that float on a soft two-part shadow (no panel around them), Cover Me indigo only on the primary search focus, chips' hover and the ATS score capsule (brand tint, brand ink). Geist throughout, pill chips and pill search, 20px tile corners, company monogram squares in brand tint.

STORY: Land, type a company, see the tile, click "Cover letter" or "Resume 77" and the PDF downloads. Details (every version, gaps, copy) one click further in the drawer; interview mark and delete in the ⋮ menu.

FIRST VIEWPORT: Applications: page title and a one-line count, then a full-width pill search (56px tall) with the date pickers and the interview toggle as chips under it, sticky under the header from md up; then two columns of compact tiles (monogram, title, company and applied date, then document chips and Details). Home: greeting, one slim plan-and-usage strip (plan, generations used with a thin bar, reset, billing or upgrade action), then "Recent applications" with the six newest tiles in the same two columns and "See all".

FORM: Surface structure 5 of my 7 (find-first compact tiles), dealt and chosen by the owner. Seed key 9af87b67.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
