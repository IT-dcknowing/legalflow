import React, { useCallback, useEffect, useState } from 'react';
import {
  MessageCircle,
  RefreshCw,
  Phone,
  BadgeCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Inbox,
} from 'lucide-react';

// Suivi du numéro API WhatsApp : conversations (sessions Firestore) +
// fiche du numéro et statuts de distribution (Meta Graph API).
// Source : GET /admin/whatsapp-overview (Cloud Function, jeton dédié).

interface Conversation {
  phone: string;
  topic: string | null;
  intent: string | null;
  stage: string | null;
  regime: string | null;
  entities: string[];
  corrections: Array<{ error: string; fix: string; at: number }>;
  history: Array<{ role: string; text: string; at: number }>;
  messageCount: number;
  updatedAt: number | null;
}

interface DeliveryStatus {
  wamid: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string | null;
  errors?: unknown;
  at?: number;
}

interface OutboxFailure {
  id: string;
  to?: string;
  preview?: string;
  error?: string;
  at?: number;
}

interface Overview {
  phone: Record<string, unknown> | null;
  kpis: { conversations: number; active24h: number; delivered: number; read: number; failed: number; outboxFailures: number };
  conversations: Conversation[];
  recentStatuses: DeliveryStatus[];
  outbox: OutboxFailure[];
}

const BASE =
  (import.meta.env.VITE_WHATSAPP_FUNCTIONS_BASE as string | undefined) ||
  'https://us-central1-legalflowio.cloudfunctions.net/whatsappWebhook';
const ADMIN_TOKEN = (import.meta.env.VITE_WHATSAPP_ADMIN_TOKEN as string | undefined) || '';

function fmtDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function qualityBadge(q: unknown): string {
  if (q === 'GREEN') return 'bg-[#E7F6EE] text-[#1F9254]';
  if (q === 'YELLOW') return 'bg-[#FEF3D6] text-[#B06000]';
  if (q === 'RED') return 'bg-[#FBEAE5] text-[#C4432B]';
  return 'bg-[#F0F0F5] text-[#64748B]';
}

function statusBadge(s: string | undefined): string {
  if (s === 'read') return 'bg-[#E7F6EE] text-[#1F9254]';
  if (s === 'delivered' || s === 'sent') return 'bg-[#EDEBF9] text-[#4F46A0]';
  if (s === 'failed') return 'bg-[#FBEAE5] text-[#C4432B]';
  return 'bg-[#F0F0F5] text-[#64748B]';
}

export const WhatsappLogsPage: React.FC = () => {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!ADMIN_TOKEN) throw new Error('Jeton admin non configuré (VITE_WHATSAPP_ADMIN_TOKEN).');
      const r = await fetch(`${BASE}/admin/whatsapp-overview`, {
        headers: { 'x-admin-token': ADMIN_TOKEN },
      });
      if (r.status === 403) throw new Error('Accès refusé (jeton invalide).');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData((await r.json()) as Overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const phone = data?.phone || {};
  const phoneError = typeof phone.error === 'string' ? phone.error : null;

  return (
    <div id="pageWhatsappLogs" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-[#171A2E] m-0 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#1F9254]" /> WhatsApp Logs
          </h2>
          <p className="text-xs text-[#6B6F85] m-0 mt-0.5">
            Suivi du numéro API : conversations, distribution et échecs.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-[#1E293B] hover:bg-black disabled:opacity-60 text-white transition-colors cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Chargement…' : 'Actualiser'}
        </button>
      </div>

      {error && (
        <div className="bg-[#FBEAE5] border border-[#F5C6B8] text-[#C4432B] text-xs font-bold rounded-2xl p-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {data && (
        <>
          {/* Fiche du numéro */}
          <section className="bg-white border border-[#E5E5F0] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="text-[11px] font-bold text-[#6B6F85] uppercase tracking-wider mb-3">
              Numéro API WhatsApp Business
            </div>
            {phoneError ? (
              <p className="text-xs font-bold text-[#C4432B] m-0">{phoneError}</p>
            ) : (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-black text-[#171A2E] text-sm">
                  <Phone className="w-4 h-4 text-[#1F9254]" /> {String(phone.display_phone_number || '—')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#555870]">
                  <BadgeCheck className="w-4 h-4 text-[#4F46A0]" /> {String(phone.verified_name || '—')}
                </span>
                <span className={`font-black px-2 py-0.5 rounded-md ${qualityBadge(phone.quality_rating)}`}>
                  Qualité {String(phone.quality_rating || '—')}
                </span>
                <span className="text-[#6B6F85]">Vérification : <strong>{String(phone.code_verification_status || '—')}</strong></span>
              </div>
            )}
          </section>

          {/* KPI */}
          <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {[
              { label: 'Conversations', value: data.kpis.conversations },
              { label: 'Actives 24 h', value: data.kpis.active24h },
              { label: 'Distribués', value: data.kpis.delivered },
              { label: 'Lus', value: data.kpis.read },
              { label: 'Échecs', value: data.kpis.failed },
              { label: 'File des morts', value: data.kpis.outboxFailures },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-[#E5E5F0] rounded-2xl p-3.5 shadow-xs">
                <div className="text-[10px] font-bold text-[#6B6F85] uppercase tracking-wider">{k.label}</div>
                <div className="text-xl font-black text-[#171A2E] mt-0.5">{k.value}</div>
              </div>
            ))}
          </section>

          {/* Conversations */}
          <section className="bg-white border border-[#E5E5F0] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-[#1E293B] m-0">
              Conversations ({data.conversations.length})
            </h3>
            {data.conversations.length === 0 && (
              <p className="text-xs text-[#6B6F85] m-0">Aucune conversation enregistrée pour le moment.</p>
            )}
            {data.conversations.map((c) => {
              const open = expanded === c.phone;
              return (
                <div key={c.phone} className="border border-[#F0F0F5] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpanded(open ? null : c.phone)}
                    className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 text-left hover:bg-[#F9F9FD] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-black text-[#171A2E]">{c.phone}</span>
                      {c.stage === 'clarified' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EDEBF9] text-[#4F46A0]">clarifié</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#6B6F85] flex-wrap">
                      <span className="font-bold text-[#3D3680]">{c.topic || 'sans sujet'}</span>
                      <span>{c.intent || '—'}</span>
                      <span>{c.messageCount} msg</span>
                      {c.corrections.length > 0 && <span className="text-[#B06000] font-bold">{c.corrections.length} correction(s)</span>}
                      <span>{fmtDate(c.updatedAt)}</span>
                      {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                  {open && (
                    <div className="border-t border-[#F0F0F5] p-3 space-y-3 bg-[#FDFDFE]">
                      {c.entities.length > 0 && (
                        <div className="text-[11px] text-[#6B6F85]">
                          Entités : <strong>{c.entities.join(', ')}</strong> · Régime : <strong>{c.regime || '—'}</strong>
                        </div>
                      )}
                      {c.corrections.length > 0 && (
                        <div className="space-y-1">
                          {c.corrections.map((corr, i) => (
                            <div key={i} className="text-[11px] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-2.5 py-1.5 text-[#92400E]">
                              Correction : {corr.error} → <strong>{corr.fix}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {c.history.map((h, i) => (
                          <div
                            key={i}
                            className={`text-[11px] leading-relaxed rounded-lg px-2.5 py-1.5 max-w-[95%] ${
                              h.role === 'user'
                                ? 'bg-[#F1F5F9] text-[#1E293B] ml-auto'
                                : 'bg-[#EDEBF9] text-[#3D3680]'
                            }`}
                          >
                            {h.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* Statuts récents */}
          <section className="bg-white border border-[#E5E5F0] rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
            <h3 className="text-sm font-black text-[#1E293B] m-0">Distribution récente</h3>
            {data.recentStatuses.length === 0 && (
              <p className="text-xs text-[#6B6F85] m-0">Aucun accusé enregistré.</p>
            )}
            {data.recentStatuses.slice(0, 20).map((s) => (
              <div key={s.wamid} className="flex flex-wrap items-center justify-between gap-2 text-[11px] border-b border-[#F6F6FB] last:border-0 py-1.5">
                <span className="font-mono text-[#555870]">{s.wamid.slice(0, 26)}…</span>
                <span className="flex items-center gap-2">
                  <span className="text-[#6B6F85]">{s.recipient_id || ''}</span>
                  <span className={`font-black px-2 py-0.5 rounded-md ${statusBadge(s.status)}`}>{s.status || '?'}</span>
                  <span className="text-[#8C90A4]">{s.at ? fmtDate(s.at) : ''}</span>
                </span>
              </div>
            ))}
            {data.outbox.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[11px] font-black text-[#C4432B] uppercase tracking-wider flex items-center gap-1.5">
                  <Inbox className="w-3.5 h-3.5" /> File des morts ({data.outbox.length})
                </div>
                {data.outbox.map((o) => (
                  <div key={o.id} className="text-[11px] bg-[#FBEAE5] rounded-lg px-2.5 py-1.5 text-[#7A2E1D]">
                    <strong>{o.to}</strong> — {o.preview} <span className="text-[#C4432B]">({o.error})</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
