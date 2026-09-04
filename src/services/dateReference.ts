/**
 * Horloge unique du logiciel — AMENDEMENT #2 §1.
 *
 * `dateReference` est la SEULE source de temps : jours de retard, badges J-x,
 * sections de mois et compteurs en dérivent tous.
 * Par défaut : date système réelle. Outil QA (invisible) : `?dateRef=AAAA-MM-JJ`,
 * `localStorage('legalflow.dateReference')` ou `window.__legalflow.setDateReference()`.
 */

const STORAGE_KEY = 'legalflow.dateReference';

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

/** Date de référence effective : URL > localStorage > système réel. */
export function getDateReference(): Date {
  try {
    const url = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const fromUrl = url.get('dateRef') || url.get('dateReference');
    if (fromUrl) {
      const parsed = parseIsoDate(fromUrl);
      if (parsed) return parsed;
    }
  } catch {
    /* noop */
  }
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      const parsed = parseIsoDate(stored);
      if (parsed) return parsed;
    }
  } catch {
    /* noop */
  }
  return startOfDay(new Date());
}

export function getDateReferenceOverrideIso(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

/** Force dateReference en mode test (QA). `null` = retour au système réel. */
export function setDateReferenceOverride(iso: string | null): void {
  try {
    if (!iso) localStorage.removeItem(STORAGE_KEY);
    else if (parseIsoDate(iso)) localStorage.setItem(STORAGE_KEY, iso);
  } catch {
    /* noop */
  }
}

/** Nombre de jours calendaires entre deux dates (b - a). */
export function diffDays(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** « 04 sept. 2026 » — affichage header TRÈS petit. */
export function formatDateReferenceShort(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** « 20 août 2026 » — libellés d'échéance. */
export function formatDateLong(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** « Septembre 2026 » — titres de blocs mensuels (1re lettre capitale). */
export function formatMonthLabel(d: Date): string {
  const raw = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Pilule jour/mois de la carte : { jour: '20', mois: 'AOÛT' }. */
export function pillForDate(d: Date): { jour: string; mois: string } {
  const jour = String(d.getDate()).padStart(2, '0');
  const mois = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
    .format(d)
    .replace('.', '')
    .toUpperCase();
  return { jour, mois };
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 12, 0, 0, 0);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Enregistre le crochet QA invisible : window.__legalflow.{get,set,clear}DateReference */
export function initDateReferenceQaHook(onChange?: () => void): void {
  try {
    const w = window as unknown as Record<string, unknown>;
    if (w.__legalflow) return;
    w.__legalflow = {
      getDateReference: () => toIsoDate(getDateReference()),
      setDateReference: (iso: string) => {
        setDateReferenceOverride(iso);
        onChange?.();
      },
      clearDateReference: () => {
        setDateReferenceOverride(null);
        onChange?.();
      },
    };
  } catch {
    /* noop */
  }
}
