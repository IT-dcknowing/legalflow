/**
 * Notifications, préférences, veille et opt-in WhatsApp (CDC UX & Notifications).
 * Fonctionne avec Supabase quand configuré/authentifié, sinon repli local
 * (localStorage + mocks) pour le mode démo (AUTH_BYPASSED).
 */
import { supabase } from './supabaseClient';import { mockGlobalNotifications } from '../data/rolesData';
import type {
  DbNotification,
  GlobalNotification,
  NotificationPreferences,
  VeilleNote,
  MaintenanceBannerState,
} from '../types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../types';

// --- Validation numéro ivoirien stricte : +225 0X XX XX XX XX -----------------
export function normalizeIvorianPhone(raw: string): string {
  return String(raw || '').replace(/[\s.\-()]/g, '');
}

/** +225 suivi de 10 chiffres, mobile 01/05/07 (ex : +2250701020304). */
export function isValidIvorianPhone(raw: string): boolean {
  return /^\+2250[157]\d{8}$/.test(normalizeIvorianPhone(raw));
}

export function formatIvorianPhone(raw: string): string {
  const n = normalizeIvorianPhone(raw);
  const m = n.match(/^(\+225)(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]} ${m[6]}` : raw;
}

// --- Helpers persistance locale (mode démo) ------------------------------------
function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

const LS_PREFS = 'lf_notif_prefs';
const LS_WHATSAPP = 'lf_whatsapp_optin';
const LS_BANNER_DISMISS = 'lf_banner_dismissed';

/** Repli local assumé ET tracé (audit : pas d'échec silencieux). */
function warnFallback(scope: string, err: unknown): void {
  console.warn(
    `[notifications] ${scope} : repli local/démo (` +
      (err instanceof Error ? err.message : String(err || 'erreur inconnue')) +
      ').'
  );
}

export interface WhatsappState {
  number: string | null;
  optinAt: string | null;
  dismissals: number;
}

// --- Notifications in-app --------------------------------------------------------
function mockToDb(mocks: GlobalNotification[]): DbNotification[] {
  return mocks.map((m) => ({
    id: m.id,
    titre: m.titre,
    contenu: m.contenu,
    type: (['general', 'alerte', 'rappel', 'information', 'mise_a_jour'] as const).includes(
      m.type as 'general'
    )
      ? (m.type as DbNotification['type'])
      : 'generale',
    criticite: m.type === 'alerte' ? 'haute' : 'basse',
    cible: 'tous',
    date_envoi: m.dateEnvoi,
    lu: m.lu,
  }));
}

export async function fetchNotifications(userId?: string | null): Promise<DbNotification[]> {
  if (supabase && userId) {
    try {
      const { data: notifs, error } = await supabase
        .from('notifications')
        .select('id,titre,contenu,type,criticite,cible,entreprise_id,date_envoi')
        .order('date_envoi', { ascending: false })
        .limit(50);
      if (error) throw error;
      const { data: lues } = await supabase
        .from('notifications_lues')
        .select('notification_id')
        .eq('user_id', userId);
      const luesSet = new Set((lues || []).map((r: { notification_id: string }) => r.notification_id));
      return (notifs || []).map((n: DbNotification) => ({ ...n, lu: luesSet.has(n.id) }));
    } catch (err) {
      warnFallback('fetchNotifications', err);
    }
  }
  return mockToDb(mockGlobalNotifications);
}

export async function markNotificationRead(notificationId: string, userId?: string | null): Promise<void> {
  if (supabase && userId) {
    try {
      await supabase
        .from('notifications_lues')
        .upsert({ notification_id: notificationId, user_id: userId }, { onConflict: 'notification_id,user_id' });
      return;
    } catch {
      /* mode démo : rien à persister */
    }
  }
}

export async function countUnread(userId?: string | null): Promise<number> {
  const notifs = await fetchNotifications(userId);
  return notifs.filter((n) => !n.lu).length;
}

export async function markAllRead(userId?: string | null): Promise<void> {
  const notifs = await fetchNotifications(userId);
  await Promise.all(notifs.filter((n) => !n.lu).map((n) => markNotificationRead(n.id, userId)));
}

export interface NotificationDraft {
  titre: string;
  contenu: string;
  type: DbNotification['type'];
  entreprise_id?: string | null;
}

/** Diffusion super admin (table notifications). Retourne l'id ou null en démo. */
export async function publishNotification(draft: NotificationDraft, userId?: string | null): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      titre: draft.titre,
      contenu: draft.contenu,
      type: draft.type,
      criticite: draft.type === 'alerte' ? 'critique' : draft.type === 'rappel' ? 'haute' : 'basse',
      cible: draft.entreprise_id ? 'entreprise' : 'tous',
      entreprise_id: draft.entreprise_id || null,
      envoye_par: userId || null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

// --- Préférences -------------------------------------------------------------------
export async function getPreferences(userId?: string | null): Promise<NotificationPreferences> {
  const local = lsGet<NotificationPreferences>(LS_PREFS, DEFAULT_NOTIFICATION_PREFERENCES);
  if (supabase && userId) {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('veille,opportunites,maj_app')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (data) return { veille: data.veille, opportunites: data.opportunites, maj_app: data.maj_app };
    } catch (err) {
      warnFallback('getPreferences', err);
    }
  }
  return local;
}

export async function savePreferences(prefs: NotificationPreferences, userId?: string | null): Promise<void> {
  lsSet(LS_PREFS, prefs);
  if (supabase && userId) {
    try {
      await supabase.from('notification_preferences').upsert(
        { user_id: userId, veille: prefs.veille, opportunites: prefs.opportunites, maj_app: prefs.maj_app },
        { onConflict: 'user_id' }
      );
    } catch {
      /* mode démo */
    }
  }
}

// --- Veille réglementaire ------------------------------------------------------------
export async function fetchVeilleNotes(
  userId?: string | null,
  opts?: { limit?: number; recentDays?: number }
): Promise<VeilleNote[]> {
  if (supabase) {
    try {
      let q = supabase
        .from('veille_notes')
        .select('id,titre,contenu,categorie,statut,is_global_broadcast,pieces,published_at,created_at')
        .eq('statut', 'publie')
        .order('published_at', { ascending: false, nullsFirst: false });
      if (opts?.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data || []) as VeilleNote[];
      if (opts?.recentDays) {
        const cutoff = Date.now() - opts.recentDays * 86400000;
        rows = rows.filter((r) => new Date(r.published_at || r.created_at).getTime() >= cutoff);
      }
      if (userId) {
        const { data: lectures } = await supabase
          .from('veille_lectures')
          .select('note_id')
          .eq('user_id', userId);
        const lus = new Set((lectures || []).map((r: { note_id: string }) => r.note_id));
        rows = rows.map((r) => ({ ...r, lu: lus.has(r.id) }));
      }
      return rows;
    } catch (err) {
      warnFallback('fetchVeilleNotes', err);
      return [];
    }
  }
  return [];
}

export async function markVeilleRead(noteId: string, userId?: string | null): Promise<void> {
  if (supabase && userId) {
    try {
      await supabase
        .from('veille_lectures')
        .upsert({ note_id: noteId, user_id: userId }, { onConflict: 'note_id,user_id' });
    } catch {
      /* mode démo */
    }
  }
}

export interface VeilleDraft {
  titre: string;
  contenu: string;
  categorie: string;
  is_global_broadcast: boolean;
  pieces: string[];
  entreprise_ids?: string[];
}

export async function publishVeilleNote(draft: VeilleDraft, userId?: string | null): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('veille_notes')
    .insert({
      titre: draft.titre,
      contenu: draft.contenu,
      categorie: draft.categorie,
      statut: 'publie',
      is_global_broadcast: draft.is_global_broadcast,
      pieces: draft.pieces,
      created_by: userId || null,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  const noteId = (data as { id: string }).id;
  if (!draft.is_global_broadcast && draft.entreprise_ids?.length) {
    await supabase.from('veille_entreprises').insert(
      draft.entreprise_ids.map((entreprise_id) => ({ note_id: noteId, entreprise_id }))
    );
  }
  return noteId;
}

export async function fetchVeilleAdmin(statut?: string): Promise<VeilleNote[]> {
  if (!supabase) return [];
  let q = supabase
    .from('veille_notes')
    .select('id,titre,contenu,categorie,statut,is_global_broadcast,pieces,published_at,created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (statut) q = q.eq('statut', statut);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as VeilleNote[];
}

export async function setVeilleStatut(noteId: string, statut: 'brouillon' | 'publie' | 'archive'): Promise<void> {  if (!supabase) return;
  const patch: Record<string, unknown> = {
    statut,
    updated_at: new Date().toISOString(),
  };
  if (statut === 'publie') patch.published_at = new Date().toISOString();
  const { error } = await supabase.from('veille_notes').update(patch).eq('id', noteId);
  if (error) throw error;
}

/** URL publique d'une pièce jointe du bucket "veille". */
export function veillePublicUrl(path: string): string | null {
  if (!supabase || !path) return null;
  const { data } = supabase.storage.from('veille').getPublicUrl(path);
  return data?.publicUrl || null;
}

/** Upload super admin vers le bucket "veille" (JO, circulaires). Retourne le chemin. */
export async function uploadVeillePiece(file: File): Promise<string> {
  if (!supabase) throw new Error('Stockage non configuré.');
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from('veille').upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

// --- Bandeau maintenance ---------------------------------------------------------------
export async function getMaintenanceBanner(): Promise<MaintenanceBannerState> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'maintenance_banner')
        .maybeSingle();
      if (error) throw error;
      const v = (data?.value || {}) as Partial<MaintenanceBannerState>;
      return { active: v.active === true, message: String(v.message || '') };
    } catch (err) {
      warnFallback('getMaintenanceBanner', err);
    }
  }
  return lsGet<MaintenanceBannerState>('lf_maintenance_banner', { active: false, message: '' });
}

export async function saveMaintenanceBanner(state: MaintenanceBannerState): Promise<void> {
  lsSet('lf_maintenance_banner', state);
  if (supabase) {
    try {
      await supabase
        .from('app_settings')
        .upsert({ key: 'maintenance_banner', value: state }, { onConflict: 'key' });
    } catch {
      /* mode démo */
    }
  }
}

export function isBannerDismissed(message: string): boolean {
  try {
    return localStorage.getItem(LS_BANNER_DISMISS) === message;
  } catch {
    return false;
  }
}
export function dismissBanner(message: string): void {
  try {
    localStorage.setItem(LS_BANNER_DISMISS, message);
  } catch {
    /* ignore */
  }
}

// --- Opt-in WhatsApp ----------------------------------------------------------------------
export async function getWhatsappState(userId?: string | null): Promise<WhatsappState> {
  const local = lsGet<WhatsappState>(LS_WHATSAPP, { number: null, optinAt: null, dismissals: 0 });
  if (supabase && userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('whatsapp_number,whatsapp_optin_at,whatsapp_popup_dismissals')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          number: (data.whatsapp_number as string) || local.number,
          optinAt: (data.whatsapp_optin_at as string) || local.optinAt,
          dismissals: Number(data.whatsapp_popup_dismissals ?? local.dismissals) || 0,
        };
      }
    } catch (err) {
      warnFallback('getWhatsappState', err);
    }
  }
  return local;
}

export async function saveWhatsappOptin(phone: string, userId?: string | null): Promise<void> {
  const number = normalizeIvorianPhone(phone);
  const state: WhatsappState = { number, optinAt: new Date().toISOString(), dismissals: 0 };
  lsSet(LS_WHATSAPP, state);
  if (supabase && userId) {
    try {
      await supabase
        .from('profiles')
        .update({ whatsapp_number: number, whatsapp_optin_at: state.optinAt, whatsapp_popup_dismissals: 0 })
        .eq('id', userId);
    } catch {
      /* mode démo */
    }
  }
}

export async function incrementPopupDismissals(userId?: string | null): Promise<number> {
  const current = await getWhatsappState(userId);
  const next = { ...current, dismissals: current.dismissals + 1 };
  lsSet(LS_WHATSAPP, next);
  if (supabase && userId) {
    try {
      await supabase
        .from('profiles')
        .update({ whatsapp_popup_dismissals: next.dismissals })
        .eq('id', userId);
    } catch {
      /* mode démo */
    }
  }
  return next.dismissals;
}

export async function clearWhatsappOptin(userId?: string | null): Promise<void> {
  const current = await getWhatsappState(userId);
  const next: WhatsappState = { ...current, number: null, optinAt: null };
  lsSet(LS_WHATSAPP, next);
  if (supabase && userId) {
    try {
      await supabase
        .from('profiles')
        .update({ whatsapp_number: null, whatsapp_optin_at: null })
        .eq('id', userId);
    } catch {
      /* mode démo */
    }
  }
}
