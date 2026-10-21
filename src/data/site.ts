// Every fact on the home page lives here. Sources: the profile README
// (Lunaaaalj/Lunaaaalj) and each project's repository README. Nothing is added
// that is not stated in one of them.

const gh = (repo: string) => `https://github.com/Lunaaaalj/${repo}`;

export const person = {
  name: 'Angel Eduardo Luna',
  role: 'Applied mathematics and data science',
  affiliation: 'Tecnológico de Monterrey',
  email: 'lunaleija@outlook.com',
  linkedin: 'https://www.linkedin.com/in/angel-eduardo-luna-0b69223b8/',
  github: 'https://github.com/Lunaaaalj',
};

export const summary = {
  lead: 'Quantitative modelling for operational decisions under uncertainty: spatial risk, resource allocation and stochastic planning. Undergraduate in Data Science and Mathematics at Tecnológico de Monterrey.',
  plain: 'In plain terms: mathematical models that help an organisation decide where to act, how to spend and how to plan when the outcome is not certain.',
  practice: 'Raw data is immutable; every derived table and figure is regenerated from versioned code. Formulations are specified in LaTeX before implementation and, where tractable, validated against an exact solution. Solvers are written in C++; analysis and modelling in Python.',
  current: 'Chance-constrained optimisation and metaheuristics for reforestation planning; hierarchical Bayesian models for spatial count data; dataset distillation for convolutional networks.',
};

export interface Cell { label: string; value: string; full?: boolean }

export interface Link { label: string; href: string; note?: string }

// Drawing-sheet title block. Coordinates: GeoStats is the mean of the 379,294 geocoded records
// in atus_zmm.parquet; RefInit is the centroid of the polygon points in data/processed/mapa.csv
// (UTM 14N); Casa Monarca is the Santa Catarina municipal seat, pending confirmation.
export interface SheetInfo { partnerLabel?: string; partner: string; place: string[]; coords: [string, string]; year: string }

export interface Featured {
  title: string;
  repo: string;
  href: string;
  page: string;
  sheetInfo: SheetInfo;
  links: Link[];
  figure: string;
  alt: string;
  problem: string;
  method: string;
  cells: Cell[];
}

export const featured: Featured[] = [
  {
    title: 'Traffic risk in metropolitan Monterrey',
    repo: 'GeoStats',
    href: gh('GeoStats'),
    page: '/geostats',
    sheetInfo: { partnerLabel: 'Context and place', partner: 'Semana de la Movilidad', place: ['Monterrey metropolitan area', '18 municipalities'], coords: ['25.71° N', '100.31° W'], year: '2026' },
    links: [
      { label: 'Repository', href: gh('GeoStats') },
      { label: 'Live application', href: 'https://geo-stats-three.vercel.app', note: 'Interactive presentation, 31 slides, in Spanish.' },
      { label: 'Forecast viewer', href: 'https://app-geo-eosin.vercel.app', note: 'The 2027 forecast for each cell, with its uncertainty, in Spanish.' },
      { label: 'Report (PDF)', href: `${gh('GeoStats')}/blob/main/docs/reporte/reporte.pdf`, note: 'Technical report, in Spanish.' },
    ],
    figure: 'geostats',
    alt: 'Hexagonal map of traffic incidents recorded in the Monterrey metropolitan area in 2024; incidents concentrate along a central corridor, with the top 1% of cells in red.',
    problem: 'Where traffic risk concentrates across the 18 municipalities of the Monterrey metropolitan area, who bears its cost, and how predictable it is.',
    method: '2,241-cell hexagonal grid, spatial autocorrelation and a hierarchical model forecasting incidents per cell for 2027.',
    cells: [
      { label: 'Data', value: 'INEGI (ATUS)' },
      { label: 'Period', value: '2019–2024' },
    ],
  },
  {
    title: 'Reforestation planning under uncertainty',
    repo: 'Stochastic_RefInit',
    href: gh('Stochastic_RefInit'),
    page: '/reforestation',
    sheetInfo: { partner: 'CONAFOR', place: ['Dominica–Charcas transmission line', 'San Luis Potosí'], coords: ['23.46° N', '101.34° W'], year: '2026' },
    links: [
      { label: 'Repository', href: gh('Stochastic_RefInit') },
      { label: 'Project site', href: 'https://stochastic-reforestation-initiative.vercel.app' },
      { label: 'Report (PDF)', href: `${gh('Stochastic_RefInit')}/blob/main/reports/e2/main.pdf`, note: 'Second report: purchasing and spatial models, in Spanish.' },
    ],
    figure: 'lattice',
    alt: 'One planting tile of 52 positions on a staggered grid: a random arrangement leaves 22 pairs of same-species neighbours; the competition-aware arrangement leaves none. Illustrative.',
    problem: 'Purchase quantities that meet a planting target with probability at least 1 − α within budget, and a species arrangement that minimises competition between neighbours.',
    method: 'Chance-constrained purchasing model solved by simulation and a multiple-choice knapsack; memetic algorithm with tabu search for the species arrangement.',
    cells: [
      { label: 'Partner', value: 'CONAFOR' },
      { label: 'Place', value: 'San Luis Potosí' },
    ],
  },
  {
    title: 'Food purchasing for a migrant shelter',
    repo: 'Optimizacion-de-recursos',
    href: gh('Optimizacion-de-recursos'),
    page: '/casa-monarca',
    sheetInfo: { partner: 'Casa Monarca', place: ['Santa Catarina', 'Nuevo León'], coords: ['25.67° N', '100.46° W'], year: '2026' },
    links: [
      { label: 'Repository', href: gh('Optimizacion-de-recursos') },
      { label: 'Live application', href: 'https://diseno-de-un-modelo-de-optimizacion-agrusbtims2qhtgdq75k6s.streamlit.app/', note: 'Streamlit interface: edit the budget, costs and menu, then solve.' },
      { label: 'Report (PDF)', href: `${gh('Optimizacion-de-recursos')}/blob/main/reports/consolidated/main.pdf`, note: 'Context, formulation and results, in Spanish.' },
    ],
    figure: 'sparsity',
    alt: 'Constraint matrix of the purchasing model, 1,092 variables by 934 constraints: nearly empty, with diagonal bands for each day and a dense block where recipes link dishes to ingredients.',
    problem: 'Minimum weekly purchasing cost for approximately 100 residents, subject to a fixed budget, commercial lot sizes, scheduled donations and inventory continuity.',
    method: 'Mixed-integer linear program with Big-M menu scheduling and inventory balance, solved with GLPK through Pyomo.',
    cells: [
      { label: 'Partner', value: 'Casa Monarca' },
      { label: 'Place', value: 'Santa Catarina, N.L.' },
      { label: 'With', value: 'R. Galindo, N. Villarreal, I. Kume', full: true },
    ],
  },
];

export const methods = {
  projects: [
    { short: 'GeoStats', href: '/geostats', featured: true },
    { short: 'RefInit', href: '/reforestation', featured: true },
    { short: 'Casa Monarca', href: '/casa-monarca', featured: true },
    { short: 'GBM', href: gh('random_walk_simulator') },
    { short: 'CNN', href: gh('NeuralNetworksTeamEnvironment') },
    { short: 'MSED', href: gh('MSED') },
  ],
  // One row per method; each array lists the column indices that use it.
  rows: [
    { method: 'Hierarchical Bayesian models', uses: [0] },
    { method: 'Spatial statistics', uses: [0] },
    { method: 'Mixed-integer programming', uses: [1, 2] },
    { method: 'Chance constraints', uses: [1] },
    { method: 'Metaheuristics', uses: [1] },
    { method: 'Monte Carlo simulation', uses: [3] },
    { method: 'Differential equations', uses: [5] },
    { method: 'Regression', uses: [0, 5] },
    { method: 'Deep learning', uses: [4] },
  ],
  implementation: ['Python', 'C++', 'Python', 'Python', 'Python', 'Python'],
  libraries: 'PyMC, statsmodels, scikit-learn, SciPy, pandas, GeoPandas, PySAL, Pyomo with GLPK, TensorFlow and Keras, Dear ImGui.',
  tooling: 'uv, CMake, Quarto, LaTeX, Jupyter, Streamlit, Weights & Biases, Neovim.',
};

export interface Further { title: string; subject: string; repo: string; report?: string }

// `report` is set only where the repository holds a written report (checked October 2026);
// notebook exports do not count. random_walk_simulator, MSED, snake_game and cvector have none.
export const further: Further[] = [
  { title: 'Random walk simulator', subject: 'Vectorised Monte Carlo under geometric Brownian motion; VaR and CVaR', repo: 'random_walk_simulator' },
  { title: 'Dataset distillation for image classification', subject: '104-class image classification with distribution-matching dataset distillation', repo: 'NeuralNetworksTeamEnvironment', report: `${gh('NeuralNetworksTeamEnvironment')}/blob/main/reports/main.pdf` },
  { title: 'Regression-derived differential equations', subject: 'ODE systems (RK4) for demographic and economic series', repo: 'MSED' },
  { title: 'Snake', subject: 'Terminal game in C with ncurses', repo: 'snake_game' },
  { title: 'cvector', subject: 'Generic dynamic array in C', repo: 'cvector' },
].map((f) => ({ ...f, href: gh(f.repo) })) as (Further & { href: string })[];
