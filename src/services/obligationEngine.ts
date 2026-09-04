/**
 * ObligationEngine - Moteur légal de conformité fiscale, sociale et RH
 * Basé strictement sur les textes officiels de Côte d'Ivoire :
 * - Calendrier des obligations fiscales DGI (CGI 2026)
 * - Code de Prévoyance Sociale (Loi 99-477, Ord. 2012-03, e-CNPS)
 * - Code du Travail (Loi 2015-532, Décrets 96-206, 96-207, 2017-210)
 * - SYSCOHADA Révisé (Acte uniforme OHADA)
 * - Loi de Finances & Annexe Fiscale 2026
 *
 * RÈGLE D'OR : Aucun montant en FCFA calculé arbitrairement.
 * Textes exacts des sanctions et références légales uniquement.
 *
 * AMENDEMENT #2 : les échéances sont générées EN ROULANT relativement à
 * `dateReference` (horloge unique). Aucune date codée en dur dans l'algorithme.
 */
import {
  diffDays,
  formatDateLong,
  formatMonthLabel,
  getDateReference,
  parseIsoDate,
  pillForDate,
  toIsoDate,
} from './dateReference';

export interface CompanyProfile {
  id?: string;
  nom?: string;
  raisonSociale?: string;
  formeJuridique?: string;
  secteur: string;
  secteurActivite?: string;
  regimeFiscal: string; // 'RSI' | 'RNI' | 'RME' | 'TEE' | string
  chiffreAffairesEstime: number;
  effectifSalaries: number;
  effectif?: string;
  adhesionCga?: boolean;
  adherentCGA?: string;
  numeroCC?: string;
  ncc?: string;
  rccm?: string;
  numeroCnps?: string;
  centreImpots?: string;
  profilComplet?: boolean;
}

export type ObligationDomain = 'fiscal' | 'social' | 'rh_droit_travail' | 'comptable';

export interface Rule {
  id: string;
  domaine: ObligationDomain;
  label: string;
  baseLegale: string;
  conditions: string;
  echeance: string;
  majorationTexte: string;
  teleservice: string;
  source: string;
  periodicite: 'mensuelle' | 'trimestrielle' | 'annuelle' | 'evenementielle';
  jourDuMois?: number;
  moisEcheance?: number; // 1-12 si annuel
  trimestreMois?: number[]; // mois d'échéance si trimestrielle (ex. [4, 6, 9])
  regimesApplicables?: string[]; // ['RSI', 'RNI', 'RME', 'TEE', 'TOUS']
  secteursApplicables?: string[]; // ['BTP', 'TOUS', ...]
  minEffectif?: number;
  maxEffectif?: number;
  minCa?: number;
  maxCa?: number;
}

export interface ObligationInstance {
  key: string; // identifiant stable d'occurrence : `${ruleId}@${dateIso}`
  ruleId: string;
  label: string;
  domaine: ObligationDomain;
  baseLegale: string;
  dateEcheance: string; // "20 août 2026", etc.
  dateEcheanceIso: string; // "2026-08-20"
  statut: 'en_retard' | 'a_jour' | 'a_venir';
  joursRetard: number; // > 0 si dépassée et non à jour
  majorationTexte: string;
  teleservice: string;
  periodicite: string;
  description?: string;
}

export interface EngineOutput {
  obligationsActives: ObligationInstance[];
  scoreConformite: number; // Ratio (nombreAJour / total) * 100
  nombreObligationsTotal: number;
  nombreAJour: number;
  nombreEnRetard: number;
  prochaineEcheance: ObligationInstance | null;
  alertesUrgentes: ObligationInstance[];
}

/**
 * Helpers de génération roulante — AMENDEMENT #2 : aucune date codée en dur,
 * toutes les occurrences sont calculées relativement à `dateReference`.
 */

/** Nombre de jours dans un mois (clamp : jour 31 → février, mois courts…). */
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function monthlyDate(year: number, monthIndex: number, jour: number): Date {
  return new Date(year, monthIndex, Math.min(jour, daysInMonth(year, monthIndex)), 12, 0, 0, 0);
}

/** Dernière occurrence mensuelle échue (≤ ref) + les 2 prochaines (mois en cours et mois prochain). */
function monthlyTriple(jour: number, ref: Date): { past: Date; next: Date; following: Date } {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const candidate = monthlyDate(y, m, jour);
  const shift = (baseY: number, baseM: number, delta: number): Date => {
    const total = baseY * 12 + baseM + delta;
    const yy = Math.floor(total / 12);
    const mm = total % 12;
    return monthlyDate(yy, mm, jour);
  };
  if (candidate.getTime() <= ref.getTime()) {
    return { past: candidate, next: shift(y, m, 1), following: shift(y, m, 2) };
  }
  return { past: shift(y, m, -1), next: candidate, following: shift(y, m, 1) };
}

/** Dernière occurrence périodique échue + prochaine (trimestrielle, listes de mois). */
function periodicPair(months: number[], jour: number, ref: Date): { past: Date; next: Date } {
  const y = ref.getFullYear();
  const cands: Date[] = [];
  for (const yy of [y - 1, y, y + 1]) {
    for (const mo of months) cands.push(monthlyDate(yy, mo - 1, jour));
  }
  cands.sort((a, b) => a.getTime() - b.getTime());
  let past = cands[0];
  let next = cands[cands.length - 1];
  for (const c of cands) {
    if (c.getTime() <= ref.getTime()) past = c;
    else {
      next = c;
      break;
    }
  }
  return { past, next };
}

function emitOccurrence(
  instances: ObligationInstance[],
  rule: Rule,
  echeanceDate: Date,
  refDate: Date,
  pointedMap: Record<string, boolean>
): void {
  const dateIso = toIsoDate(echeanceDate);
  const key = `${rule.id}@${dateIso}`;
  const lag = diffDays(echeanceDate, refDate);
  const isPointed = pointedMap[key] === true;
  let statut: 'en_retard' | 'a_jour' | 'a_venir';
  let joursRetard = 0;
  if (isPointed) {
    statut = 'a_jour';
  } else if (lag > 0) {
    statut = 'en_retard';
    joursRetard = lag;
  } else {
    statut = 'a_venir';
  }
  instances.push({
    key,
    ruleId: rule.id,
    label: rule.label,
    domaine: rule.domaine,
    baseLegale: rule.baseLegale,
    dateEcheance: formatDateLong(echeanceDate),
    dateEcheanceIso: dateIso,
    statut,
    joursRetard,
    majorationTexte: rule.majorationTexte,
    teleservice: rule.teleservice,
    periodicite: rule.echeance,
    description: rule.conditions,
  });
}

/**
 * Catalogue exhaustif des règles réglementaires issues des extractions officielles
 */
export const LEGAL_RULES: Rule[] = [
  // ==================== 1. FISCAL (DGI / CGI 2026 / Annexe 2026) ====================
  {
    id: 'RULE_TVA_MENSUELLE',
    domaine: 'fiscal',
    label: 'Déclaration & Paiement TVA',
    baseLegale: 'Articles 339 et suivants du CGI',
    conditions: 'Contribuables assujettis au régime réel (RSI et RNI)',
    echeance: '20 de chaque mois (RSI/RNI)',
    majorationTexte: 'Majoration de 10% sur les droits dus + 1% d’intérêt de retard par mois (Art. 1083 CGI)',
    teleservice: 'e-impots.gouv.ci (DGI CI)',
    source: 'CALENDRIER DES OBLIGATIONS FISCALES.txt, O41 / IMPOTS ET TAXES.txt, IT_22',
    periodicite: 'mensuelle',
    jourDuMois: 20,
    regimesApplicables: ['RSI', 'RNI'],
  },
  {
    id: 'RULE_ITS_SALAIRES',
    domaine: 'fiscal',
    label: 'Déclaration & Versement ITS (Retenue sur salaires)',
    baseLegale: 'Articles 115 et suivants du CGI',
    conditions: 'Tout employeur versant des rémunérations à des salariés',
    echeance: '15 du mois suivant',
    majorationTexte: 'Intérêts moratoires et majoration pour défaut de retenue ou versement tardif (Art. 1083 CGI)',
    teleservice: 'e-impots.gouv.ci (DGI CI)',
    source: 'CALENDRIER DES OBLIGATIONS FISCALES.txt, O14 / IMPOTS ET TAXES.txt, IT_13',
    periodicite: 'mensuelle',
    jourDuMois: 15,
    minEffectif: 1,
    regimesApplicables: ['TOUS'],
  },
  {
    id: 'RULE_CONTRIBUTIONS_EMPLOYEURS',
    domaine: 'fiscal',
    label: 'Contributions Employeurs (CE, CN, Apprentissage, FDFP)',
    baseLegale: 'Articles 134 à 146 du CGI (Art. 138 pour cas particuliers)',
    conditions: 'Tout employeur installé en Côte d’Ivoire',
    echeance: '15 du mois suivant',
    majorationTexte: 'Majoration de retard selon barème légal DGI (Art. 1083 CGI)',
    teleservice: 'e-impots.gouv.ci (DGI CI)',
    source: 'CALENDRIER DES OBLIGATIONS FISCALES.txt, O18 / IMPOTS ET TAXES.txt, IT_14',
    periodicite: 'mensuelle',
    jourDuMois: 15,
    minEffectif: 1,
    regimesApplicables: ['TOUS'],
  },
  {
    id: 'RULE_RETENUE_PRESTATAIRES_INFORMEL',
    domaine: 'fiscal',
    label: 'Prélèvement à la source sur prestataires du secteur informel',
    baseLegale: 'Article 84 bis du CGI',
    conditions: 'Personnes physiques ou morales au régime réel rémunérant des prestataires de fait',
    echeance: '15 du mois suivant',
    majorationTexte: 'Sanctions pour défaut de retenue à la source (Art. 1083 CGI)',
    teleservice: 'e-impots.gouv.ci (DGI CI)',
    source: 'CALENDRIER DES OBLIGATIONS FISCALES.txt, O86 / IMPOTS ET TAXES.txt, IT_28',
    periodicite: 'mensuelle',
    jourDuMois: 15,
    regimesApplicables: ['RSI', 'RNI'],
  },
  {
    id: 'RULE_TAXE_EQUIPEMENT',
    domaine: 'fiscal',
    label: 'Taxe spéciale d’équipement (TSE)',
    baseLegale: 'Article 1084 et suivants du CGI',
    conditions: 'Entreprises assujetties au régime réel (RSI et RNI)',
    echeance: '15 de chaque mois',
    majorationTexte: 'Pénalité de retard de droit commun (Art. 1083 CGI)',
    teleservice: 'e-impots.gouv.ci (DGI CI)',
    source: 'CALENDRIER DES OBLIGATIONS FISCALES.txt, O58 / IMPOTS ET TAXES.txt, IT_27',
    periodicite: 'mensuelle',
    jourDuMois: 15,
    regimesApplicables: ['RSI', 'RNI'],
  },
  {
    id: 'RULE_TIERS_PROVISIONNELS_BIC',
    domaine: 'fiscal',
    label: 'Acomptes provisionnels BIC (Tiers provisionnels)',
    baseLegale: 'Articles 131 à 138 du CGI',
    conditions: 'Entreprises soumises au régime réel d’imposition',
    echeance: '15 avril, 15 juin, 15 septembre',
    majorationTexte: 'Majoration de 10% sur les fractions non acquittées aux dates limites (Art. 1083 CGI)',
    teleservice: 'e-impots.gouv.ci (DGI CI)',
    source: 'CALENDRIER DES OBLIGATIONS FISCALES.txt, O03',
    periodicite: 'trimestrielle',
    jourDuMois: 15,
    trimestreMois: [4, 6, 9],
    regimesApplicables: ['RSI', 'RNI'],
  },
  {
    id: 'RULE_PATENTE_DECLARATION_PAIEMENT',
    domaine: 'fiscal',
    label: 'Contribution des patentes (Déclaration & Paiement fractionné)',
    baseLegale: 'Articles 264 à 286 du CGI, Art. 169 LPF (modifié AF 2026)',
    conditions: 'Personne physique ou morale commerciale, industrielle ou libérale non exemptée',
    echeance: 'Déclaration 15 mars ; Paiement 1ère moitié 15 mars, 2e moitié 15 juillet',
    majorationTexte: 'Application des sanctions du 1er paragraphe de l’art. 169 LPF pour défaut ou dépôt tardif',
    teleservice: 'e-impots.gouv.ci (DGI CI)',
    source: 'CALENDRIER DES OBLIGATIONS FISCALES.txt, O34-O35 / AF 2026, AF_10',
    periodicite: 'annuelle',
    jourDuMois: 15,
    moisEcheance: 7,
    regimesApplicables: ['RSI', 'RNI'],
  },
  {
    id: 'RULE_DEPOT_ETATS_FINANCIERS',
    domaine: 'fiscal',
    label: 'Dépôt des états financiers annuels & Notes annexes indissociables',
    baseLegale: 'Articles 36, 49 bis, 101 bis du CGI, Art. 169 LPF',
    conditions: 'Toutes entités au régime réel (RSI/RNI)',
    echeance: '30 mai suivant clôture (30 juin si certification CAC)',
    majorationTexte: 'Amende de 1 000 000 FCFA + 100 000 FCFA par mois ou fraction de mois de retard (Art. 169 LPF)',
    teleservice: 'e-impots.gouv.ci (Téléprocédure DGI CI)',
    source: 'LOI ANNEXE FISCALE 2026, AF_21 / CALENDRIER DES OBLIGATIONS FISCALES.txt, O01',
    periodicite: 'annuelle',
    jourDuMois: 30,
    moisEcheance: 5,
    regimesApplicables: ['RSI', 'RNI'],
  },
  {
    id: 'RULE_BENEFICIAIRES_EFFECTIFS',
    domaine: 'fiscal',
    label: 'Déclaration des bénéficiaires effectifs',
    baseLegale: 'Articles 49 ter, 71 du CGI et Art. 169 du LPF',
    conditions: 'Toutes personnes morales constituées en Côte d’Ivoire',
    echeance: 'Joint aux états financiers annuels (au plus tard le 30 mai)',
    majorationTexte: 'Amende de 1 000 000 FCFA + 100 000 FCFA par mois ou fraction de mois de retard (Art. 169 LPF)',
    teleservice: 'e-impots.gouv.ci (DGI CI)',
    source: 'LOI ANNEXE FISCALE 2026, AF_24',
    periodicite: 'annuelle',
    jourDuMois: 30,
    moisEcheance: 5,
    regimesApplicables: ['RSI', 'RNI'],
  },
  {
    id: 'RULE_ETAT_301_SALAIRES',
    domaine: 'fiscal',
    label: 'Dépôt de l’état récapitulatif annuel des salaires (État 301)',
    baseLegale: 'Articles 67 à 75 du CGI',
    conditions: 'Tout employeur versant des salaires au cours de l’exercice',
    echeance: '30 mai chaque année (30 juin si certification CAC)',
    majorationTexte: 'Amende fiscale par omission et pénalité pour non-dépôt dans les délais légaux (Art. 169 LPF)',
    teleservice: 'e-impots.gouv.ci (DGI CI)',
    source: 'CALENDRIER DES OBLIGATIONS FISCALES.txt, O02, O16',
    periodicite: 'annuelle',
    jourDuMois: 30,
    moisEcheance: 5,
    minEffectif: 1,
    regimesApplicables: ['TOUS'],
  },

  // ==================== 2. SOCIAL (CNPS / Prévoyance sociale) ====================
  {
    id: 'RULE_CNPS_AFFILIATION_EMPLOYEUR',
    domaine: 'social',
    label: 'Affiliation obligatoire de l’employeur et des travailleurs',
    baseLegale: 'Article 5 du Code de Prévoyance Sociale',
    conditions: 'Tout employeur occupant des salariés au sens de l’art. 2 du Code du Travail',
    echeance: 'Dès le 1er embauchage d’un travailleur',
    majorationTexte: 'L’employeur non affilié supporte directement l’ensemble des prestations dues en cas d’accident (Art. 139 CPS) + peines contraventionnelles (Art. 29)',
    teleservice: 'e-cnps.ci (Portail CNPS)',
    source: 'CNPS.txt, CN_01, CN_09',
    periodicite: 'evenementielle',
    minEffectif: 1,
    regimesApplicables: ['TOUS'],
  },
  {
    id: 'RULE_CNPS_COTISATIONS_PERIODIQUES',
    domaine: 'social',
    label: 'Déclaration & Paiement cotisations CNPS (Famille, AT/MP, Retraite)',
    baseLegale: 'Articles 12, 17, 22 et 26 du Code de Prévoyance Sociale (Ord. 2012-03)',
    conditions: 'Employeurs assujettis employant du personnel salarié (Famille 5,75%, AT/MP 2-5%, Retraite 14%)',
    echeance: '15 du mois suivant',
    majorationTexte: 'Pénalité de 10% du montant total mensuel des cotisations dues pour défaut de production aux échéances (Art. 30 CPS) + majorations de retard (Art. 22)',
    teleservice: 'e-cnps.ci (Télédéclaration DIS / CNPS)',
    source: 'CNPS.txt, CN_02, CN_03, CN_04, CN_06',
    periodicite: 'mensuelle',
    jourDuMois: 15,
    minEffectif: 1,
    regimesApplicables: ['TOUS'],
  },
  {
    id: 'RULE_CNPS_DECLARATION_ACCIDENT_TRAVAIL',
    domaine: 'social',
    label: 'Déclaration d’Accident du Travail ou Maladie Professionnelle',
    baseLegale: 'Article 71 du Code de Prévoyance Sociale',
    conditions: 'Tout accident du travail ou maladie professionnelle survenu au personnel',
    echeance: 'Dans les 48 heures de la survenance ou du premier constat médical',
    majorationTexte: 'Prise en charge intégrale des soins d’urgence à la charge de l’employeur et sanctions pour déclaration tardive (Art. 73 & 137 CPS)',
    teleservice: 'e-cnps.ci / Agence CNPS locale',
    source: 'CNPS.txt, CN_10',
    periodicite: 'evenementielle',
    minEffectif: 1,
    regimesApplicables: ['TOUS'],
  },

  // ==================== 3. RH & DROIT DU TRAVAIL (Code du Travail) ====================
  {
    id: 'RULE_CT_DELEGUES_PERSONNEL',
    domaine: 'rh_droit_travail',
    label: 'Élection des Délégués du Personnel (> 10 salariés)',
    baseLegale: 'Articles 61.1 à 61.7 du Code du Travail, Décret 96-207',
    conditions: 'Obligatoire pour tout établissement occupant habituellement plus de 10 salariés (Barème 11-25 sal : 1 titulaire + 1 suppléant)',
    echeance: 'Élection organisée tous les 2 ans dans le mois précédant l’expiration du mandat',
    majorationTexte: 'Délit d’entrave à la représentation du personnel et sanctions prévues à l’Art. 102 du Code du Travail',
    teleservice: 'Inspection du Travail et des Lois Sociales',
    source: 'CODE DU TRAVAIL.txt, CT_16, CT_17',
    periodicite: 'evenementielle',
    minEffectif: 11,
    regimesApplicables: ['TOUS'],
  },
  {
    id: 'RULE_CT_REGISTRE_HYGIENE_SECURITE',
    domaine: 'rh_droit_travail',
    label: 'Prévention santé-sécurité & Visites médicales d’embauche',
    baseLegale: 'Articles 41.1 à 43.4 du Code du Travail',
    conditions: 'Tout employeur quel que soit l’effectif (Service de santé, registre et visites obligatoires)',
    echeance: 'Visite médicale avant la fin de la période d’essai + tenue permanente des registres',
    majorationTexte: 'Amendes prévues par l’art. 102 du Code du travail en cas de manquement aux règles d’hygiène et sécurité',
    teleservice: 'Médecine du Travail / Inspection du Travail',
    source: 'CODE DU TRAVAIL.txt, CT_21, CT_23',
    periodicite: 'evenementielle',
    minEffectif: 1,
    regimesApplicables: ['TOUS'],
  },
  {
    id: 'RULE_CT_CHSCT_SEUIL_50',
    domaine: 'rh_droit_travail',
    label: 'Mise en place du CHSCT (> 50 salariés)',
    baseLegale: 'Articles 42.1 à 42.3 du Code du Travail, Décret 96-206',
    conditions: 'Obligatoire uniquement si effectif habituel strictement supérieur à 50 salariés',
    echeance: 'Mise en place obligatoire dès dépassement du seuil de 50 salariés',
    majorationTexte: 'Amende de 500 000 à 1 000 000 de francs pour défaut volontaire de CHSCT (Art. 102.7 Code du Travail)',
    teleservice: 'Inspection du Travail & Direction de la Sécurité au Travail',
    source: 'CODE DU TRAVAIL.txt, CT_21, CT_22',
    periodicite: 'evenementielle',
    minEffectif: 51,
    regimesApplicables: ['TOUS'],
  },

  // ==================== 4. COMPTABLE (SYSCOHADA Révisé) ====================
  {
    id: 'RULE_SYSCOHADA_SYSTEME_NORMAL',
    domaine: 'comptable',
    label: 'Tenue des comptes selon le Système Normal SYSCOHADA',
    baseLegale: 'Article 8 de l’Acte uniforme OHADA portant droit comptable',
    conditions: 'Obligatoire pour les entités au RSI et RNI (Bilan, Compte de résultat, TFT, Notes annexes)',
    echeance: 'Clôture au 31 décembre de chaque année',
    majorationTexte: 'Rejet de comptabilité par l’administration fiscale et rectification d’office (Art. 30 LPF)',
    teleservice: 'Ordre des Experts-Comptables / DGI CI',
    source: 'SYSCOHADA.txt, SY_01, SY_02',
    periodicite: 'annuelle',
    jourDuMois: 31,
    moisEcheance: 12,
    regimesApplicables: ['RSI', 'RNI'],
  },
  {
    id: 'RULE_IRVM_DISTRIBUTIONS',
    domaine: 'fiscal',
    label: 'Retenue IRVM sur dividendes & distributions',
    baseLegale: 'Articles 1085 et suivants du CGI',
    conditions: 'Toute société distribuant des dividendes ou revenus de valeurs mobilières',
    echeance: 'Reversement mensuel de la retenue opérée',
    majorationTexte: 'Majoration de 25% en cas de non-retenue ou de reversement tardif (Art. 1085 CGI)',
    teleservice: 'e-impots.gouv.ci (DGI CI)',
    source: 'CALENDRIER DES OBLIGATIONS FISCALES.txt / CGI 2026',
    periodicite: 'mensuelle',
    jourDuMois: 31,
    regimesApplicables: ['TOUS'],
  },
  {
    id: 'RULE_CMU_COTISATIONS',
    domaine: 'social',
    label: 'Cotisation CMU des salariés (CNAM)',
    baseLegale: 'Décret portant généralisation de la Couverture Maladie Universelle (CMU)',
    conditions: 'Tout employeur du secteur privé pour l’intégralité de ses salariés déclarés',
    echeance: '10 de chaque mois via la CNAM / e-CNPS couplé',
    majorationTexte: 'Sans quitus CMU à jour, blocage de l’attestation de régularité sociale (CNAM)',
    teleservice: 'e-cnps.ci / CNAM (CMU)',
    source: 'Decret_CMU_Obligatoire_2025.txt',
    periodicite: 'mensuelle',
    jourDuMois: 10,
    minEffectif: 1,
    regimesApplicables: ['TOUS'],
  },
];

/**
 * Moteur d'évaluation et de résolution des obligations
 */
export class ObligationEngine {
  /**
   * Horloge de référence : `dateReference` (système réel par défaut, forçable en QA).
   */
  public static REFERENCE_DATE: Date = getDateReference();

  /**
   * Normalise le libellé du régime fiscal pour la correspondance
   */
  public static normalizeRegime(regime: string = ''): 'RSI' | 'RNI' | 'RME' | 'TEE' | 'TOUS' {
    const upper = regime.toUpperCase();
    if (upper.includes('RSI') || upper.includes('SIMPLIFIÉ')) return 'RSI';
    if (upper.includes('RNI') || upper.includes('RÉEL NORMAL') || upper.includes('REEL NORMAL')) return 'RNI';
    if (upper.includes('MICRO') || upper.includes('RME')) return 'RME';
    if (upper.includes('ENTREPRENANT') || upper.includes('TEE')) return 'TEE';
    return 'RSI'; // Par défaut
  }

  /**
   * Vérifie si une règle est applicable au profil de l'entreprise
   */
  public static isRuleApplicable(rule: Rule, profile: CompanyProfile): boolean {
    const profileRegime = this.normalizeRegime(profile.regimeFiscal);
    const effectif = profile.effectifSalaries || 0;
    const ca = profile.chiffreAffairesEstime || 0;
    const secteur = (profile.secteur || profile.secteurActivite || '').toUpperCase();

    // 1. Filtre sur le régime fiscal
    if (rule.regimesApplicables && !rule.regimesApplicables.includes('TOUS')) {
      if (!rule.regimesApplicables.includes(profileRegime)) {
        return false;
      }
    }

    // 2. Filtre sur l'effectif
    if (rule.minEffectif !== undefined && effectif < rule.minEffectif) {
      return false;
    }
    if (rule.maxEffectif !== undefined && effectif > rule.maxEffectif) {
      return false;
    }

    // 3. Filtre sur le chiffre d'affaires
    if (rule.minCa !== undefined && ca < rule.minCa) {
      return false;
    }
    if (rule.maxCa !== undefined && ca > rule.maxCa) {
      return false;
    }

    // 4. Filtre sur le secteur d'activité
    if (rule.secteursApplicables && !rule.secteursApplicables.includes('TOUS')) {
      const matchSecteur = rule.secteursApplicables.some((s) => secteur.includes(s.toUpperCase()));
      if (!matchSecteur) return false;
    }

    return true;
  }

  /**
   * Résout les obligations applicables, calcule les échéances réelles et le statut de conformité
   */
  public static resolve(
    profile: CompanyProfile,
    quittancesPointerMap: Record<string, boolean> = {},
    customReferenceDate?: Date
  ): EngineOutput {
    // AMENDEMENT #2 : horloge unique. Aucune date codée en dur ci-dessous.
    const refDate = customReferenceDate || getDateReference();
    const refYear = refDate.getFullYear();

    // Filtrer les règles applicables
    const applicableRules = LEGAL_RULES.filter((rule) => this.isRuleApplicable(rule, profile));

    const instances: ObligationInstance[] = [];

    applicableRules.forEach((rule) => {
      if (rule.periodicite === 'mensuelle') {
        // Occurrence échue + 2 prochaines : les 3 blocs (En retard / Mois en cours /
        // Mois prochain) restent alimentés quelle que soit la position dans le mois.
        const { past, next, following } = monthlyTriple(rule.jourDuMois || 15, refDate);
        emitOccurrence(instances, rule, past, refDate, quittancesPointerMap);
        emitOccurrence(instances, rule, next, refDate, quittancesPointerMap);
        emitOccurrence(instances, rule, following, refDate, quittancesPointerMap);
        return;
      }
      if (rule.periodicite === 'trimestrielle') {
        const { past, next } = periodicPair(
          rule.trimestreMois || [4, 6, 9],
          rule.jourDuMois || 15,
          refDate
        );
        emitOccurrence(instances, rule, past, refDate, quittancesPointerMap);
        emitOccurrence(instances, rule, next, refDate, quittancesPointerMap);
        return;
      }
      if (rule.periodicite === 'annuelle') {
        const occ = monthlyDate(refYear, (rule.moisEcheance || 12) - 1, rule.jourDuMois || 15);
        emitOccurrence(instances, rule, occ, refDate, quittancesPointerMap);
        return;
      }
      // Événementiel (affiliation, accident, délégués, registres) : pas une échéance
      // datée → exclu de la fenêtre d'affichage En retard / Mois en cours / Mois prochain.
    });

    // Trier : En retard d'abord (plus sévère = plus de jours de retard), puis date croissante
    instances.sort((a, b) => {
      if (a.statut === 'en_retard' && b.statut !== 'en_retard') return -1;
      if (b.statut === 'en_retard' && a.statut !== 'en_retard') return 1;
      if (a.statut === 'en_retard' && b.statut === 'en_retard') return b.joursRetard - a.joursRetard;
      return a.dateEcheanceIso.localeCompare(b.dateEcheanceIso);
    });

    const nombreObligationsTotal = instances.length;
    const nombreEnRetard = instances.filter((o) => o.statut === 'en_retard').length;
    const nombreAJour = nombreObligationsTotal - nombreEnRetard;

    // Score de conformité : nombre d'obligations à jour / total
    const scoreConformite =
      nombreObligationsTotal > 0 ? Math.round((nombreAJour / nombreObligationsTotal) * 100) : 100;

    // Prochaine échéance : la plus proche date d'échéance à venir
    const aVenirList = instances
      .filter((o) => o.statut === 'a_venir')
      .sort((a, b) => a.dateEcheanceIso.localeCompare(b.dateEcheanceIso));
    const prochaineEcheance = aVenirList.length > 0 ? aVenirList[0] : null;

    // Alertes urgentes : obligations en retard avec leur source légale et sanction textuelle
    const alertesUrgentes = instances.filter((o) => o.statut === 'en_retard');

    return {
      obligationsActives: instances,
      scoreConformite,
      nombreObligationsTotal,
      nombreAJour,
      nombreEnRetard,
      prochaineEcheance,
      alertesUrgentes,
    };
  }

  /**
   * Convertit une instance d'obligation du moteur vers l'interface UI Obligation
   */
  public static instanceToObligation(
    inst: ObligationInstance,
    referenceDate?: Date
  ): import('../types').Obligation {
    // AMENDEMENT #2 §4 : aucun montant calculé — seule la sanction légale (texte) est exposée.
    const parsed = parseIsoDate(inst.dateEcheanceIso);
    const pill = parsed ? pillForDate(parsed) : { jour: '15', mois: '—' };
    const isRetard = inst.statut === 'en_retard';
    const isPointed = inst.statut === 'a_jour';
    const ref = referenceDate || getDateReference();
    const daysUntil = parsed ? diffDays(ref, parsed) : 999;
    const isImminent = !isRetard && !isPointed && daysUntil >= 0 && daysUntil <= 7;

    return {
      id: inst.key,
      titre: inst.label,
      echeanceLabel: isRetard
        ? `Échéance dépassée le ${inst.dateEcheance}`
        : `Échéance le ${inst.dateEcheance}`,
      dateIso: inst.dateEcheanceIso,
      echeanceDateIso: inst.dateEcheanceIso,
      statut: isRetard ? 'en_retard' : isPointed ? 'accomplie' : isImminent ? 'imminente' : 'a_venir',
      tagLabel: isRetard
        ? `En retard (${inst.joursRetard}j)`
        : isPointed
        ? 'Accomplie'
        : isImminent
        ? 'Imminent'
        : 'À venir',
      tagClass: isRetard ? 'retard' : isPointed ? 'fait' : isImminent ? 'imminent' : 'avenir',
      domaine: inst.domaine === 'social' ? 'social' : inst.domaine === 'fiscal' ? 'fiscal' : 'administratif',
      moisGroupe: parsed ? formatMonthLabel(parsed) : '',
      jour: pill.jour,
      mois: pill.mois,
      administration: inst.teleservice,
      baseLegale: inst.baseLegale,
      periodicitePlateforme: inst.teleservice,
      penalitesDetail: inst.majorationTexte,
      description: inst.description,
    };
  }
}
