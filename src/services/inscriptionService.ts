/**
 * PEN-016 — Inscription publique (entreprise / cabinet).
 * Ordre imposé par RLS : signUp → INSERT profiles → INSERT entité →
 * UPDATE profiles (premier lien, trigger OK car ancienne valeur NULL).
 * Si pas de session immédiate (email à confirmer), la charge utile est mise
 * de côté (SANS mot de passe) et finalisée à la première connexion.
 */
import { supabase } from './supabaseClient';
import {
  logInscriptionEntreprise,
  logInscriptionCabinet,
} from './journalEvents';

export interface EntrepriseSignupFields {
  raisonSociale: string;
  email: string;
}

export interface CabinetSignupFields {
  raisonSociale: string;
  nomGestionnaire: string;
  email: string;
  ville?: string;
  numAgrement?: string;
  typeCabinet?: string;
}

export type PendingInscription =
  | { kind: 'entreprise'; userId: string; at: number; fields: EntrepriseSignupFields }
  | { kind: 'cabinet'; userId: string; at: number; fields: CabinetSignupFields };

const PENDING_KEY = 'lf_pending_inscription';

export async function signupAccount(
  email: string,
  password: string,
  fullName: string
): Promise<{ userId: string | null; hasSession: boolean; error?: string }> {
  if (!supabase) return { userId: null, hasSession: false, error: 'Backend non configuré.' };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    const msg = error.message || '';
    if (/already|existe|pris|registered/i.test(msg)) {
      return { userId: null, hasSession: false, error: 'Cet email est déjà utilisé.' };
    }
    if (/rate|429|limit/i.test(msg)) {
      return { userId: null, hasSession: false, error: 'Service momentanément indisponible, réessayez dans une heure.' };
    }
    return { userId: null, hasSession: false, error: 'Inscription impossible. Réessayez.' };
  }
  return { userId: data.user?.id || null, hasSession: !!data.session };
}

export async function createEntrepriseProfile(
  userId: string,
  f: EntrepriseSignupFields
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Backend non configuré.' };
  const { data: ent, error: e1 } = await supabase
    .from('entreprises')
    .insert({
      raison_sociale: f.raisonSociale,
      email_contact: f.email,
      profil_complet: false,
    })
    .select('id')
    .maybeSingle();
  if (e1 || !ent) return { ok: false, error: 'Création entreprise impossible. Réessayez.' };
  const entrepriseId = (ent as any).id as string;
  const { error: e2 } = await supabase.from('profiles').insert({
    id: userId,
    role: 'entreprise',
    statut: 'actif',
    nom_complet: f.raisonSociale,
    email: f.email,
    entreprise_id: entrepriseId,
  });
  if (e2) return { ok: false, error: 'Création du profil impossible. Réessayez.' };
  await logInscriptionEntreprise(entrepriseId);
  return { ok: true };
}

export async function createCabinetProfile(
  userId: string,
  f: CabinetSignupFields
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Backend non configuré.' };
  const { data: cab, error: e1 } = await supabase
    .from('cabinets')
    .insert({
      raison_sociale: f.raisonSociale,
      nom_gestionnaire: f.nomGestionnaire,
      ville: f.ville || null,
      num_agrement: f.numAgrement || null,
      type_cabinet: f.typeCabinet || null,
      email_contact: f.email,
    })
    .select('id')
    .maybeSingle();
  if (e1 || !cab) return { ok: false, error: 'Création cabinet impossible. Réessayez.' };
  const cabinetId = (cab as any).id as string;
  const { error: e2 } = await supabase.from('profiles').insert({
    id: userId,
    role: 'gestionnaire',
    statut: 'en_attente',
    nom_complet: f.nomGestionnaire,
    email: f.email,
    cabinet_id: cabinetId,
  });
  if (e2) return { ok: false, error: 'Création du profil impossible. Réessayez.' };
  await logInscriptionCabinet(cabinetId);
  return { ok: true };
}

export function savePendingInscription(p: PendingInscription): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
    /* stockage indisponible : l'utilisateur recommencera */
  }
}

export function readPendingInscription(): PendingInscription | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingInscription;
    if (!p || !p.userId || Date.now() - (p.at || 0) > 24 * 3600 * 1000) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearPendingInscription(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* noop */
  }
}

/** Finalise une inscription mise de côté, à la première connexion (session active). */
export async function completePendingInscription(userId: string): Promise<boolean> {
  const pending = readPendingInscription();
  if (!pending || pending.userId !== userId) return false;
  const res =
    pending.kind === 'entreprise'
      ? await createEntrepriseProfile(userId, pending.fields)
      : await createCabinetProfile(userId, pending.fields);
  if (res.ok) clearPendingInscription();
  return res.ok;
}

/**
 * OAuth (Google) : auto-provisionnement à la 1re connexion (entreprise/actif).
 * Uniquement si le provider est OAuth (jamais pour email/password sans profil,
 * qui reste sur l'écran « Compte sans profil »).
 */
export async function provisionOAuthProfile(userId: string, email: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data } = await supabase.auth.getUser();
    const provider = (data?.user?.app_metadata as any)?.provider;
    if (provider !== 'google') return false;
    const fullName =
      ((data?.user?.user_metadata as any)?.full_name as string) ||
      ((data?.user?.user_metadata as any)?.name as string) ||
      '';
    const raison = fullName.trim() || email.split('@')[0];
    const res = await createEntrepriseProfile(userId, { raisonSociale: raison, email });
    return res.ok;
  } catch {
    return false;
  }
}
