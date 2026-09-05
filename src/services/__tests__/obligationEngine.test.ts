/** PEN-024 : tests obligationEngine — génération roulante, tri, conversion, seuils. */
import { describe, it, expect } from 'vitest';
import {
  ObligationEngine,
  generateThresholdOccurrences,
} from '../obligationEngine';

const KOFFI = {
  secteur: 'BTP',
  secteurActivite: 'BTP / Travaux publics',
  regimeFiscal: 'RSI',
  chiffreAffairesEstime: 300_000_000,
  effectifSalaries: 15,
};

const REF = new Date(2026, 8, 4, 12, 0, 0, 0); // 04 sept. 2026

describe('ObligationEngine.resolve', () => {
  it('génère des occurrences datées relativement à dateReference', () => {
    const out = ObligationEngine.resolve(KOFFI as any, {}, REF);
    expect(out.obligationsActives.length).toBeGreaterThan(10);
    for (const inst of out.obligationsActives) {
      expect(inst.key).toMatch(/^RULE_[A-Z0-9_]+@\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('TVA 20/08 en retard de 15 jours au 04/09', () => {
    const out = ObligationEngine.resolve(KOFFI as any, {}, REF);
    const tva = out.obligationsActives.find((i) => i.key === 'RULE_TVA_MENSUELLE@2026-08-20');
    expect(tva).toBeDefined();
    expect(tva!.statut).toBe('en_retard');
    expect(tva!.joursRetard).toBe(15);
  });

  it('états financiers 30/05 en retard de 97 jours', () => {
    const out = ObligationEngine.resolve(KOFFI as any, {}, REF);
    const ef = out.obligationsActives.find((i) => i.key === 'RULE_DEPOT_ETATS_FINANCIERS@2026-05-30');
    expect(ef?.statut).toBe('en_retard');
    expect(ef?.joursRetard).toBe(97);
  });

  it('13 éléments en retard au 04/09, triés par sévérité décroissante', () => {
    const out = ObligationEngine.resolve(KOFFI as any, {}, REF);
    expect(out.nombreEnRetard).toBe(13);
    const late = out.alertesUrgentes;
    expect(late.length).toBe(13);
    for (let i = 1; i < late.length; i++) {
      expect(late[i - 1].joursRetard).toBeGreaterThanOrEqual(late[i].joursRetard);
    }
  });

  it('aucune règle événementielle dans le pipeline', () => {
    const out = ObligationEngine.resolve(KOFFI as any, {}, REF);
    const ids = out.obligationsActives.map((i) => i.ruleId);
    expect(ids).not.toContain('RULE_CT_DELEGUES_PERSONNEL');
    expect(ids).not.toContain('RULE_CT_CHSCT_SEUIL_50');
    expect(ids).not.toContain('RULE_CNPS_AFFILIATION_EMPLOYEUR');
  });

  it('une quittance pointée sort l’occurrence du retard', () => {
    const out = ObligationEngine.resolve(
      KOFFI as any,
      { 'RULE_TVA_MENSUELLE@2026-08-20': true },
      REF
    );
    expect(out.nombreEnRetard).toBe(12);
    const tva = out.obligationsActives.find((i) => i.key === 'RULE_TVA_MENSUELLE@2026-08-20');
    expect(tva?.statut).toBe('a_jour');
  });

  it('bascule en octobre : sections En retard / Octobre / Novembre', () => {
    const out = ObligationEngine.resolve(KOFFI as any, {}, new Date(2026, 9, 5, 12));
    const mois = new Set(out.obligationsActives.map((i) => i.dateEcheanceIso.slice(0, 7)));
    expect(mois.has('2026-10')).toBe(true);
    expect(mois.has('2026-11')).toBe(true);
    expect(mois.has('2026-08')).toBe(false);
  });
});

describe('ObligationEngine.instanceToObligation', () => {
  it('convertit avec id stable, badge et sanction textuelle (zéro montant)', () => {
    const out = ObligationEngine.resolve(KOFFI as any, {}, REF);
    const tva = out.obligationsActives.find((i) => i.key === 'RULE_TVA_MENSUELLE@2026-08-20')!;
    const ob = ObligationEngine.instanceToObligation(tva, REF);
    expect(ob.id).toBe('RULE_TVA_MENSUELLE@2026-08-20');
    expect(ob.statut).toBe('en_retard');
    expect(ob.tagLabel).toBe('En retard (15j)');
    expect(ob.penalitesDetail).toContain('Art. 1083 CGI');
    expect(ob.montantEstime).toBeUndefined();
    expect(ob.penaliteEstimee).toBeUndefined();
  });

  it('occurrence à ≤ 7 jours → imminente', () => {
    const out = ObligationEngine.resolve(KOFFI as any, {}, new Date(2026, 8, 8, 12));
    const cmu = out.obligationsActives.find((i) => i.key === 'RULE_CMU_COTISATIONS@2026-09-10');
    expect(cmu).toBeDefined();
    const ob = ObligationEngine.instanceToObligation(cmu!, new Date(2026, 8, 8, 12));
    expect(ob.statut).toBe('imminente');
  });
});

describe('generateThresholdOccurrences', () => {
  it('effectif 15 : délégués oui, CHSCT non', () => {
    const occ = generateThresholdOccurrences(15);
    expect(occ.find((o) => o.ruleId === 'RULE_CT_DELEGUES_PERSONNEL')?.atteint).toBe(true);
    expect(occ.find((o) => o.ruleId === 'RULE_CT_CHSCT_SEUIL_50')?.atteint).toBe(false);
  });

  it('effectif 60 : les deux seuils atteints', () => {
    const occ = generateThresholdOccurrences(60);
    expect(occ.every((o) => o.atteint)).toBe(true);
  });

  it('effectif 5 : aucun seuil atteint', () => {
    const occ = generateThresholdOccurrences(5);
    expect(occ.every((o) => !o.atteint)).toBe(true);
  });
});
