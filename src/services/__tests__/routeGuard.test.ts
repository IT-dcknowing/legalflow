/** Preuve exécutable : matrice rôle × route du garde (revue conformité). */
import { describe, it, expect } from 'vitest';
import { canAccess } from '../routeGuard';
import type { PageId } from '../../types';

const CASES: Array<[string, { session: boolean; role?: string | null; statut?: string | null; page: PageId }, boolean]> = [
  ['public landing', { session: false, page: 'landing' }, true],
  ['public login', { session: false, page: 'login' }, true],
  ['public inscription', { session: false, page: 'inscription' }, true],
  ['public dashboard refusé', { session: false, page: 'dashboard' }, false],
  ['en_attente vers en_attente', { session: true, role: 'gestionnaire', statut: 'en_attente', page: 'en_attente' }, true],
  ['en_attente vers dashboard refusé', { session: true, role: 'gestionnaire', statut: 'en_attente', page: 'gestionnaire_dashboard' }, false],
  ['suspendu vers suspendu', { session: true, role: 'entreprise', statut: 'suspendu', page: 'suspendu' }, true],
  ['suspendu vers dashboard refusé', { session: true, role: 'entreprise', statut: 'suspendu', page: 'dashboard' }, false],
  ['admin vers journal', { session: true, role: 'super_admin', statut: 'actif', page: 'super_admin_journal' }, true],
  ['admin vers file cabinets', { session: true, role: 'super_admin', statut: 'actif', page: 'super_admin_cabinets_attente' }, true],
  ['admin vers login refusé', { session: true, role: 'super_admin', statut: 'actif', page: 'login' }, false],
  ['gestionnaire vers dashboard', { session: true, role: 'gestionnaire', statut: 'actif', page: 'gestionnaire_dashboard' }, true],
  ['gestionnaire vers journal', { session: true, role: 'gestionnaire', statut: 'actif', page: 'gestionnaire_journal' }, true],
  ['gestionnaire vers échéancier (mode client)', { session: true, role: 'gestionnaire', statut: 'actif', page: 'echeancier' }, true],
  ['gestionnaire vers admin refusé', { session: true, role: 'gestionnaire', statut: 'actif', page: 'super_admin' }, false],
  ['entreprise vers dashboard', { session: true, role: 'entreprise', statut: 'actif', page: 'dashboard' }, true],
  ['entreprise vers historique', { session: true, role: 'entreprise', statut: 'actif', page: 'entreprise_historique' }, true],
  ['entreprise vers portefeuille refusé', { session: true, role: 'entreprise', statut: 'actif', page: 'mes_entreprises' }, false],
  ['actif vers en_attente refusé', { session: true, role: 'entreprise', statut: 'actif', page: 'en_attente' }, false],
];

describe('routeGuard.canAccess — matrice 19 cas', () => {
  for (const [name, ctx, expected] of CASES) {
    it(name, () => {
      expect(canAccess(ctx)).toBe(expected);
    });
  }
});
