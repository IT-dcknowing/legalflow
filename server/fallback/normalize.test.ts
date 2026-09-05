/** PEN-024 + PEN-030 : le matching normalisé trouve le bon thème malgré
 *  reformulations, accents, synonymes et fautes légères. */
import { describe, it, expect } from 'vitest';
import { detectTheme, normalizeQuery } from './normalize';

const CASES: Array<[string, string]> = [
  // TVA (5+)
  ['Comment déclarer ma TVA ?', 'tva'],
  ['taxe sur la valeur ajoutée', 'tva'],
  ['TVA 18% sur mes factures', 'tva'],
  ['déclaration tva mensuelle en retard', 'tva'],
  ['crédit de tva déductible', 'tva'],
  ['en retard sur mes impôts', 'tva'],
  // CNPS (5+)
  ['Quel est le taux CNPS ?', 'cnps'],
  ['cotisations sociales retraite', 'cnps'],
  ['accident du travail chantier', 'cnps'],
  ['prestations familiales 5,75%', 'cnps'],
  ['déclaration des cotisations sociales', 'cnps'],
  // CMU (5+)
  ['je dois payer la cnam', 'cmu'],
  ['couverture maladie universelle', 'cmu'],
  ['enrôlement cmu des salariés', 'cmu'],
  ['quitus cmu pour marché public', 'cmu'],
  ['assurance maladie obligatoire', 'cmu'],
  // CGA (5+)
  ['cga abattement fiscal', 'cga'],
  ['centre de gestion agréé', 'cga'],
  ['abattement sur les bénéfices', 'cga'],
  ['optimisation fiscale légale', 'cga'],
  ['crédit d’impôt apprentissage', 'cga'],
  // Seuils (5+)
  ['seuil rsi dépassé', 'seuil'],
  ['150 millions de chiffre d’affaires', 'seuil'],
  ['bascule vers le réel normal', 'seuil'],
  ['quel régime fiscal choisir', 'seuil'],
  ['microentreprise et rsi', 'seuil'],
  // FDFP (5)
  ['formation fdfp', 'fdfp'],
  ['formation continue des salariés', 'fdfp'],
  ['contrat d’apprentissage', 'fdfp'],
  ['plan de formation annuel', 'fdfp'],
  ['remboursement formation', 'fdfp'],
  // Embauche
  ['embaucher un salarié en cdi', 'embauche'],
  ['contrat de travail et smig', 'embauche'],
  // Douane
  ['importer du matériel via sydonia', 'douane'],
  ['bordereau bsc fret maritime', 'douane'],
  // ARF
  ['attestation de régularité fiscale', 'arf'],
  ['quitus fiscal dgi', 'arf'],
];

describe('detectTheme', () => {
  for (const [question, expected] of CASES) {
    it(`« ${question.slice(0, 40)} » → ${expected}`, () => {
      const r = detectTheme(question);
      expect(r.theme).toBe(expected);
      expect(r.score).toBeGreaterThan(0);
    });
  }

  it('salutation sans thème → null', () => {
    expect(detectTheme('bonjour').theme).toBeNull();
    expect(detectTheme('').theme).toBeNull();
  });

  it('accents et casse ignorés', () => {
    expect(detectTheme('TAXE SUR LA VALEUR AJOUTÉE').theme).toBe('tva');
    expect(normalizeQuery('TÉVÉA')).not.toContain('é');
  });
});
