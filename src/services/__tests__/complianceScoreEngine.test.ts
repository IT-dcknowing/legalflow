/** PEN-024 : tests complianceScoreEngine — pondération par ancienneté. */
import { describe, it, expect } from 'vitest';
import {
  ComplianceScoreEngine,
  poidsRetard,
  joursDeRetard,
} from '../complianceScoreEngine';
import type { Obligation } from '../../types';

function mkOb(partial: Partial<Obligation> & { id: string }): Obligation {
  return {
    titre: partial.id,
    echeanceLabel: '',
    statut: 'a_venir',
    tagLabel: '',
    tagClass: 'avenir',
    domaine: 'fiscal',
    moisGroupe: '',
    jour: '15',
    mois: 'SEPT',
    administration: 'DGI',
    baseLegale: 'CGI',
    ...partial,
  } as Obligation;
}

describe('poidsRetard', () => {
  it('barème par ancienneté', () => {
    expect(poidsRetard(0)).toBe(0.5);
    expect(poidsRetard(4)).toBe(0.75);
    expect(poidsRetard(20)).toBe(1);
    expect(poidsRetard(81)).toBe(1.5);
    expect(poidsRetard(97)).toBe(2);
    expect(poidsRetard(365)).toBe(2);
  });
});

describe('joursDeRetard', () => {
  it('calcule les jours calendaires', () => {
    const ob = mkOb({ id: 'x', echeanceDateIso: '2026-08-20' });
    expect(joursDeRetard(ob, new Date(2026, 8, 4, 12))).toBe(15);
  });

  it('0 si échéance future ou absente', () => {
    expect(joursDeRetard(mkOb({ id: 'x', echeanceDateIso: '2026-09-20' }), new Date(2026, 8, 4, 12))).toBe(0);
    expect(joursDeRetard(mkOb({ id: 'y' }), new Date(2026, 8, 4, 12))).toBe(0);
  });
});

describe('ComplianceScoreEngine.compute', () => {
  it('sans retard : 0 écart, exposition 0', () => {
    const r = ComplianceScoreEngine.compute([
      mkOb({ id: 'a', statut: 'a_venir', domaine: 'fiscal' }),
      mkOb({ id: 'b', statut: 'accomplie', domaine: 'social' }),
      mkOb({ id: 'c', statut: 'imminente', domaine: 'fiscal' }),
    ]);
    expect(r.enRetardCount).toBe(0);
    expect(r.expositionFinanciereFcfa).toBe(0);
    expect(r.scoreGlobal).toBeGreaterThan(80);
  });

  it('1 retard grave (97j) pénalise plus qu’1 retard récent (4j)', () => {
    const grave = ComplianceScoreEngine.compute([
      mkOb({ id: 'g', statut: 'en_retard', domaine: 'fiscal', echeanceDateIso: '2026-05-30' }),
      mkOb({ id: 'ok', statut: 'a_venir', domaine: 'fiscal' }),
    ]);
    const recent = ComplianceScoreEngine.compute([
      mkOb({ id: 'r', statut: 'en_retard', domaine: 'fiscal', echeanceDateIso: '2026-08-31' }),
      mkOb({ id: 'ok', statut: 'a_venir', domaine: 'fiscal' }),
    ]);
    expect(grave.scoreGlobal).toBeLessThan(recent.scoreGlobal);
  });

  it('5 retards graves : score bas mais plancher à 20', () => {
    const obs = [0, 1, 2, 3, 4].map((i) =>
      mkOb({ id: `r${i}`, statut: 'en_retard', domaine: 'fiscal', echeanceDateIso: '2026-05-30' })
    );
    const r = ComplianceScoreEngine.compute(obs);
    expect(r.enRetardCount).toBe(5);
    expect(r.scoreGlobal).toBeGreaterThanOrEqual(20);
  });

  it('exposition = somme des montants saisis uniquement (zéro-calcul)', () => {
    const r = ComplianceScoreEngine.compute([
      mkOb({ id: 'a', statut: 'en_retard', domaine: 'fiscal', penaliteEstimee: 45000 }),
      mkOb({ id: 'b', statut: 'en_retard', domaine: 'social' }),
    ]);
    expect(r.expositionFinanciereFcfa).toBe(45000);
  });
});
