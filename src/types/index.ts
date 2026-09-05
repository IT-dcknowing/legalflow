export type UserRole = 'super_admin' | 'gestionnaire' | 'utilisateur';

export type PageId =
  // Pages publiques (hors session)
  | 'landing'
  | 'login'
  | 'inscription'
  // Pages blocantes (session non active)
  | 'en_attente'
  | 'suspendu'
  | 'accueil'
  | 'dashboard'
  | 'echeancier'
  | 'opportunites'
  | 'bibliotheque'
  | 'veille'
  | 'documents'
  | 'profil'
  // Super Admin Pages (Niveau 1)
  | 'super_admin'
  | 'super_admin_entreprises'
  | 'super_admin_pipeline'
  | 'super_admin_notifications'
  | 'super_admin_audits'
  | 'super_admin_rappels'
  | 'super_admin_journal'
  | 'super_admin_cabinets_attente'
  | 'admin_console'
  | 'admin_entreprises'
  | 'admin_pipeline'
  | 'admin_notifications'
  | 'admin_audits'
  | 'admin_schema'
  // Gestionnaire Pages (Niveau 2)
  | 'gestionnaire_dashboard'
  | 'gestionnaire_journal'
  | 'mes_entreprises'
  // Entreprise (Niveau 3)
  | 'entreprise_historique';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  managedEntrepriseIds?: string[];
  createdAt?: string;
}

export interface CompanyProfile {
  id?: string;
  nom: string;
  raisonSociale: string;
  numeroCC: string;
  ncc: string;
  rccm: string;
  numeroCnps: string;
  formeJuridique: string;
  secteur: string;
  secteurActivite: string;
  regimeFiscal: string;
  centreImpots: string;
  effectif: string;
  effectifSalaries: number;
  adherentCGA: string;
  adhesionCga: boolean;
  cgaNom: string;
  predicats: string[];
  chiffreAffairesEstime: number;
  salariesCmuAffilies: number;
  masseSalarialeAnnuelle: number;
  profilComplet?: boolean;
  secteurGeographique?: string;
  createdBy?: string;
  dateCreation?: string;
  lastActive?: string;
}

export interface CompanyEntity {
  id: string;
  name: string;
  raisonSociale: string;
  formeJuridique: string;
  secteurActivite: string;
  regimeFiscal: string;
  caEstime: number;
  effectif: number;
  adhesionCga: boolean;
  cgaNom?: string;
  numeroCnps: string;
  numeroRccm: string;
  numeroCc: string;
  secteurGeographique: string;
  profilComplet: boolean; // True si forme_juridique + secteur_activite + regime_fiscal + effectif + ca_estime sont renseignés
  createdBy: string;
  createdAt: string;
  centreImpots?: string;
  scoreConformite?: number;
  alertesCount?: number;
  dossierManagerName?: string;
}

export interface AuditItem {
  id: string;
  entrepriseId: string;
  entrepriseNom: string;
  auditeurId: string;
  auditeurNom: string;
  dateAudit: string;
  scoreConformite: number;
  scoreOptimisation: number;
  rapportUrl?: string;
  statut: 'en_cours' | 'termine' | 'annule';
  notes: string;
}

export interface GlobalNotification {
  id: string;
  titre: string;
  contenu: string;
  type: 'general' | 'alerte' | 'rappel' | 'information' | 'mise_a_jour';
  cible: 'tous' | 'par_secteur' | 'par_regime' | 'individuelle';
  secteurCible?: string;
  regimeCible?: string;
  entrepriseCible?: string;
  entrepriseNomCible?: string;
  envoyeParNom?: string;
  dateEnvoi: string;
  lu?: boolean;
}

export interface RegulatoryPipelineItem {
  id: string;
  titre: string;
  source: string;
  dateDetection: string;
  datePrevisionnellePublication: string;
  etape: 'J0_detection' | 'J5_analyse_impact' | 'publication_officielle';
  impactSecteur: string;
  statut: 'en_cours' | 'valide' | 'publie';
  resume: string;
  articlesRefs?: string;
}

export interface ObligationVersion {
  version: string;
  dateEffet: string;
  ancienneDate: string;
  nouvelleDate: string;
  motif: string;
  auteur: string;
}

export interface CostSimulationLine {
  id: string;
  label: string;
  montant: number;
}

export interface CostSimulation {
  lines: CostSimulationLine[];
  total: number;
  datePaiementPrevue?: string;
  rappelActif?: boolean;
  savedAt?: string;
}

export type ObligationStatus = 'en_retard' | 'imminente' | 'accomplie' | 'a_venir';

export interface Obligation {
  id: string;
  titre: string;
  echeanceLabel: string;
  dateIso?: string;
  echeanceDateIso?: string;
  statut: ObligationStatus;
  tagLabel: string;
  tagClass: 'retard' | 'imminent' | 'fait' | 'avenir';
  montantEstime?: string;
  montantNumerique?: number;
  description?: string;
  domaine: 'fiscal' | 'social' | 'douanes' | 'commerce' | 'administratif';
  moisGroupe: string;
  jour: string;
  mois: string;
  quittanceRef?: string;
  dateDeclaration?: string;
  penaliteEstimee?: number;
  pieceJointeUrl?: string;
  pieceJointeNom?: string;
  administration: string;
  baseLegale: string;
  baremeTaux?: string;
  periodicitePlateforme?: string;
  penalitesDetail?: string;
  versionHistory?: ObligationVersion[];
  simulation?: CostSimulation;
  masquee?: boolean;
}

export interface DocumentItem {
  id: string;
  name: string;
  category?: 'Fiscal' | 'Social' | 'Juridique' | 'Douanes' | 'Ajoutés à l\'instant' | string;
  modifiedDate?: string;
  size?: string;
  meta?: string;
  type?: string;
  taille?: string;
  date?: string;
  fileUrl?: string;
}

export interface FlashVeille {
  id: string;
  eyebrow?: string;
  badgeNeutral?: string;
  badges?: Array<{ label: string; type: 'fait' | 'imminent' | 'retard' }>;
  title: string;
  titre?: string;
  desc: string;
  corps?: string;
  date?: string;
  dateEffet?: string;
  texteRef?: string;
  qualification?: string;
  source?: string;
  secteurs?: string;
  impactExtra?: string;
  impactConcret?: string;
  category?: string;
  actionText?: string;
  actionPage?: PageId;
  actionType?: 'audit' | 'opportunite' | 'checklist' | 'guide';
  isApplicableDossier?: boolean;
  checklistItems?: string[];
}

export interface VeilleItem {
  id: string;
  titre: string;
  date: string;
  source: string;
  secteurs: string;
  corps: string;
}

export interface FicheGuide {
  id: string;
  titre: string;
  duree: string;
  category: string;
  badge: string;
  resume: string;
  motifRecommandation?: string;
  sections: Array<{ titre: string; contenu: string[] }>;
  baseLegale: string;
  articlesRefs?: string;
}

export interface OpportunityItem {
  id: string;
  name: string;
  gain: string;
  gainAnnuelFcfa: number;
  status: 'eligible' | 'obtenu' | 'condition' | 'capte' | 'a_risque' | 'eligible_non_capte';
  level?: 'capte' | 'a_risque' | 'eligible_non_capte';
  tagLabel: string;
  tagClass: 'imminent' | 'fait' | 'retard' | 'warning';
  description?: string;
  articleRef?: string;
  maintienCondition?: string;
  linkText: string;
  procedureEtapes?: string[];
}

export interface RagSourceCitation {
  id?: string;
  source_fichier: string;
  reference_article: string;
  contenu: string;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  inlineLink?: { text: string; page: PageId };
  timestamp: string;
  sources?: RagSourceCitation[];
  isFallback?: boolean;
  model?: string;
  contextSlices?: string[];
}
