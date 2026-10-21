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

export interface Featured {
  title: string;
  repo: string;
  href: string;
  figure: string;
  figureSize: [number, number];
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
    figure: 'geostats',
    figureSize: [465, 320],
    alt: 'Hexagonal density map of central Monterrey; incidents concentrate along a central corridor, with the top-percentile cells in red.',
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
    figure: 'lattice',
    figureSize: [620, 290],
    alt: 'Two staggered planting grids: random species assignment produces 182 same-genus contacts, competition-aware assignment 57. Illustrative.',
    problem: 'Purchase quantities that meet a planting target with probability at least 1 − α within budget, and a species arrangement that minimises competition between neighbours.',
    method: 'Chance-constrained purchasing model; memetic algorithm with tabu search, benchmarked against an exact integer program.',
    cells: [
      { label: 'Partner', value: 'CONAFOR' },
      { label: 'Place', value: 'San Luis Potosí' },
    ],
  },
  {
    title: 'Food purchasing for a migrant shelter',
    repo: 'Optimizacion-de-recursos',
    href: gh('Optimizacion-de-recursos'),
    figure: 'sparsity',
    figureSize: [550, 290],
    alt: 'Sparsity pattern of a mixed-integer program with 1,092 variables and 934 constraints, showing time-staged diagonal blocks.',
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
    { short: 'GeoStats', href: gh('GeoStats'), featured: true },
    { short: 'RefInit', href: gh('Stochastic_RefInit'), featured: true },
    { short: 'Casa Monarca', href: gh('Optimizacion-de-recursos'), featured: true },
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

// `report` stays empty until a PDF is confirmed for that project.
export const further: Further[] = [
  { title: 'Random walk simulator', subject: 'Vectorised Monte Carlo under geometric Brownian motion; VaR and CVaR', repo: 'random_walk_simulator' },
  { title: 'Dataset distillation for image classification', subject: '104-class image classification with distribution-matching dataset distillation', repo: 'NeuralNetworksTeamEnvironment' },
  { title: 'Regression-derived differential equations', subject: 'ODE systems (RK4) for demographic and economic series', repo: 'MSED' },
  { title: 'Snake', subject: 'Terminal game in C with ncurses', repo: 'snake_game' },
  { title: 'cvector', subject: 'Generic dynamic array in C', repo: 'cvector' },
].map((f) => ({ ...f, href: gh(f.repo) })) as (Further & { href: string })[];
