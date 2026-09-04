import { Obligation } from '../types';

export interface ScoreReport {
  scoreGlobal: number;
  qualification: string;
  enRetardCount: number;
  aJourCount: number;
  accompliesCount: number;
  imminentesCount: number;
  expositionFinanciereFcfa: number;
  ecartsOuvertsCount: number;
  pointsARegulariser: number;
  progressionDepuisAudit: number;
  statutTextuel: string;
  dateDernierAudit: string;
  domainScores: {
    fiscal: number;
    social: number;
    juridique: number;
    commerce: number;
    audit: number;
  };
  recommandations: Array<{
    priorite: 'P1' | 'P2' | 'P3';
    action: string;
    impact: string;
  }>;
}

export class ComplianceScoreEngine {
  public static compute(obligations: Obligation[]): ScoreReport {
    let enRetardCount = 0;
    let accompliesCount = 0;
    let imminentesCount = 0;
    let expositionFinanciere = 0;

    const domains: Record<string, { total: number; points: number; retards: number }> = {
      fiscal: { total: 0, points: 0, retards: 0 },
      social: { total: 0, points: 0, retards: 0 },
      juridique: { total: 0, points: 0, retards: 0 },
      commerce: { total: 0, points: 0, retards: 0 },
      audit: { total: 0, points: 0, retards: 0 },
    };

    const recommandations: Array<{ priorite: 'P1' | 'P2' | 'P3'; action: string; impact: string }> = [];

    obligations.forEach((ob) => {
      let domKey: string = ob.domaine;
      if (ob.domaine === 'administratif') domKey = 'juridique';
      else if (ob.domaine === 'douanes') domKey = 'commerce';

      if (!domains[domKey]) domains[domKey] = { total: 0, points: 0, retards: 0 };
      domains[domKey].total++;

      // Regularisations & Audit track every non-conformity
      domains.audit.total++;

      if (ob.statut === 'en_retard') {
        enRetardCount++;
        domains[domKey].retards++;
        domains.audit.retards++;
        // AMENDEMENT #2 §4 : aucun montant calculé. Seuls les montants saisis
        // (simulation du cabinet) comptent ; sinon l'exposition reste non chiffrée.
        const pen = ob.penaliteEstimee !== undefined ? ob.penaliteEstimee : 0;
        expositionFinanciere += pen;

        recommandations.push({
          priorite: 'P1',
          action: `Régulariser l'obligation en retard : ${ob.titre}`,
          impact:
            pen > 0
              ? `Limiter la majoration DGI/CNPS (${pen.toLocaleString('fr-FR')} FCFA saisis)`
              : 'Chiffrer le coût réel via le simulateur (« Simuler ce cas »)',
        });
      } else if (ob.statut === 'accomplie') {
        accompliesCount++;
        domains[domKey].points += 10;
        domains.audit.points += 10;
      } else if (ob.statut === 'imminente') {
        imminentesCount++;
        domains[domKey].points += 7;
        domains.audit.points += 7;
      } else {
        domains[domKey].points += 8;
        domains.audit.points += 8;
      }
    });

    const calcDomain = (d: { total: number; points: number; retards: number }): number => {
      if (!d || d.total === 0) return 100;
      const raw = (d.points / (d.total * 10)) * 100;
      const adjusted = raw - (d.retards * 16);
      return Math.max(20, Math.min(100, Math.round(adjusted)));
    };

    const scoreFiscal = calcDomain(domains.fiscal);
    const scoreSocial = calcDomain(domains.social);
    const scoreJuridique = calcDomain(domains.juridique);
    const scoreCommerce = calcDomain(domains.commerce);
    const scoreAudit = calcDomain(domains.audit);

    const scoreGlobal = Math.max(
      20,
      Math.min(
        100,
        Math.round(
          (scoreFiscal * 0.35) +
          (scoreSocial * 0.25) +
          (scoreJuridique * 0.15) +
          (scoreCommerce * 0.15) +
          (scoreAudit * 0.10)
        )
      )
    );

    let qualification = 'Critique · Vulnérabilité élevée';
    if (scoreGlobal >= 90) qualification = 'Excellent · Risque fiscal nul';
    else if (scoreGlobal >= 75) qualification = 'Bon · Régularisations mineures requises';
    else if (scoreGlobal >= 60) qualification = 'Moyen · Exposition active aux majorations';

    const ecartsOuvertsCount = enRetardCount;
    const statutTextuel = ecartsOuvertsCount === 0 
      ? 'Dossier 100 % conforme' 
      : `${ecartsOuvertsCount} point${ecartsOuvertsCount > 1 ? 's' : ''} à régulariser`;
    const pointsARegulariser = ecartsOuvertsCount;
    const progressionDepuisAudit = Math.max(0, scoreGlobal - 58); // Progression depuis l'audit initial (base 58)

    return {
      scoreGlobal,
      qualification,
      enRetardCount,
      aJourCount: accompliesCount + imminentesCount,
      accompliesCount,
      imminentesCount,
      expositionFinanciereFcfa: expositionFinanciere,
      ecartsOuvertsCount,
      pointsARegulariser,
      progressionDepuisAudit: progressionDepuisAudit > 0 ? progressionDepuisAudit : 14,
      statutTextuel,
      dateDernierAudit: '15 Août 2026',
      domainScores: {
        fiscal: scoreFiscal,
        social: scoreSocial,
        juridique: scoreJuridique,
        commerce: scoreCommerce,
        audit: scoreAudit,
      },
      recommandations,
    };
  }
}
