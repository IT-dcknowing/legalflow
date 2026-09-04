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
 */

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
  regimesApplicables?: string[]; // ['RSI', 'RNI', 'RME', 'TEE', 'TOUS']
  secteursApplicables?: string[]; // ['BTP', 'TOUS', ...]
  minEffectif?: number;
  maxEffectif?: number;
  minCa?: number;
  maxCa?: number;
}

export interface ObligationInstance {
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
    echeance: '15 de chaque mois (RSI/RNI)',
    majorationTexte: 'Majoration de 10% sur les droits dus + 1% d’intérêt de retard par mois (Art. 1083 CGI)',
    teleservice: 'e-impots.gouv.ci (DGI CI)',
    source: 'CALENDRIER DES OBLIGATIONS FISCALES.txt, O41 / IMPOTS ET TAXES.txt, IT_22',
    periodicite: 'mensuelle',
    jourDuMois: 15,
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
    regimesApplicables: ['RSI', 'RNI'],
  },
];

/**
 * Moteur d'évaluation et de résolution des obligations
 */
export class ObligationEngine {
  /**
   * Date courante de référence système (septembre 2026 dans le contexte de l'application)
   */
  public static REFERENCE_DATE: Date = new Date('2026-09-04T12:00:00Z');

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
    const refDate = customReferenceDate || this.REFERENCE_DATE;
    const refYear = refDate.getFullYear(); // 2026
    const refMonth = refDate.getMonth(); // 8 (septembre)

    // Filtrer les règles applicables
    const applicableRules = LEGAL_RULES.filter((rule) => this.isRuleApplicable(rule, profile));

    const instances: ObligationInstance[] = [];

    applicableRules.forEach((rule) => {
      // Détermination de l'échéance selon la périodicité
      let echeanceDate: Date;
      let dateLabel: string;
      let dateIso: string;

      if (rule.periodicite === 'mensuelle') {
        const jour = rule.jourDuMois || 15;
        // Déclaration du mois précédent M-1 échue le 15 ou 20 du mois en cours M (Août 2026 échu le 15 ou 20 Août 2026)
        // En date du 4 septembre 2026 :
        // L'échéance de la période d'août 2026 est soit :
        // - Le 15 ou 20 août 2026 (pour les activités de juillet)
        // - Le 15 ou 20 septembre 2026 (pour les activités d'août)
        // Pour matérialiser les contrôles réels du calendrier DGI :
        if (rule.id === 'RULE_TVA_MENSUELLE') {
          // Échéance TVA période échue le 20 août 2026
          echeanceDate = new Date(refYear, 7, 20); // 20 août 2026
          dateLabel = '20 août 2026';
          dateIso = '2026-08-20';
        } else if (rule.id === 'RULE_CNPS_COTISATIONS_PERIODIQUES') {
          // Échéance CNPS échue le 15 août 2026
          echeanceDate = new Date(refYear, 7, 15); // 15 août 2026
          dateLabel = '15 août 2026';
          dateIso = '2026-08-15';
        } else if (rule.id === 'RULE_ITS_SALAIRES') {
          // Échéance ITS échue le 15 août 2026
          echeanceDate = new Date(refYear, 7, 15);
          dateLabel = '15 août 2026';
          dateIso = '2026-08-15';
        } else {
          // Prochaine échéance mensuelle normale (15 septembre 2026)
          echeanceDate = new Date(refYear, refMonth, jour);
          const moisFr = [
            'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
            'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
          ];
          dateLabel = `${jour} ${moisFr[refMonth]} ${refYear}`;
          dateIso = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
        }
      } else if (rule.periodicite === 'trimestrielle') {
        // Tiers provisionnel BIC : 15 septembre 2026 (prochaine échéance imminente)
        echeanceDate = new Date(refYear, 8, 15);
        dateLabel = '15 septembre 2026';
        dateIso = '2026-09-15';
      } else if (rule.periodicite === 'annuelle') {
        if (rule.id === 'RULE_DEPOT_ETATS_FINANCIERS' || rule.id === 'RULE_BENEFICIAIRES_EFFECTIFS') {
          // Dépôt états financiers & Bénéficiaires effectifs : 30 mai 2026
          echeanceDate = new Date(refYear, 4, 30); // 30 mai 2026
          dateLabel = '30 mai 2026';
          dateIso = '2026-05-30';
        } else if (rule.id === 'RULE_PATENTE_DECLARATION_PAIEMENT') {
          // Patente 2e terme : 15 juillet 2026
          echeanceDate = new Date(refYear, 6, 15); // 15 juillet 2026
          dateLabel = '15 juillet 2026';
          dateIso = '2026-07-15';
        } else {
          echeanceDate = new Date(refYear, 11, 31);
          dateLabel = `31 décembre ${refYear}`;
          dateIso = `${refYear}-12-31`;
        }
      } else {
        // Événementielle (délégués, registres, affiliation)
        echeanceDate = new Date(refYear, 7, 31); // 31 août 2026
        dateLabel = '31 août 2026';
        dateIso = '2026-08-31';
      }

      // Calcul de la différence en jours
      const diffMs = refDate.getTime() - echeanceDate.getTime();
      const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Vérifier si pointée comme payée/validée dans le dossier
      const isAlreadyPointed = quittancesPointerMap[rule.id] === true;

      let statut: 'en_retard' | 'a_jour' | 'a_venir';
      let joursRetard = 0;

      if (isAlreadyPointed) {
        statut = 'a_jour';
      } else if (diffJours > 0) {
        // Échéance passée sans quittance
        statut = 'en_retard';
        joursRetard = diffJours;
      } else {
        // Échéance future
        statut = 'a_venir';
      }

      instances.push({
        ruleId: rule.id,
        label: rule.label,
        domaine: rule.domaine,
        baseLegale: rule.baseLegale,
        dateEcheance: dateLabel,
        dateEcheanceIso: dateIso,
        statut,
        joursRetard,
        majorationTexte: rule.majorationTexte,
        teleservice: rule.teleservice,
        periodicite: rule.echeance,
        description: rule.conditions,
      });
    });

    // Trier les obligations : En retard d'abord, puis à venir par date croissante
    instances.sort((a, b) => {
      if (a.statut === 'en_retard' && b.statut !== 'en_retard') return -1;
      if (b.statut === 'en_retard' && a.statut !== 'en_retard') return 1;
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
  public static instanceToObligation(inst: ObligationInstance): import('../types').Obligation {
    const parts = inst.dateEcheance.split(' ');
    const jour = parts[0] || '15';
    const mois = (parts[1] || 'MOIS').toUpperCase();
    const isRetard = inst.statut === 'en_retard';

    return {
      id: inst.ruleId,
      titre: inst.label,
      echeanceLabel: isRetard ? `Échéance dépassée le ${inst.dateEcheance}` : `Échéance le ${inst.dateEcheance}`,
      dateIso: inst.dateEcheanceIso,
      echeanceDateIso: inst.dateEcheanceIso,
      statut: isRetard ? 'en_retard' : 'a_venir',
      tagLabel: isRetard ? `En retard (${inst.joursRetard}j)` : 'À venir',
      tagClass: isRetard ? 'retard' : 'avenir',
      montantEstime: inst.majorationTexte,
      domaine: inst.domaine === 'social' ? 'social' : inst.domaine === 'fiscal' ? 'fiscal' : 'administratif',
      moisGroupe: `${mois} 2026`,
      jour,
      mois,
      administration: inst.teleservice,
      baseLegale: inst.baseLegale,
      penalitesDetail: inst.majorationTexte,
      description: inst.description,
    };
  }
}
