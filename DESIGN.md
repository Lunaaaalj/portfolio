# Portfolio design

Design plan for Angel Eduardo Luna's portfolio site. It extends the identity already established in the GitHub profile README (`README.md`, `assets/build.py`). Status: built — home page and the three featured pages (October 2026); domain and deployment pending.

## 1. Purpose and audience

- **Audience:** general. Graduate admissions and research groups, and industry hiring in analytics, operations research and quantitative roles. Every featured page must work for a technical reader and a non-specialist at once.
- **Primary job:** show that the models are real. They are formulated, implemented, and used for a decision by an actual partner (CONAFOR, Casa Monarca, the Monterrey metropolitan area).
- **Language:** English only. Source material in the repositories is largely Spanish; translate it, do not mix languages on a page.

## 2. Voice

- Formal, authoritative and technical. Impersonal declarative sentences, no casual first-person enthusiasm, no emoji, no marketing adjectives.
- British spelling ("modelling", "optimisation").
- Every fact comes from the repositories (`gh repo list Lunaaaalj`, each README, report and dependency file). Do not invent skills, metrics, results, partners or testimonials. If something is not in a source, it does not go on the page.
- Copy names things by what they are: "Report (PDF)", "Repository", "Live application", never "Check it out" or "Learn more".

## 3. Information architecture

```
/                         Home: title block, abstract, featured projects, further work, contact
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

## 4. Visual direction: journal with margin notes, plus a survey title block

The base system is a **technical journal**: text set like a well-typeset paper, numbered figures with captions, formulations in LaTeX-style maths, and a wide **margin column for plain-language notes** in the manner of Tufte. The main column carries the technical argument; the margin translates it for non-specialists. This is how one page serves both audiences.

One element is borrowed from **engineering drawing and survey plates**: each featured page opens with a small **title block** in the style of a drawing sheet. This is the site's signature and appears only there (plus a reduced version in the home-page entries). The drawing-sheet framing is not applied anywhere else.

The memorable element is the **interactive figures**. Everything around them stays quiet.

### Rejected

- **Dark instrument dashboard:** too close to the common generated-portfolio look, tiring for long technical text, and it reads as a product rather than as research.
- **Survey plate applied throughout:** distinctive, but becomes a costume and leaves no room for margin notes.
- **Atlas-style home page:** only three projects have a location.

## 5. Design tokens

### Colour

Carried over from `assets/build.py` `THEMES`, so the README and the site match.

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#FFFFFF` | `#141B24` | Page background (dark is a deep ink blue, not neutral black) |
| `ink` | `#1B2430` | `#D3DAE3` | Text, primary marks |
| `graphite` | `#5B6675` | `#8B96A5` | Margin notes, captions, secondary labels |
| `rule` | `#C9D1DA` | `#30363D` | Title-block lines, figure frames, table rules |
| `survey` | `#1D4E89` | `#8FB8EC` | Links, focus ring, sequential-ramp endpoint |
| `ramp` | `#DCE6F0 #A9C3DE #6E9CCB #3A6FAE #1D4E89` | `#1A2A3D #24476E #3468A3 #5A8FD0 #8FB8EC` | Sequential data only |
| `hazard` | `#A23B2A` | `#F2766B` | Extreme or adverse values only; never decorative |
| `genus` | `#3D7A5B #8A9A2B #7A4E2D #C08A1E` | `#6CBF94 #B9C95A #C08A62 #E5B84B` | Categorical (Fig. 2 species) |
| `line-accent` | `#6E5A5F` | `#B39CA1` | Muted mauve, from the line-art reference. Generative line figures only (§6 Envelope figures) |

The theme follows `prefers-color-scheme`, with a manual toggle stored per visitor.

### Type

| Role | Typeface | Notes |
|---|---|---|
| Text, headings | **STIX Two Text** (variable weight) | Drawn for scientific publishing; shares its design with STIX Two Math, so text and equations match. |
| Margin notes, captions, labels, navigation | **IBM Plex Sans** | Tabular figures (`font-variant-numeric: tabular-nums`) in tables and legends |
| Title block | **IBM Plex Sans Condensed** | Only inside title blocks |
| Mathematics | **STIX Two Math**, as native MathML rendered at build time by Temml | KaTeX cannot use STIX Two Math. MathML replaces the planned MathJax: no client script, and screen readers read it as mathematics. Display equations are left-aligned with their number at the right of the main column. |

All fonts are self-hosted as WOFF2 and subset to Latin plus Latin Extended (the Spanish place names need accented letters).

**Scale** (traditional typographic scale, per Bringhurst), in px:

| Size | Use |
|---|---|
| 52–112 (fluid) | Name on the home title screen |
| 36 | Project title |
| 24 | Section heading |
| 21 | Subsection heading |
| 18 | Body text. Line-height 1.6 (a serif needs slightly more than a sans) |
| 14 | Margin notes, captions, labels, title block. Line-height 1.45 |

**Rules:**
- Measure: 62–68 characters in the main column.
- Headings in sentence case. No all-caps labels, no tracked-out eyebrow text above headings.
- No single accented word in a headline.

### Layout

- **Desktop (≥ 1100 px):** main column 640 px, a 48 px gutter, then a 240 px margin column. The block is left-aligned on the page with a generous left margin; it is not centred.
- **Below 1100 px:** margin notes become inline notes that can be expanded, marked with a small numbered reference.
- **Phones (down to 360 px):** single column with a 16 px side gutter and no horizontal scroll. Figures go full width; legends stack below them.
- **Alignment:** left-aligned everywhere. Body text is ragged right, not justified, because justified text at this measure creates rivers on the web.

## 6. Components

### Title block (featured pages)

```
┌───────────────────────────┬────────────────┬───────────────┬──────────┐
│ Optimización de recursos  │ Casa Monarca   │ 25.68° N      │ Sheet 3  │
│ Food purchasing under a   │ Santa Catarina │ 100.46° W     │ of 3     │
│ fixed budget              │ Nuevo León     │               │ 2026     │
└───────────────────────────┴────────────────┴───────────────┴──────────┘
```

- Cells: project, partner and place, coordinates, sheet number and year. The 1 px rules use the `rule` token; text is Plex Sans Condensed at 14 px.
- "Sheet n of 3" is real sequence information: there are three featured pages, in a fixed order, and the next/previous navigation at the foot of each page follows the same order.
- **Coordinates are computed from project data where it exists:** GeoStats is the mean of the 379,294 geocoded records (25.71° N, 100.31° W); RefInit is the centroid of the polygon points in `data/processed/mapa.csv`, UTM 14N (23.46° N, 101.34° W). Casa Monarca uses the Santa Catarina municipal seat (25.67° N, 100.46° W) and must be confirmed before publishing.
- The second cell's label can change where the project has no partner: GeoStats reads “Context and place” (Semana de la Movilidad).
- On phones the four cells stack two by two.

### Figures

- Numbered "Fig. n" per page, each with a caption in Plex Sans at 14 px that states the source, the unit and anything illustrative. The README's honesty rules carry over: Fig. 2 is illustrative, and Fig. 3's recipe block is schematic.
- Every figure has a static SVG fallback and alt text. The interactive layer is progressive enhancement: the page reads correctly without JavaScript.

### Margin notes

- Plain-language restatements of the adjacent formal content, one idea each, at most about 40 words.
- Example: next to `μᵢₜ = μᵢ,ₜ₋₁ + xᵢₜ + δᵢₜ − γᵢₜ`, the note reads "Stock at the end of today equals yesterday's stock, plus purchases and donations, minus what was cooked."

### Further-work table

Columns: project, one-line description, Report (PDF), Repository. Report cells are empty (not "N/A") when no report exists. Rows are not cards.

### Envelope figures (home page)

The home page's signature. Every figure is made only of straight lines, and the curve appears as their envelope, so the decoration is itself a piece of mathematics.

- **Title screen:** a logarithmic spiral *r* = *a*e^(*bθ*) through 150 tangent segments per arm, on two arms (the second at 42% strength). Segments are 3.2 × the radius long and taper to transparent at both tips. The caption beneath the title states what it is.
- **Sections:** one family of 96 straight lines, treated as decoration in the same way as the title spiral, never as an exhibit: no frame, no caption, no plate. Each section has a construction; while a section is read the lines hold it, and between section centres every line travels, index by index, to its place in the next construction, so the decoration is one drawing that turns into the next. It sits on a fixed canvas larger than the free space to the right of the margin column, so the window crops it; every line runs past its construction points and tapers to nothing at both tips, and the field dissolves before it reaches the margin column. The contact section's colophon names the constructions and says that they are decorative.

| Section | Construction | Scroll changes |
|---|---|---|
| Summary | Astroid (sliding ladder, four quadrants) | Ladder length |
| Selected work | Parabola (string art between two arms) | Angle between the arms |
| Methods | Chords *k* → *m·k* on a circle | *m* from 2 (cardioid) to 3 (nephroid) |
| Further work | Chords *k* → −2*k* (deltoid) | Rotation |
| Contact | Circle from its tangents | Rotation |

- Colours: the section figures use the title spiral's palette (`ink`, `graphite`, `line-accent`, `rule`, `survey`) at lower alpha; each line keeps its colour through the morph.
- Section figures are drawn only when at least 160 px of free space remains beside the margin column; the title spiral moves above the name on phones.

## 7. Pages

### Home

```
Angel Eduardo Luna
Applied mathematics and data science
Tecnológico de Monterrey

Two- or three-sentence abstract.

[hex-map thumbnail]    GeoStats
                       Where traffic risk concentrates in Monterrey.
[lattice thumbnail]    Stochastic_RefInit
                       Reforestation planning under survival uncertainty.
[sparsity thumbnail]   Casa Monarca
                       Food purchasing for a migrant shelter.

Methods by project      (the matrix from the README)

Further work            (table)

Contact                 LinkedIn, lunaleija@outlook.com
```

Each entry leads with its project page's own Fig. 1 in compact form, large in the main column on a plate sized to the figure's proportions, with the reduced title block beside it in the margin column and the text beneath. The whole entry is the link. Pointing at or focusing an entry previews the figure's interaction: the hex map steps through 2019–2024, the planting tile switches from random to competition-aware, the constraint matrix steps through its families. On phones the tile preview shows its left part at a legible size.

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

### Interactive figures

| Page | Figure | Interaction | Data |
|---|---|---|---|
| GeoStats | Hexagonal map on the project's own 2,241-cell grid | Year selector (native radio buttons) 2019–2024 and the 2027 forecast; pointing at a cell reads its municipality and count; yearly totals in a table beside the map | `scripts/extract-geostats.mjs` from the presentation's `datos.json` → `src/data/geostats.json`. One set of log class breaks for all years |
| Reforestation | One 4 × 13 staggered planting tile, periodic borders, 156 neighbouring pairs | Switch random / competition-aware (radio buttons and CSS; works without JavaScript); competition, its random expectation, the coefficient and same-species pairs update | `scripts/extract-refinit.mjs` → `src/data/refinit.json` (real matrix *W*); composition proportional to the plan; arrangement from a seeded tabu search at build time. Labelled illustrative |
| Casa Monarca | Constraint matrix, 1,092 × 934 | Point at the matrix or choose a constraint family to highlight it and the matching equation; the readout gives exact nonzero counts | Built in `src/lib/casaMonarca.ts` from the formulation and the real recipe table; not schematic |

## 8. Motion

- **One authored, continuous motion: the home title screen.** A logarithmic spiral is traced by a pen on first load (about 3.6 s) and then flows outward along its tangents; the pointer rotates it and tightens or loosens it; scrolling opens and fades it. It pauses when off screen or when the tab is hidden.
- **Section figures draw once and then move only with scroll** (§6 Envelope figures). Nothing else moves on load.
- Everything else answers the visitor: switching the lattice assignment cross-fades over 200 ms; switching the hex-map year cross-fades the fills; the home entries preview their figure only while pointed at or focused, and not at all under reduced motion.
- A running head in the margin column (desktop only) appears once the opening of the page has scrolled away: the page's name and the section being read. It steps aside while a full-width table passes under it.

### Print and sharing

- **Print:** A4, light palette whatever the theme, margin notes as side notes in a 52 mm column, canvases and on-screen controls removed, the addresses of text links printed after them, figures and equations kept whole.
- **Social card:** `public/og.png`, 1200 × 630, rendered from `scripts/og-image.html` by `scripts/og-image.sh`. Its URL becomes absolute once `site` is set in `astro.config.mjs`.
- Respect `prefers-reduced-motion`: the spiral and the section figures render as still, complete drawings, and changes become instant.

## 9. Accessibility floor

- Text and essential marks meet WCAG AA contrast in both themes.
- Visible focus ring: 2 px in the `survey` colour, offset 2 px.
- Interactive figures can be operated by keyboard. Hex cells are not individually focusable; provide a year selector plus a data-table fallback.
- Every figure has alt text that states its finding, not just its type.

## 10. Stack and delivery

- **Astro**, static output. Interactive figures are SVG drawn at build time, with small scripts for highlighting; no UI framework. Mathematics is MathML from Temml at build time.
- **Data:** figures are generated from versioned data by scripts in the repository and never edited by hand.
- **Hosting:** Vercel, where the other project demos live.
- **Repository:** `Lunaaaalj/portfolio`, separate from the profile repository. Fonts are self-hosted through Fontsource packages.
- **Data:** every fact on the home page lives in `src/data/site.ts`.

## 11. Build process

1. Scaffold, tokens, fonts, and the base layout including the margin column.
2. Home page and the Casa Monarca page first (the richest formulation, so it tests the margin-note system). Render screenshots in both themes at 360, 768 and 1280 px, and critique them.
3. The remaining two featured pages and the interactive figures.
4. Further-work table and contact.
5. Review summary before any deployment. Do not deploy or push without approval.

## 12. Open decisions

- [x] Displayed name: "Angel Eduardo Luna". The profile README header ("Eduardo Luna") still needs updating to match.
- [x] CV download: none for now; the site does not reference a CV.
- [ ] Domain: a Vercel subdomain or a custom domain.
- [x] Reports: only NeuralNetworksTeamEnvironment has a written report (`reports/main.pdf`); MSED's PDFs are notebook exports and are not linked. The list of further-work projects stands as it is unless changed.
- [ ] Coordinates: GeoStats and RefInit computed from data (§6). Casa Monarca's still needs confirming (municipal seat used).
- [x] Featured entries and the methods matrix link to `/geostats`, `/reforestation` and `/casa-monarca`.
- [ ] The RefInit comparison with the exact integer program is pending in its report; the page says so. Update the page when the bound and gap are reported.
