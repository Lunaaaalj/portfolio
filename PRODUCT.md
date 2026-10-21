# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro with static output, hosted on Vercel (decided in DESIGN.md §10). Interactive figures are plain TypeScript and SVG islands. KaTeX is rendered at build time.

## Users

Two audiences carry **equal weight**, and neither is allowed to win when they conflict:

- **Graduate admissions and research groups** are judging whether the work is rigorous: a correct formulation, a sound method and honest validation.
- **Industry hiring in analytics, operations research and quantitative roles** is judging whether the work solved a real decision for a real partner.

Both kinds of reader see the same page. Where they conflict, the page serves both at once: the main text carries the technical argument and a plain-language layer explains it alongside. The page must never favour one reader over the other.

## Product Purpose

This is the professional and academic portfolio of Angel Eduardo Luna (applied mathematics and data science, Tecnológico de Monterrey). Its job is to show that the models are real. Each one is formulated, implemented and used to inform a decision for an actual partner. Success means a reader from either audience comes away convinced of that.

## Positioning

The work is applied modelling done with named partners and real data: CONAFOR, Casa Monarca, and traffic-collision data for the Monterrey metropolitan area. Each featured project goes from formulation to implementation to a live tool or report. Coursework-only portfolios cannot honestly claim this.

## Operating Context

- Readers arrive from a link in an application, a CV, LinkedIn or an email, on desktop and on phones.
- The source material lives in the public GitHub repositories under `Lunaaaalj`. It is largely written in Spanish, with LaTeX reports and Jupyter notebooks.
- The site must match the identity of the GitHub profile README (`Lunaaaalj/Lunaaaalj`: `README.md`, `assets/build.py`).

## Capabilities and Constraints

- **Featured projects, each with a full page:**
  - GeoStats ([live app](https://geo-stats-three.vercel.app))
  - Stochastic_RefInit ([live app](https://stochastic-reforestation-initiative.vercel.app))
  - Optimizacion-de-recursos for Casa Monarca ([Streamlit app](https://diseno-de-un-modelo-de-optimizacion-agrusbtims2qhtgdq75k6s.streamlit.app/))
- **Further work:** a one-row listing with links to the report and repository only. Candidates are random_walk_simulator, NeuralNetworksTeamEnvironment, MSED and snake_game, among others.
- **Language:** English only. Spanish source material is translated; the two languages are never mixed on a page.
- **Repository:** `Lunaaaalj/portfolio`.
- **Undecided:**
  - custom domain or Vercel subdomain;
  - the final list of further-work projects, and which of them have a PDF report;
  - verified coordinates and partner wording for each featured project.
- **No CV for now.** The site must not reference or link a CV until this decision changes. A private `CV_SRC` repository exists but is not a published source.

## Brand Commitments

- **Displayed name:** Angel Eduardo Luna. The GitHub README header ("Eduardo Luna") should be updated to match.
- **Voice:** formal, authoritative and technical. Impersonal declarative sentences, with no casual first-person enthusiasm, no emoji and no marketing adjectives.
- **Spelling:** British ("modelling", "optimisation").
- **Labels:** links name what they point to: "Report (PDF)", "Repository", "Live application".
- **Contact:** LinkedIn and lunaleija@outlook.com.

## Evidence on Hand

- Public repositories, READMEs, LaTeX reports and dependency files under `gh repo list Lunaaaalj`.
- Live deployments for the three featured projects (linked above).
- Figure logic and data in the profile repository: `assets/build.py` (lattice, sparsity, themes) and `geostats_hex.json` (pooled across years; re-binning by year needs the ATUS parquet).
- **Absent, and never to be fabricated:** testimonials, endorsements, metrics or results not stated in a repository or report, invented skills, and partners beyond those named in the repositories.

## Product Principles

1. **Every fact is sourced.** If a claim is not in a repository, report or dependency file, it does not go on the site.
2. **One page serves both readers.** Rigour and plain-language explanation sit side by side; neither audience gets a reduced version.
3. **Real decisions over technique.** Each project is framed by the decision it informed and the partner who made it, and the method is presented in service of that decision.
4. **Be honest about illustration.** Figures that are illustrative or schematic say so in their captions.
5. **The work leads.** The models and their figures are the point; everything around them stays quiet.

## Accessibility & Inclusion

WCAG AA in both colour themes. Figures can be operated by keyboard and have static fallbacks, and alt text states each figure's finding. Phones down to 360 px wide are supported, because many readers open the link on a phone.
