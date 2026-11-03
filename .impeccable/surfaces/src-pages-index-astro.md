---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/layouts/Project.astro"]
---

# Home and featured pages: Loss-Surface Engraving

Scope: the whole site (home, three featured pages, 404). Mode: Experience. Audience, job and content are unchanged (PRODUCT.md). The user asked for a machine-learning look, more formal and elegant, with interesting backgrounds, made alive with animation and transitions.

## Direction contract

THESIS: The page is engraved on a loss surface. Its level sets are the background, and an optimiser's path is the one moving line: it descends from the name and settles in one basin per section and per featured project as the reader scrolls. Refuses the dark neural-net particle hero, gradient text and glass project cards.

OWN-WORLD: Cool engraving stock (#F4F6F8) or deep slate in dark (#0F151D); hairline contour lines in blue-grey, every fifth an index contour in ink; one oxblood (#8C2F39) for the optimiser path, links and focus, and nothing else; white plates mounted on the stock for figures and title blocks. STIX Two Text set at a light display weight, IBM Plex Sans for labels with tabular numerals. No cards, no shadows, no gradients except the mask that quietens the contours behind text.

STORY: The reader sees a real, computed surface and a real algorithm (basin hopping: gradient descent with momentum, then a perturbed restart) running on it, understands it is decorative and says so, and reads the work in the quiet basins. Pointing anywhere drops a probe that runs downhill. Selecting a project carries its title into its page.

FIRST VIEWPORT: Full-height title screen. Name at left, about 112 px, weight 400, role in italic beneath, affiliation in Plex. Contours engrave outward from the start point beside the name over about 1.4 s, then the oxblood path descends into the first basin at right. Caption at the foot names the surface and the algorithm. Section navigation and the theme switch run along the top.

FORM: Loss-surface engraving, pick card (rank 1 of the second hand); seed: seed:d72a6064f5a04318. Signature interaction: pointer probes running gradient descent from the pointer; scroll-driven descent with a settling ring at each basin; hovering a featured entry rings its basin. Motion grammar: exponential ease-out, engraving reveal once, slow breathing of the surface, cross-document view transitions that morph the project title.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- The social card (`public/og.png`) still shows the logarithmic spiral; regenerate it from the new world.
