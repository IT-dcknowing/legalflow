/**
 * Sélecteur unique Échéancier / Dashboard — AMENDEMENT #2 §2 & §3.
 *
 * UN SEUL algorithme, deux vues :
 * - dashboard = top 3 de `enRetard` + compteur total ;
 * - échéancier = liste complète + mois en cours + mois prochain + historique.
 * Tout est calculé depuis `dateReference`, jamais depuis des mois en dur.
 */
import type { Obligation } from '../types';
import { addMonths, diffDays, formatMonthLabel, isSameMonth, parseIsoDate } from './dateReference';

export interface EcheancierGroups {
  enRetard: Obligation[];
  moisEnCours: Obligation[];
  moisProchain: Obligation[];
  historique: Obligation[];
  moisEnCoursLabel: string;
  moisProchainLabel: string;
  totalLate: number;
}

export function isSolde(ob: Obligation): boolean {
  return ob.statut === 'accomplie' || Boolean(ob.quittanceRef);
}

export function echeanceDateOf(ob: Obligation): Date | null {
  const iso = ob.echeanceDateIso || ob.dateIso;
  return iso ? parseIsoDate(iso) : null;
}

/** Jours de retard vs dateReference (0 si à l'heure ou soldé sans date). */
export function joursRetardOf(ob: Obligation, dateReference: Date): number {
  const d = echeanceDateOf(ob);
  if (!d) return 0;
  return Math.max(0, diffDays(d, dateReference));
}

function compareLate(a: Obligation, b: Obligation, dateReference: Date): number {
  const diff = joursRetardOf(b, dateReference) - joursRetardOf(a, dateReference);
  if (diff !== 0) return diff;
  return (a.echeanceDateIso || '').localeCompare(b.echeanceDateIso || '');
}

export function groupObligations(
  obligations: Obligation[],
  dateReference: Date
): EcheancierGroups {
  const enRetard: Obligation[] = [];
  const moisEnCours: Obligation[] = [];
  const moisProchain: Obligation[] = [];
  const historique: Obligation[] = [];

  const nextMonth = addMonths(dateReference, 1);

  for (const ob of obligations) {
    if (isSolde(ob)) {
      historique.push(ob);
      continue;
    }
    const d = echeanceDateOf(ob);
    if (!d) continue;
    if (diffDays(d, dateReference) > 0) {
      enRetard.push(ob);
    } else if (isSameMonth(d, dateReference)) {
      moisEnCours.push(ob);
    } else if (isSameMonth(d, nextMonth)) {
      moisProchain.push(ob);
    }
    // Rien d'autre affiché en vue active (ni passé lointain soldé, ni mois M+2 et au-delà).
  }

  enRetard.sort((a, b) => compareLate(a, b, dateReference));
  const byDate = (a: Obligation, b: Obligation) =>
    (a.echeanceDateIso || '').localeCompare(b.echeanceDateIso || '');
  moisEnCours.sort(byDate);
  moisProchain.sort(byDate);
  historique.sort((a, b) =>
    (b.echeanceDateIso || '').localeCompare(a.echeanceDateIso || '')
  );

  return {
    enRetard,
    moisEnCours,
    moisProchain,
    historique,
    moisEnCoursLabel: formatMonthLabel(dateReference),
    moisProchainLabel: formatMonthLabel(nextMonth),
    totalLate: enRetard.length,
  };
}

/** Vitrine dashboard : les plus sévères d'abord, 3 maximum. */
export function selectAlertesUrgentes(groups: EcheancierGroups, topN = 3): Obligation[] {
  return groups.enRetard.slice(0, topN);
}
