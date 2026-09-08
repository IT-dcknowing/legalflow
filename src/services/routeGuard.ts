/**
 * PEN-019 — Garde-fous de routing (UX, dernière ligne de défense).
 * La sécurité RÉELLE est dans les RLS Supabase ; ce guard évite les écrans
 * vides et redirige vers l'espace propre. Les refus sont tracés (acces_refuse).
 *
 * Matrice rôle × route :
 * - Hors session  → landing, login, inscription UNIQUEMENT.
 * - Session en_attente → en_attente UNIQUEMENT. suspendu → suspendu UNIQUEMENT.
 * - super_admin actif → toutes les pages app SAUF login, inscription,
 *   en_attente, suspendu, landing.
 * - gestionnaire actif → pages portefeuille (gestionnaire_dashboard,
 *   mes_entreprises, gestionnaire_journal) + pages entreprise (mode client :
 *   accueil, dashboard, echeancier, opportunites, bibliotheque, veille,
 *   documents, profil).
 * - entreprise (utilisateur) actif → accueil, dashboard, echeancier,
 *   opportunites, bibliotheque, veille, documents, profil, entreprise_historique.
 */
import type { PageId } from '../types';

const PUBLIC_PAGES: PageId[] = ['landing', 'login', 'inscription'];

const COMPANY_PAGES: PageId[] = [
  'accueil',
  'dashboard',
  'echeancier',
  'opportunites',
  'bibliotheque',
  'veille',
  'documents',
  'profil',
  'parametres',
  'entreprise_historique',
];

const GESTIONNAIRE_PAGES: PageId[] = [
  'gestionnaire_dashboard',
  'mes_entreprises',
  'gestionnaire_journal',
];

const SUPER_ADMIN_PAGES: PageId[] = [
  'super_admin',
  'super_admin_entreprises',
  'super_admin_pipeline',
  'super_admin_notifications',
  'super_admin_audits',
  'super_admin_rappels',
  'super_admin_journal',
  'super_admin_cabinets_attente',
  'admin_console',
  'admin_entreprises',
  'admin_pipeline',
  'admin_notifications',
  'admin_audits',
  'admin_schema',
];

export interface GuardContext {
  session: boolean;
  role?: string | null;
  statut?: string | null;
  page: PageId;
}

export function canAccess({ session, role, statut, page }: GuardContext): boolean {
  if (!session) return PUBLIC_PAGES.includes(page);
  if (statut === 'en_attente') return page === 'en_attente';
  if (statut === 'suspendu') return page === 'suspendu';
  if (role === 'super_admin') return SUPER_ADMIN_PAGES.includes(page);
  if (role === 'gestionnaire')
    return GESTIONNAIRE_PAGES.includes(page) || COMPANY_PAGES.includes(page);
  return COMPANY_PAGES.includes(page);
}
