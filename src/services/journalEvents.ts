/**
 * PEN-013 — Events du journal (spec §7).
 * L'utilisateur loggé vient toujours de la session (logEvent lit auth.getSession()).
 */
import { logEvent } from './supabaseClient';

export const logConnexion = (email?: string): Promise<void> =>
  logEvent('connexion', undefined, undefined, email ? { email } : {});

export const logDeconnexion = (): Promise<void> => logEvent('deconnexion');

export const logInscriptionEntreprise = (entrepriseId: string): Promise<void> =>
  logEvent('inscription_entreprise', 'entreprise', entrepriseId, {});

export const logInscriptionCabinet = (cabinetId: string): Promise<void> =>
  logEvent('inscription_cabinet', 'cabinet', cabinetId, {});

export const logCabinetActive = (cabinetId: string): Promise<void> =>
  logEvent('cabinet_active', 'cabinet', cabinetId, {});

export const logCabinetRefuse = (cabinetId: string, motif: string): Promise<void> =>
  logEvent('cabinet_refuse', 'cabinet', cabinetId, { motif });
