---
name: Angel Eduardo Luna, portfolio
description: A technical journal engraved on a loss surface, with an optimiser descending it as the page is read.
colors:
  paper: "#EDE5D8"
  plate: "#FAF6EF"
  ink: "#241F1A"
  graphite: "#5C5246"
  rule: "#D3C8B7"
  contour: "#A39482"
  accent: "#8C2F39"
  survey: "#1D4E89"
  hazard: "#A23B2A"
  ramp-1: "#DCE6F0"
  ramp-2: "#A9C3DE"
  ramp-3: "#6E9CCB"
  ramp-4: "#3A6FAE"
  ramp-5: "#1D4E89"
  genus-1: "#3D7A5B"
  genus-2: "#8A9A2B"
  genus-3: "#7A4E2D"
  genus-4: "#C08A1E"
  paper-dark: "#17181B"
  plate-dark: "#1F2024"
  ink-dark: "#E3E3E5"
  graphite-dark: "#A0A1A7"
  rule-dark: "#303136"
  contour-dark: "#50525A"
  accent-dark: "#E58A94"
  survey-dark: "#8FB8EC"
  hazard-dark: "#F2766B"
  ramp-1-dark: "#1A2A3D"
  ramp-2-dark: "#24476E"
  ramp-3-dark: "#3468A3"
  ramp-4-dark: "#5A8FD0"
  ramp-5-dark: "#8FB8EC"
  genus-1-dark: "#6CBF94"
  genus-2-dark: "#B9C95A"
  genus-3-dark: "#C08A62"
  genus-4-dark: "#E5B84B"
typography:
  display:
    fontFamily: "STIX Two Text Variable, STIX Two Text, Georgia, serif"
    fontSize: "clamp(52px, 7.8vw, 112px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  display-role:
    fontFamily: "STIX Two Text Variable, STIX Two Text, Georgia, serif"
    fontSize: "clamp(20px, 1.9vw, 26px)"
    fontWeight: 400
    lineHeight: 1.35
  headline:
    fontFamily: "STIX Two Text Variable, STIX Two Text, Georgia, serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.012em"
  title:
    fontFamily: "STIX Two Text Variable, STIX Two Text, Georgia, serif"
    fontSize: "27px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  subtitle:
    fontFamily: "STIX Two Text Variable, STIX Two Text, Georgia, serif"
    fontSize: "21px"
    fontWeight: 500
    lineHeight: 1.3
  lead:
    fontFamily: "STIX Two Text Variable, STIX Two Text, Georgia, serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "STIX Two Text Variable, STIX Two Text, Georgia, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  title-block:
    fontFamily: "IBM Plex Sans Condensed, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  caption-small:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  readout:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.3
    fontFeature: "tnum"
  math:
    fontFamily: "STIX Two Math, math"
    fontSize: "1.04em"
rounded:
  hairline: "1px"
  sm: "2px"
spacing:
  phone-gutter: "16px"
  inset: "clamp(16px, 9vw, 152px)"
  main-column: "36.75rem"
  gap: "48px"
  margin-column: "240px"
  section: "88px"
  section-phone: "72px"
components:
  link:
    textColor: "{colors.accent}"
  nav-link:
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
  nav-link-hover:
    textColor: "{colors.ink}"
  theme-toggle:
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    padding: "4px 0"
  plate:
    backgroundColor: "{colors.plate}"
    padding: "20px 20px 16px"
  title-block-cell:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    typography: "{typography.title-block}"
    padding: "8px 12px 10px"
  switch-option:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "3px 8px"
  switch-option-checked:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  margin-note:
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
  surface-readout:
    textColor: "{colors.graphite}"
    typography: "{typography.readout}"
    padding: "3px 6px"
---

# Design System: Angel Eduardo Luna, portfolio

Design record for Angel Eduardo Luna's portfolio site, written from the shipped build. It extends the identity established in the GitHub profile README (`README.md`, `assets/build.py`). Status: built. The home page and the three featured pages were built in October 2026; the background world was replaced in November 2026 by the Loss-Surface Engraving described here. Domain and deployment are pending.

The frontmatter is normative. Where the prose and the frontmatter disagree, the frontmatter wins.

## Overview

**Creative North Star: "The Loss-Surface Engraving"**

The base system is a **technical journal**: text set like a well-typeset paper, numbered figures with captions, formulations in typeset mathematics, and a wide **margin column for plain-language notes** in the manner of Tufte. The main column carries the technical argument; the margin translates it for non-specialists. This is how one page serves both audiences.

The page is printed on warm engraving paper, and the stock is a loss surface. A synthetic surface (a gentle tilt down the page, a Gaussian well beside each section and each featured project, ridges between them, and seeded bumps for structure) is drawn behind everything by its level sets, as hairlines with every fifth level an index contour in ink, in the manner of an engraved survey sheet. One line moves: an optimiser running basin hopping on that same surface, drawn in oxblood up to the reader's position, settling into one basin per section as the page is read. The surface is decorative, and the page says so in the title-screen caption and in the colophon.

Figures and title blocks are white plates mounted on the stock, so no level set runs behind data. One element is borrowed from **engineering drawing and survey plates**: each featured page opens with a small **title block** in the style of a drawing sheet (plus a reduced version in the home-page entries). The drawing-sheet framing is not applied anywhere else. The memorable elements are the surface and the interactive figures; everything set on the stock stays quiet.

**Key Characteristics:**
- Engraving stock with hairline level sets; every fifth level an index contour in ink.
- One oxblood line, the optimiser's path, and the same oxblood for links, hover and focus.
- White plates for figures and title blocks; no level set behind data.
- STIX Two Text in the main column, IBM Plex Sans in the margin, labels and readouts.
- Flat: no shadows, no cards, no gradients other than the mask that quietens the field behind text.
- Motion is computed, not choreographed: the path is the result of an algorithm on the drawn surface.

### Rejected

Earlier rounds:

- **Dark instrument dashboard:** too close to the common generated-portfolio look, tiring for long technical text, and it reads as a product rather than as research.
- **Survey plate applied throughout:** distinctive, but becomes a costume and leaves no room for margin notes. Plates remain reserved for figures and title blocks.
- **Atlas-style home page:** only three projects have a location.

This round (November 2026):

- **Dark neural-net particle portfolio:** the category standard for a machine-learning portfolio (dark ground, node-and-edge particle field, gradient text). Still rejected, for the same reasons as the dashboard.
- **Hinton Plate**, **Explorable Article**, **Colour-Chord Lanes** and **Perceptron Report:** offered as sketches and not chosen. They are not to be revived piecemeal (no Hinton-diagram squares, translucent colour bands or report-cover banding on the current world).
- The previous home-page world (a logarithmic spiral title screen and 96-line envelope figures between sections, with the `line-accent` mauve) is retired, and its scripts are removed.

## Colors

A warm paper with a faint brown grain carrying sepia hairlines (in the dark theme, a charcoal ground with neutral grey ones), a single oxblood voice, and data colours that appear only on plates. Light values are listed first; each has a `-dark` counterpart. The theme follows `prefers-color-scheme`, with a manual toggle stored per visitor (`localStorage`, applied before first paint). Colours are carried over from `assets/build.py` `THEMES` where they existed, so the README and the site match.

### Primary
- **Oxblood** (`accent`; dark: `accent-dark`, a muted rose): the optimiser's path, its head and its settling rings; links and their underlines (at 45% until hover); hover states on headings, plates, the methods matrix, the running head and the sheet navigation; the focus ring; text selection and the caret.

### Secondary
- **Survey blue** (`survey`): the endpoint of the sequential ramp and data highlights, such as the tinted background (9% over `plate`) of the equation matching a highlighted constraint family. It no longer carries links or focus.
- **Sequential ramp** (`ramp-1` to `ramp-5`): sequential data only, on plates.

### Tertiary
- **Hazard** (`hazard`): extreme or adverse values only, on plates; never decorative.
- **Genus** (`genus-1` to `genus-4`): categorical, for the four genera of the reforestation tile (Fig. 2 species).

### Neutral
- **Engraving paper** (`paper`; dark: charcoal graphite, softer than black and neutral to the data colours): the page ground on which the surface is drawn. In the light theme it carries a paper grain (`--paper-grain`: fractal noise tinted brown at about 7%, an inline SVG tile on `body`); the dark theme and print have none.
- **Plate** (`plate`, a warm white; dark: a raised charcoal): plates for figures, data tables, the constraint matrix and title-block cells.
- **Ink** (`ink`, a sepia-black): text, primary marks, and the index contours.
- **Graphite** (`graphite`): margin notes, captions, labels, navigation, the readout and pointer probes.
- **Rule** (`rule`): title-block lines, plate frames, table rules, section dividers.
- **Contour** (`contour`, sepia on paper; neutral grey on charcoal): the hairline level sets; also the scrollbar thumb.

### Named Rules
**The One Oxblood Rule.** Oxblood belongs to the optimiser and to what the reader acts on: the path, links, hover, focus and selection. It never fills an area, never marks data, and never decorates.

**The Plate Rule.** Data colours (`survey`, the ramp, `hazard`, the genera) appear only on plates, where no level set runs behind them. The two reds, `accent` and `hazard`, therefore never compete: one lives on the stock, the other only inside figures.

## Typography

**Display and text font:** STIX Two Text, variable weight (with Georgia)
**Label font:** IBM Plex Sans (with the system sans), tabular figures in tables, legends and readouts
**Title-block font:** IBM Plex Sans Condensed, only inside title blocks
**Mathematics:** STIX Two Math, as native MathML rendered at build time by Temml

**Character:** a typeface drawn for scientific publishing, set at a regular display weight with tight tracking, against a plain technical sans that reads as instrument labelling. STIX Two Text shares its design with STIX Two Math, so text and equations match.

All text fonts are self-hosted as WOFF2 through Fontsource and subset to Latin plus Latin Extended (the Spanish place names need accented letters). The complete STIX Two Math is self-hosted (`public/fonts`): a Latin-only subset sends Greek and operators to fallback fonts, and without the MATH table display operators do not grow. KaTeX cannot use STIX Two Math; MathML replaces the planned MathJax, needs no client script, and screen readers read it as mathematics. Display equations are left-aligned with their number at the right of the main column. `src/lib/mathml.ts` corrects browser layout towards TeX: single-token subscript bases get zero depth, and operators in script positions lose their side spacing. Inline formulas and their trailing punctuation are kept together (`.nowrap`).

### Hierarchy
- **Display** (400, fluid 52–112 px, line-height 1, −0.02em): the name on the home title screen only. On narrow screens (≤ 760 px) 44–64 px. The direction contract asked for a light display weight; the build sets 400, and 400 is the rule.
- **Display role** (400 italic, fluid 20–26 px, 1.35): the role line beneath the name.
- **Headline** (400, 40 px, 1.12, −0.012em): the project title on a featured page; 30 px on phones.
- **Title** (500, 27 px, 1.25): section headings, and featured-entry titles on the home page (27 px, 1.22; 21 px on phones).
- **Subtitle** (500, 21 px, 1.3): subsection headings in running prose.
- **Lead** (400, 21 px, 1.5): the home summary and each project's abstract; 19 px on phones.
- **Body** (400, 18 px, 1.6; 17 px on phones): running text. Measure 62–68 characters; the main column is 36.75 rem, about 66 characters.
- **Label** (Plex Sans 400, 14 px, 1.45): margin notes, captions, navigation, table text, links' secondary notes.
- **Small caption** (Plex Sans 400, 13 px, 1.5): the title-screen caption and figure hints.
- **Readout** (Plex Sans 400, 12 px, 1.3, tabular): the optimiser readout (`step n   f = −x.xxx`), with a true minus sign.

### Named Rules
**The Sentence-Case Rule.** Headings are in sentence case. No all-caps labels, no tracked-out eyebrow text above headings, and no single accented word in a headline.

**The Two-Voice Rule.** Serif carries the argument; Plex carries everything that labels, annotates or measures. Plex Condensed is used inside title blocks and nowhere else.

## Layout

- **Desktop (≥ 1100 px):** main column 36.75 rem, a 48 px gutter, then a 240 px margin column. The block is left-aligned on the page with a fluid left inset (`clamp(16px, 9vw, 152px)`); it is not centred. Everything to the right of the margin column belongs to the surface, where the basins sit and the path runs.
- **Below 1100 px:** margin notes become inline notes beneath their paragraph, under a 1 px rule, at most 52 characters wide. The running head and the optimiser readout are hidden.
- **Phones (down to 360 px):** single column with a 16 px side gutter and no horizontal scroll. Figures go full width; legends stack below them. The section navigation stays on one row, with the theme switch on a second.
- **Rhythm:** sections are 88 px apart (72 px on phones); the footer stands 112 px below the last section.
- **Alignment:** left-aligned everywhere. Body text is ragged right, not justified, because justified text at this measure creates rivers on the web.

## Elevation & Depth

Flat. Depth comes from two layers only: the stock with its engraved surface, and plates mounted on it. The surface sits behind the page (`z-index: 0`) in a host that covers the whole document; the page sits above it. Behind the text columns the field is quietened to about a third of its strength by a horizontal CSS mask, and it reaches full strength beyond the margin column. Plates are opaque, framed by a 1 px `rule` line, and cast nothing. The running head uses the stock at 92% so the contours do not show through it.

### Named Rules
**The No-Shadow Rule.** No box shadows, no glows, no glass cards. Separation is by plate, rule and the field's mask. One exception, in the dark theme only: the optimiser emits light (its path, head, reached basins and rings glow). On paper a glow could only stain, so there the optimiser is engraved in ink.

**The Mask-Only Gradient Rule.** The only gradient in the system is the mask that quietens the level sets behind text. No gradient fills, no gradient text.

## Shapes

Square. Plates, title blocks, tables and the running head have square corners. A 2 px radius softens the small controls (year and assignment switches) and the highlighted equation band; the focus ring has a 1 px radius. The only round forms belong to the surface and to data: the optimiser's head (a 3.5 px dot in a 9 px ring), settling rings drawn as spreading ellipses, the probes' end dots, and the methods-matrix dots. Lines are hairlines: 0.8 px level sets, 1.25 px index contours, a 2 px path (1.2 px on narrow screens), 1 px rules.

## Components

### The surface (signature)
The page's background, `src/components/Surface.astro` with `src/scripts/surface.ts`, on the home page and the three featured pages (the 404 page has none).

- **Field:** f(x, y) = Σ aᵢ·exp(−|p − cᵢ|² / 2σᵢ²) − y / 1400, in CSS pixels of the document. Each page seeds its own bumps from its path. A WebGL2 fragment shader draws every level at spacing 0.07 as a hairline in `contour` and every fifth as an index contour in `ink`; index contours fall back to hairline strength behind the text. Where levels crowd, they fade out rather than mat. Without WebGL2 the level sets are drawn still by marching squares, redrawn only when the drawn window moves.
- **Path:** basin hopping (Wales and Doye, 1997): heavy-ball gradient descent (step 3600, momentum 0.9, at most 6 px per step) until it settles, then a perturbed restart towards the next basin, drawn as a dotted jump. The first basin is wide and deep so the descent from beside the name falls into it, and it is reached on arrival whatever the scroll. The rest is drawn up to a reading line at 62% of the viewport. On a featured page the path starts right of the text column, so it never crosses margin notes.
- **Glow and marks:** the two themes treat the optimiser as two materials, switched by one token, `--sx-glow` (0 on paper, 1 on charcoal). On charcoal it emits light: the path carries a soft oxblood halo (canvas shadow, 10 px); the head is a glowing point inside a 140 px halo that breathes over 2.8 s; every basin reached keeps a steady 92 px glow; the settling rings glow. On paper it is engraved in ink: the path is a clean 2 px line with no halo; the head is a point inside a hairline ring, a survey benchmark, with a second ring that spreads to 3.2× and fades every 2.8 s; a reached minimum is marked by two tight concentric hairlines (a border and an offset outline), as a summit is on a survey; the settling rings are hairlines.
- **Settling rings:** three oxblood ellipses spread from a basin over 1.8 s as the head arrives, and when a featured entry is pointed at or focused.
- **Writing along the path** (wide screens only, where the free area beside the text holds it): θ₀ at the start; one update rule per descent, in turn `v ← βv − η∇f(θ)`, `θ ← θ + v`, `until ‖v‖ < ε`, `β = 0.9`, set above a shallow stretch or beside a steep one; `θ ← θ* + ξ` beside each restart; and at each minimum reached the value f(θ*) computed on the drawn surface. Each appears, sharpening from a 4 px blur over 700 ms, as the head passes it. On the home page, Algorithm 1 (basin hopping on this page) is set beside the second basin as a paper sets an algorithm: rules above and below, numbered lines, keywords in bold; its basin moves out so the box and the path keep apart. It is shown only where the free area is at least 330 px wide.
- **Pointer probes:** pointing anywhere (a mouse move, or a tap on touch) starts a short graphite descent from that point; it grows over 0.9 s and fades by 2.6 s. At most six at once, spaced by at least 90 px and 240 ms.
- **Readout:** bottom right, desktop only: the head's step number and the value of f at it.
- **Theme:** colours are read from the CSS tokens and re-read on any theme change.

### Title block (featured pages)

```
┌───────────────────────────┬────────────────┬───────────────┬──────────┐
│ Optimización de recursos  │ Casa Monarca   │ 25.68° N      │ Sheet 3  │
│ Food purchasing under a   │ Santa Catarina │ 100.46° W     │ of 3     │
│ fixed budget              │ Nuevo León     │               │ 2026     │
└───────────────────────────┴────────────────┴───────────────┴──────────┘
```

- Cells: project, partner and place, coordinates, sheet number and year. Cells are `plate` white on a `rule` ground, so 1 px gaps draw the dividers; text is Plex Sans Condensed at 14 px, labels at 12 px in `graphite`.
- "Sheet n of 3" is real sequence information: there are three featured pages, in a fixed order, and the next/previous navigation at the foot of each page follows the same order.
- **Coordinates are computed from project data where it exists:** GeoStats is the mean of the 379,294 geocoded records (25.71° N, 100.31° W); RefInit is the centroid of the polygon points in `data/processed/mapa.csv`, UTM 14N (23.46° N, 101.34° W). Casa Monarca uses the Santa Catarina municipal seat (25.67° N, 100.46° W) and must be confirmed before publishing.
- The second cell's label can change where the project has no partner: GeoStats reads "Context and place" (Semana de la Movilidad).
- On phones the four cells stack two by two.

### Figures
- Numbered "Fig. n" per page, each on a plate (`plate` white, 1 px `rule` frame, 20 px padding) with a caption in Plex Sans at 14 px that states the source, the unit and anything illustrative. The README's honesty rules carry over: Fig. 2 is illustrative, and Fig. 3's recipe block is schematic.
- Every figure has a static SVG fallback and alt text. The interactive layer is progressive enhancement: the page reads correctly without JavaScript.
- Switches (years, assignment) are native radio buttons styled as small square-cornered options; the checked option is `ink` with `paper` text, and focus draws the oxblood ring.

### Margin notes
- Plain-language restatements of the adjacent formal content, one idea each, at most about 40 words, in Plex Sans 14 px `graphite`.
- Example: next to `μᵢₜ = μᵢ,ₜ₋₁ + xᵢₜ + δᵢₜ − γᵢₜ`, the note reads "Stock at the end of today equals yesterday's stock, plus purchases and donations, minus what was cooked."

### Featured entries (home page)
- Each entry leads with its project page's own Fig. 1 in compact form, large in the main column on a plate sized to the figure's proportions, with the reduced title block beside it in the margin column and the text beneath. Entries are divided by 1 px rules; they are not cards. The whole entry is the link.
- Pointing at or focusing an entry turns the plate frame and the title's underline oxblood, rings the entry's basin on the surface, and previews the figure's interaction: the hex map steps through 2019–2024, the planting tile switches from random to competition-aware, the constraint matrix steps through its families. No preview under reduced motion. On phones the tile preview shows its left part at a legible size.
- The entry title carries a view-transition name and travels into the project page's title.

### Further-work table
Columns: project, one-line description, Report (PDF), Repository. Report cells are empty (not "N/A") when no report exists. Rows are not cards.

### Navigation
- **Home title screen:** section links (Selected work, Methods, Further work, Contact) and the theme switch along the top, Plex 14 px `graphite`, `ink` on hover, no underline.
- **Featured page bar:** the name in `ink` 500 at left; Selected work and the theme switch at right.
- **Theme switch:** a text button ("Dark theme" / "Light theme") underlined in `rule`.
- **Running head** (desktop only): in the margin column, once the opening of the page has scrolled away: the page's name and the section being read, on the stock at 92% over a 1 px `rule` line. It steps aside while a full-width table passes under it.
- **Sheet navigation:** previous and next featured pages at the foot, labelled "Sheet n of 3, previous/next".

### Motion
- **Grammar:** exponential ease-out (`cubic-bezier(.16,1,.3,1)`) for everything that arrives; a quick ease-in (`cubic-bezier(.4,0,1,1)`) for what leaves.
- **Engraving reveal, once per visit:** the contours spread from the path's start point over about 1.5 s; later pages in the same session open on a finished surface.
- **Title settle, once:** the name, role and affiliation sharpen from a slight blur (1.1 s, staggered 140 and 240 ms); on featured pages the abstract settles under the arriving title.
- **Breathing:** the surface ripples slowly, at 15 fps, only while the tab is visible, and holds still while the page is being scrolled.
- **Scroll-driven descent:** the path follows the reading position and rings each basin it reaches.
- **Cross-document view transitions:** the old page fades and blurs out in 220 ms; the new page rises in over 520 ms. The project title travels between a home entry and its page; the old text leaves in 150 ms and the new one is never scaled, so it never reads twice.
- **Everything else answers the visitor:** switching the lattice assignment cross-fades over 200 ms; switching the hex-map year cross-fades the fills; hover transitions run 160–240 ms.
- **Rendering budget:** scrolling never redraws the surface. Its canvases cover a window of the document twice the viewport height and are scrolled by the browser natively; they are redrawn only when the viewport nears the window's edge. The field renders at no more than 1.25× pixel density and the path at 1.5×; the shader receives at most 48 Gaussians per draw, culled to the window. The path is drawn incrementally, never cleared while it advances. Glows, rings and labels are DOM elements animated by CSS on the compositor; pointer probes live on a small canvas fixed to the viewport. The field is quietened by a CSS mask, not a per-frame compositing pass; home entries use `content-visibility: auto`. Measured on an Apple M4 in Chrome: 60 fps while scrolling, with the CPU throttled four times as well.
- **Reduced motion:** the surface renders still and complete, with the path drawn to the reading position; no reveal, ripple, rings, probes or entry previews; view transitions and CSS transitions are off.

## Do's and Don'ts

### Do:
- **Do** keep the surface behind every page that has sections, seeded from the page's path, and keep its caption or colophon saying that it is decorative and what it is.
- **Do** mount every figure, data table and title block on a `plate` with a 1 px `rule` frame, so no level set runs behind data.
- **Do** compute whatever moves on the surface from the surface itself: the path, the rings and the probes are descents on the drawn f.
- **Do** use oxblood for the path, links, hover, focus and selection, and for nothing else.
- **Do** keep the main column at about 66 characters, the 48 px gutter and the 240 px margin column, left-aligned.
- **Do** set headings in sentence case, labels in Plex, title blocks in Plex Condensed.

### Don't:
- **Don't** use shadows, glows, glass cards or gradient fills; the field's mask is the only gradient. The optimiser's glow in the dark theme is the one exception.
- **Don't** let oxblood mark data or fill an area, or let `hazard` leave the plates.
- **Don't** add a second moving line, particles, or node-and-edge networks to the surface.
- **Don't** add tracked-out eyebrow labels, all-caps labels, or a single accented word in a headline.
- **Don't** apply the drawing-sheet framing beyond title blocks.
- **Don't** animate anything on load beyond the engraving reveal, the descent into the first basin and the title settle.

## Purpose and audience

- **Audience:** general. Graduate admissions and research groups, and industry hiring in analytics, operations research and quantitative roles. Every featured page must work for a technical reader and a non-specialist at once.
- **Primary job:** show that the models are real. They are formulated, implemented, and used for a decision by an actual partner (CONAFOR, Casa Monarca, the Monterrey metropolitan area).
- **Language:** English only. Source material in the repositories is largely Spanish; translate it, do not mix languages on a page.

## Voice

- Formal, authoritative and technical. Impersonal declarative sentences, no casual first-person enthusiasm, no emoji, no marketing adjectives.
- British spelling ("modelling", "optimisation").
- Every fact comes from the repositories (`gh repo list Lunaaaalj`, each README, report and dependency file). Do not invent skills, metrics, results, partners or testimonials. If something is not in a source, it does not go on the page.
- Copy names things by what they are: "Report (PDF)", "Repository", "Live application", never "Check it out" or "Learn more".

## Information architecture

```
/                         Home: title screen, summary, featured projects, methods, further work, contact
/geostats                 Featured project page
/reforestation            Featured project page (Stochastic_RefInit)
/casa-monarca             Featured project page (Optimizacion-de-recursos)
```

There are two tiers, and the difference is deliberate:

| Tier | Projects | Treatment |
|---|---|---|
| **Featured** | GeoStats, Stochastic_RefInit, Optimización de recursos | A full page with an interactive figure, formulation, method, results and links |
| **Further work** | random_walk_simulator (GBM), NeuralNetworksTeamEnvironment (CNN), MSED, snake_game, cvector, others as chosen | A single row on the home page: name, one-line description, Report (PDF) where one exists, Repository |

Further-work entries have no pages of their own. A row links straight to its PDF and repository.

## Pages

### Home

```
Angel Eduardo Luna                         (title screen over the surface)
Applied mathematics and data science
Tecnológico de Monterrey
Caption: what the surface and the line are

Two- or three-sentence summary.

[hex-map plate]        GeoStats
                       Where traffic risk concentrates in Monterrey.
[lattice plate]        Stochastic_RefInit
                       Reforestation planning under survival uncertainty.
[sparsity plate]       Casa Monarca
                       Food purchasing for a migrant shelter.

Methods by project      (the matrix from the README)

Further work            (table)

Contact                 LinkedIn, lunaleija@outlook.com, colophon
```

The title screen is full height: the name at left, the first basin to its right, where the path settles on arrival; the caption at the foot names the surface and the algorithm. Each section and each featured entry has its own basin.

### Featured project page

1. Title block
2. Title and abstract (2–3 sentences)
3. Fig. 1: the interactive figure
4. **Problem.** What decision is being made, by whom, under which constraints
5. **Formulation.** Sets, variables, objective, constraints in MathML, each with a margin note
6. **Method.** Solver or estimator, and how it is validated
7. **Results.** Only results stated in the repository or its report
8. **Links.** Repository, live application, Report (PDF)
9. Next/previous project, following sheet order

Each section of the page has a basin, beside the text to the right of the margin column.

### Interactive figures

| Page | Figure | Interaction | Data |
|---|---|---|---|
| GeoStats | Hexagonal map on the project's own 2,241-cell grid | Year selector (native radio buttons) 2019–2024 and the 2027 forecast; pointing at a cell reads its municipality and count; yearly totals in a table beside the map | `scripts/extract-geostats.mjs` from the presentation's `datos.json` → `src/data/geostats.json`. One set of log class breaks for all years |
| Reforestation | One 4 × 13 staggered planting tile, periodic borders, 156 neighbouring pairs | Switch random / competition-aware (radio buttons and CSS; works without JavaScript); competition, its random expectation, the coefficient and same-species pairs update | `scripts/extract-refinit.mjs` → `src/data/refinit.json` (real matrix *W*); composition proportional to the plan; arrangement from a seeded tabu search at build time. Labelled illustrative |
| Casa Monarca | Constraint matrix, 1,092 × 934 | Point at the matrix or choose a constraint family to highlight it and the matching equation; the readout gives exact nonzero counts | Built in `src/lib/casaMonarca.ts` from the formulation and the real recipe table; not schematic |

## Print and sharing

- **Print:** A4, light palette whatever the theme, margin notes as side notes in a 52 mm column, the surface, its readout and on-screen controls removed, the title screen reduced to a title block of text, the addresses of text links printed after them, figures and equations kept whole.
- **Social card:** `public/og.png`, 1200 × 630, rendered from `scripts/og-image.html` by `scripts/og-image.sh` with headless Chrome. It shows the new world still: the name over level sets of a synthetic surface, quietened behind the text, and a heavy-ball descent settling into a basin at right. The PNG carries a `tEXt` provenance chunk (`impeccable:prompt`) stating that it is rendered from code, not generated by an image model. Re-running `scripts/og-image.sh` overwrites the PNG without that chunk, so it must be re-embedded after every render. Its URL becomes absolute once `site` is set in `astro.config.mjs`.

## Accessibility floor

- Text and essential marks meet WCAG AA contrast in both themes.
- Visible focus ring: 2 px in the `accent` colour, offset 2 px (6 px on featured entries).
- Interactive figures can be operated by keyboard. Hex cells are not individually focusable; provide a year selector plus a data-table fallback.
- Every figure has alt text that states its finding, not just its type.
- The surface is `aria-hidden`, takes no pointer events, and never carries information the text does not.
- `prefers-reduced-motion` is respected throughout (Components, Motion).

## Stack and delivery

- **Astro**, static output. Interactive figures are SVG drawn at build time, with small scripts for highlighting; no UI framework. Mathematics is MathML from Temml at build time. The surface is one WebGL2 shader and one 2D canvas, with a 2D fallback.
- **Data:** figures are generated from versioned data by scripts in the repository and never edited by hand. Every fact on the home page lives in `src/data/site.ts`.
- **Hosting:** Vercel, where the other project demos live.
- **Repository:** `Lunaaaalj/portfolio`, separate from the profile repository. Fonts are self-hosted through Fontsource packages.

## Build process

1. Scaffold, tokens, fonts, and the base layout including the margin column.
2. Home page and the Casa Monarca page first (the richest formulation, so it tests the margin-note system). Render screenshots in both themes at 360, 768 and 1280 px, and critique them.
3. The remaining two featured pages and the interactive figures.
4. Further-work table and contact.
5. Review summary before any deployment. Do not deploy or push without approval.

## Open decisions

- [x] Displayed name: "Angel Eduardo Luna". The profile README header ("Eduardo Luna") still needs updating to match.
- [x] CV download: none for now; the site does not reference a CV.
- [ ] Domain: a Vercel subdomain or a custom domain.
- [x] Reports: only NeuralNetworksTeamEnvironment has a written report (`reports/main.pdf`); MSED's PDFs are notebook exports and are not linked. The list of further-work projects stands as it is unless changed.
- [ ] Coordinates: GeoStats and RefInit computed from data (Components, Title block). Casa Monarca's still needs confirming (municipal seat used).
- [x] Featured entries and the methods matrix link to `/geostats`, `/reforestation` and `/casa-monarca`.
- [ ] The RefInit comparison with the exact integer program is pending in its report; the page says so. Update the page when the bound and gap are reported.
- [x] Social card: regenerated from the Loss-Surface Engraving, with its provenance chunk embedded. Any re-render with `scripts/og-image.sh` must be followed by re-embedding the chunk.
- [ ] Copy: the title-screen caption and the colophon call the path "the dark red line"; in the dark theme it is a muted rose. Decide whether to name it by role rather than colour.
