/**
 * Routing URL réel (QA : l'URL change, précédent/suivant, favoris, liens directs).
 * L'état `activePage` reste la source de vérité ; ce module synchronise l'URL :
 * - navigation utilisateur → history.pushState (bouton précédent OK) ;
 * - redirects/gardes → history.replaceState (pas d'entrée parasite) ;
 * - bouton précédent/suivant + lien direct → événement popstate → activePage.
 */
import type { PageId } from '../types';

const PATHS: Array<[PageId, string]> = [
  ['landing', '/'],
  ['login', '/login'],
  ['inscription', '/signup'],
  ['assistant', '/assistant'],
  ['en_attente', '/en-attente'],
  ['suspendu', '/suspendu'],
  ['accueil', '/accueil'],
  ['dashboard', '/dashboard'],
  ['echeancier', '/echeancier'],
  ['opportunites', '/opportunites'],
  ['bibliotheque', '/bibliotheque'],
  ['veille', '/veille'],
  ['documents', '/documents'],
  ['profil', '/profil'],
  ['parametres', '/parametres'],
  ['entreprise_historique', '/historique'],
  ['super_admin', '/admin'],
  ['super_admin_entreprises', '/admin/entreprises'],
  ['super_admin_pipeline', '/admin/pipeline'],
  ['super_admin_notifications', '/admin/notifications'],
  ['super_admin_audits', '/admin/audits'],
  ['super_admin_rappels', '/admin/rappels'],
  ['super_admin_journal', '/admin/journal'],
  ['super_admin_cabinets_attente', '/admin/cabinets'],
  ['admin_console', '/admin'],
  ['admin_entreprises', '/admin/entreprises'],
  ['admin_pipeline', '/admin/pipeline'],
  ['admin_notifications', '/admin/notifications'],
  ['admin_audits', '/admin/audits'],
  ['admin_schema', '/admin/schema'],
  ['gestionnaire_dashboard', '/gestionnaire'],
  ['gestionnaire_journal', '/gestionnaire/journal'],
  ['mes_entreprises', '/mes-entreprises'],
];

/** Alias acceptés en entrée (anciens liens, variantes). */
const ALIASES: Record<string, PageId> = {
  '/inscription': 'inscription',
  '/register': 'inscription',
  '/sign-up': 'inscription',
  '/signin': 'login',
  '/tableau-de-bord': 'dashboard',
};

export function pageToPath(page: PageId): string {
  const found = PATHS.find(([id]) => id === page);
  return found ? found[1] : '/';
}

export function pathToPage(pathname: string): PageId {
  const clean = (pathname || '/').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  if (ALIASES[clean]) return ALIASES[clean];
  const found = PATHS.find(([, path]) => path === clean);
  return found ? found[0] : 'landing';
}
