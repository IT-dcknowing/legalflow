import React, { useState, useEffect } from 'react';
import { UserCheck, Check, X } from 'lucide-react';
import { supabase, logEvent } from '../services/supabaseClient';
import { logCabinetActive, logCabinetRefuse } from '../services/journalEvents';

interface PendingCabinet {
  profileId: string;
  email: string;
  nom: string;
  createdAt: string;
  cabinetId: string;
  raisonSociale: string;
  nomGestionnaire: string | null;
  ville: string | null;
  numAgrement: string | null;
  typeCabinet: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** HQ uniquement : file des cabinets en attente + Activer / Refuser. */
export const CabinetsEnAttentePage: React.FC = () => {
  const [rows, setRows] = useState<PendingCabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [refuseTarget, setRefuseTarget] = useState<PendingCabinet | null>(null);
  const [motif, setMotif] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    if (!supabase) {
      setError('Backend non configuré.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('profiles')
        .select(
          'id, email, nom_complet, created_at, cabinet_id, cabinets!inner(raison_sociale, nom_gestionnaire, ville, num_agrement, type_cabinet)'
        )
        .eq('role', 'gestionnaire')
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: true });
      if (qErr) throw qErr;
      setRows(
        ((data as any[]) || []).map((r) => ({
          profileId: r.id,
          email: r.email,
          nom: r.nom_complet,
          createdAt: r.created_at,
          cabinetId: r.cabinet_id,
          raisonSociale: r.cabinets?.raison_sociale || '—',
          nomGestionnaire: r.cabinets?.nom_gestionnaire || null,
          ville: r.cabinets?.ville || null,
          numAgrement: r.cabinets?.num_agrement || null,
          typeCabinet: r.cabinets?.type_cabinet || null,
        }))
      );
    } catch {
      setError('Chargement impossible. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleActiver = async (row: PendingCabinet) => {
    if (!supabase || acting) return;
    if (!confirm(`Confirmer l’activation de ${row.raisonSociale} ?`)) return;
    setActing(true);
    try {
      const { error: e1 } = await supabase
        .from('profiles')
        .update({ statut: 'actif' })
        .eq('id', row.profileId);
      if (e1) throw e1;
      await supabase.from('cabinets').update({ date_activation: new Date().toISOString() }).eq('id', row.cabinetId);
      await logCabinetActive(row.cabinetId);
      await logEvent('email_sent', 'cabinet', row.cabinetId, {
        to: row.email,
        objet: 'bienvenue',
        note: 'stub : intégration SMTP/Resend à venir',
      });
      flash('Cabinet activé.');
      await load();
    } catch {
      flash('Activation impossible.');
    } finally {
      setActing(false);
    }
  };

  const handleRefuser = async () => {
    if (!supabase || !refuseTarget || acting) return;
    if (!motif.trim()) return;
    setActing(true);
    try {
      const { error: e1 } = await supabase
        .from('profiles')
        .update({ statut: 'suspendu' })
        .eq('id', refuseTarget.profileId);
      if (e1) throw e1;
      await logCabinetRefuse(refuseTarget.cabinetId, motif.trim());
      await logEvent('email_sent', 'cabinet', refuseTarget.cabinetId, {
        to: refuseTarget.email,
        objet: 'refus',
        motif: motif.trim(),
        note: 'stub : intégration SMTP/Resend à venir',
      });
      flash('Cabinet refusé.');
      setRefuseTarget(null);
      setMotif('');
      await load();
    } catch {
      flash('Refus impossible.');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base sm:text-lg font-black text-[#171A2E] m-0 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-[#4F46A0]" />
          <span>File d’attente cabinets</span>
        </h2>
        <div className="text-xs text-[#6B6F85] mt-0.5">
          {rows.length} cabinet{rows.length > 1 ? 's' : ''} en attente d’activation
        </div>
      </div>

      {toast && (
        <div className="text-xs font-bold text-[#1F9254] bg-[#E7F6EE] border border-[#A7F3D0] rounded-xl px-3 py-2.5">
          {toast}
        </div>
      )}

      <div className="bg-white border border-[#E5E5F0] rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-6 space-y-2.5">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-[#F1F5F9] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-xs font-bold text-[#B91C1C]">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#6B6F85]">
            Aucun cabinet en attente pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#555870] font-bold border-b border-[#E5E5F0]">
                  <th className="p-3">Raison sociale</th>
                  <th className="p-3">Gestionnaire</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">N° agrément</th>
                  <th className="p-3">Ville</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Inscrit le</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {rows.map((r) => (
                  <tr key={r.profileId} className="hover:bg-[#F9F9FD]">
                    <td className="p-3 font-bold text-[#1E293B]">{r.raisonSociale}</td>
                    <td className="p-3 text-[#1E293B]">{r.nomGestionnaire || r.nom}</td>
                    <td className="p-3 text-[#555870]">{r.email}</td>
                    <td className="p-3 text-[#555870]">{r.numAgrement || '—'}</td>
                    <td className="p-3 text-[#555870]">{r.ville || '—'}</td>
                    <td className="p-3 text-[#555870]">{r.typeCabinet || '—'}</td>
                    <td className="p-3 text-[#555870] whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleActiver(r)}
                          disabled={acting}
                          className="inline-flex items-center gap-1 bg-[#E7F6EE] hover:bg-[#D1FAE5] text-[#1F9254] border border-[#A7F3D0] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Activer</span>
                        </button>
                        <button
                          onClick={() => {
                            setRefuseTarget(r);
                            setMotif('');
                          }}
                          disabled={acting}
                          className="inline-flex items-center gap-1 bg-[#FBEAE5] hover:bg-[#F8B4A6]/40 text-[#C4432B] border border-[#F8B4A6] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Refuser</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {refuseTarget && (
        <div
          className="fixed inset-0 bg-[#141423]/40 flex items-center justify-center z-50 p-4"
          onClick={() => setRefuseTarget(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-[420px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="m-0 mb-1 text-[15px] font-extrabold text-[#171A2E]">
              Refuser {refuseTarget.raisonSociale} ?
            </h4>
            <p className="text-xs text-[#6B6F85] mb-3">
              Le motif sera envoyé au cabinet. Le compte passera en suspendu.
            </p>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Motif du refus (obligatoire)"
              rows={3}
              className="w-full border border-[#E5E5F0] rounded-xl px-3 py-2.5 text-xs text-[#171A2E] focus:outline-none focus:border-[#4F46A0] mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRefuseTarget(null)}
                className="text-xs font-bold text-[#64748B] hover:text-[#1E293B] px-3 py-2 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleRefuser}
                disabled={!motif.trim() || acting}
                className="bg-[#C4432B] hover:bg-[#A03522] disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
