/** Normalisation + synonymes + détection de thème (PEN-030 LOG-001). Pur, testé. */

export function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(stemFr)
    .filter(Boolean)
    .join(' ');
}

/** Racisation naïve français : pluriels + suffixes courants. */
export function stemFr(word: string): string {
  let w = word;
  const suffixes = [
    'ations',
    'ation',
    'ements',
    'ement',
    'isses',
    'issant',
    'euses',
    'euse',
    'eurs',
    'eur',
    'aux',
    'eaux',
  ];
  for (const s of suffixes) {
    if (w.length > s.length + 3 && w.endsWith(s)) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  if (w.length > 4 && (w.endsWith('s') || w.endsWith('x'))) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

export interface ThemeDef {
  id: string;
  /** Formes naturelles (accents OK) : normalisées des deux côtés avant comparaison. */
  keywords: string[];
}

export const THEMES: ThemeDef[] = [
  {
    id: 'tva',
    keywords: [
      'tva',
      'impot',
      'taxe sur la valeur ajoutée',
      'valeur ajoutée',
      'déclaration mensuelle',
      'crédit tva',
      'déductible',
    ],
  },
  {
    id: 'cnps',
    keywords: [
      'cnps',
      'retraite',
      'prestations familiales',
      'cotisations sociales',
      'cotisation',
      'accident du travail',
      'maladie professionnelle',
      'disa',
      'branche',
    ],
  },
  {
    id: 'cmu',
    keywords: [
      'cmu',
      'couverture maladie',
      'couverture',
      'cnam',
      'assurance maladie',
      'enrôlement',
      'quitus',
    ],
  },
  {
    id: 'cga',
    keywords: [
      'cga',
      'centre de gestion agréé',
      'abattement',
      'réduction',
      'crédit',
      'crédit d’impôt',
      'optimisation',
      'optimisation fiscale',
    ],
  },
  {
    id: 'seuil',
    keywords: [
      'seuil',
      '150',
      '150 000 000',
      'rsi',
      'réel normal',
      'régime',
      'bascule',
      'microentreprise',
    ],
  },
  {
    id: 'fdfp',
    keywords: [
      'fdfp',
      'formation continue',
      'formation professionnelle',
      'formation',
      'apprentissage',
      'taxe d’apprentissage',
      'plan de formation',
      'remboursement',
    ],
  },
  {
    id: 'embauche',
    keywords: [
      'embauche',
      'embaucher',
      'contrat',
      'cdd',
      'cdi',
      'smig',
      'salaire',
      'recrutement',
      'immatriculation',
      'registre employeur',
    ],
  },
  {
    id: 'douane',
    keywords: [
      'douane',
      'douanes',
      'bsc',
      'sydonia',
      'guce',
      'transit',
      'importation',
      'import',
      'exportation',
      'dédouanement',
      'fret',
      'connaissement',
    ],
  },
  {
    id: 'arf',
    keywords: [
      'arf',
      'attestation de régularité',
      'attestation fiscale',
      'attestation',
      'quitus fiscal',
      'régularité',
    ],
  },
];

export interface ThemeMatch {
  theme: string | null;
  score: number;
}

// Formes racinisées dédupliquées par thème (évite de compter 2 fois
// 'impot'/'impots' ou 'douane'/'douanes' pour un seul mot de la question).
const STEM_CACHE = new Map<string, string[]>();

function themeStems(t: ThemeDef): string[] {
  let cached = STEM_CACHE.get(t.id);
  if (!cached) {
    cached = [...new Set(t.keywords.map((k) => normalizeQuery(k)).filter(Boolean))];
    STEM_CACHE.set(t.id, cached);
  }
  return cached;
}

/** Score = formes retrouvées (expressions multi-mots pondérées). Ordre = priorité. */
export function detectTheme(rawQuery: string): ThemeMatch {
  const norm = ` ${normalizeQuery(rawQuery)} `;
  let best: ThemeMatch = { theme: null, score: 0 };
  for (const theme of THEMES) {
    let score = 0;
    for (const stemKw of themeStems(theme)) {
      const padded = ` ${stemKw} `;
      if (norm.includes(padded)) score += stemKw.split(' ').length;
    }
    if (score > best.score) best = { theme: theme.id, score };
  }
  return best;
}
