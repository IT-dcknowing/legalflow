/**
 * Client Supabase + helpers CONNEXION RÉELLE (email/mot de passe, 3 niveaux).
 * Config via VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (.env local, jamais commité).
 * Si non configuré, `supabase` vaut null et l'app bascule en mode démo.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta as any)?.env || {};
const SUPABASE_URL: string | undefined = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const isSupabaseConfigured = (): boolean => supabase !== null;

export type DbRole = 'super_admin' | 'gestionnaire' | 'entreprise';

export interface DbProfile {
  id: string;
  role: DbRole;
  statut: string | null;
  nom_complet: string | null;
  email: string | null;
  cabinet_id: string | null;
  entreprise_id: string | null;
}

export interface DbEntreprise {
  id: string;
  raison_sociale: string;
  rccm: string | null;
  forme_juridique: string | null;
  secteur: string | null;
  regime_fiscal: string | null;
  effectif: number | null;
  ca_estime: number | null;
  profil_complet: boolean;
}

export async function fetchMyProfile(userId: string): Promise<DbProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, statut, nom_complet, email, cabinet_id, entreprise_id')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as DbProfile;
}

/** Entreprises visibles selon RLS (l'API ne renvoie que le périmètre du niveau). */
export async function fetchVisibleEntreprises(): Promise<DbEntreprise[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('entreprises')
    .select('id, raison_sociale, rccm, forme_juridique, secteur, regime_fiscal, effectif, ca_estime, profil_complet')
    .order('raison_sociale');
  if (error || !data) return [];
  return data as DbEntreprise[];
}

/** Journal général : connexion, quittance_pointee, rapport_genere… (fire-and-forget). */
export async function logEvent(
  action: string,
  entite_type?: string,
  entite_id?: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    if (!supabase) return;
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return;
    await supabase.from('journal_evenements').insert({
      user_id: userId,
      action,
      entite_type: entite_type || null,
      entite_id: entite_id || null,
      metadata,
    });
  } catch {
    /* journal non bloquant */
  }
}

export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 120);
}
