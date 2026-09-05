import React, { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import type { UserRole, CompanyEntity } from '../types';
import { supabase } from '../services/supabaseClient';

export interface JournalRow {
  id: number;
  created_at: string;
  action: string;
  entite_type: string | null;
  entite_id: string | null;
  metadata: Record<string, unknown>;
  acteur: string;
}

export const ACTIONS_LABELS: Record<string, string> = {
  connexion: 'Connexion',
  deconnexion: 'Déconnexion',
  inscription_entreprise: 'Inscription entreprise',
  inscription_cabinet: 'Inscription cabinet',
  cabinet_active: 'Cabinet activé',
  cabinet_refuse: 'Cabinet refusé',
  email_sent: 'Email envoyé',
  profil_complete: 'Profil complété',
  quittance_pointee: 'Quittance pointée',
  rapport_genere: 'Rapport généré',
  acces_refuse: 'Accès refusé',
};

const PAGE_SIZE = 50;

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface JournalPageProps {
  role: UserRole;
  entreprises?: CompanyEntity[];
}

export const JournalPage: React.FC<JournalPageProps> = ({ role, entreprises = [] }) => {
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entiteFilter, setEntiteFilter] = useState<string>('');

  const load = async (offset: number, append: boolean) => {
    if (!supabase) {
      setError('Backend non configuré.');
      setLoading(false);
      return;
    }
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('journal_evenements')
        .select('id, created_at, action, entite_type, entite_id, metadata, profiles!inner(nom_complet, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (entiteFilter) query = query.eq('entite_id', entiteFilter);
      const { data, error: qErr, count } = await query;
      if (qErr) throw qErr;
      const mapped: JournalRow[] = ((data as any[]) || []).map((r) => ({
        id: r.id,
        created_at: r.created_at,
        action: r.action,
        entite_type: r.entite_type,
        entite_id: r.entite_id,
        metadata: r.metadata || {},
        acteur: r.profiles?.nom_complet || r.profiles?.email || '—',
      }));
      setRows((prev) => (append ? [...prev, ...mapped] : mapped));
      setHasMore((count || 0) > offset + PAGE_SIZE);
    } catch {
      setError('Chargement impossible. Réessayez.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    load(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entiteFilter]);

  const subtitle =
    role === 'super_admin'
      ? 'Tous les événements de la plateforme'
      : role === 'gestionnaire'
      ? 'Événements de vos entreprises clientes'
      : 'Vos événements';

  return (
    <div id="pageJournal" className="space-y-4">
      <div>
        <h2 className="text-base sm:text-lg font-black text-[#171A2E] m-0 flex items-center gap-2">
          <History className="w-5 h-5 text-[#4F46A0]" />
          <span>Journal d’audit</span>
        </h2>
        <div className="text-xs text-[#6B6F85] mt-0.5">{subtitle}</div>
      </div>

      {role === 'gestionnaire' && entreprises.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[#20263A]">Entreprise :</label>
          <select
            value={entiteFilter}
            onChange={(e) => setEntiteFilter(e.target.value)}
            className="bg-white border border-[#E5E5F0] rounded-xl px-3 py-2 text-xs font-bold text-[#20263A] focus:outline-none focus:border-[#4F46A0]"
          >
            <option value="">Toutes mes entreprises</option>
            {entreprises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.raisonSociale || e.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white border border-[#E5E5F0] rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-6 space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-[#F1F5F9] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-xs font-bold text-[#B91C1C]">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#6B6F85]">
            Aucune action enregistrée pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#555870] font-bold border-b border-[#E5E5F0]">
                  <th className="p-3">Date</th>
                  <th className="p-3">Acteur</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Cible</th>
                  <th className="p-3">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F9F9FD] align-top">
                    <td className="p-3 whitespace-nowrap text-[#1E293B] font-semibold">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="p-3 text-[#1E293B]">{r.acteur}</td>
                    <td className="p-3">
                      <span className="inline-block bg-[#EDEBF9] text-[#3D3680] font-bold px-2 py-0.5 rounded-md">
                        {ACTIONS_LABELS[r.action] || r.action}
                      </span>
                    </td>
                    <td className="p-3 text-[#555870]">
                      {r.entite_type ? `${r.entite_type} · ${String(r.entite_id || '').slice(0, 8)}` : '—'}
                    </td>
                    <td className="p-3 text-[#555870]">
                      <pre className="m-0 text-[11px] whitespace-pre-wrap break-words max-w-[280px]">
                        {JSON.stringify(r.metadata, null, 1)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center">
          <button
            onClick={() => load(rows.length, true)}
            disabled={loadingMore}
            className="bg-white hover:bg-[#F6F6FB] text-[#20263A] border border-[#E5E5F0] font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {loadingMore ? 'Chargement…' : 'Charger plus'}
          </button>
        </div>
      )}
    </div>
  );
};
