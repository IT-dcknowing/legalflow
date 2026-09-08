import React, { useEffect, useState } from 'react';
import { Send, Archive, RotateCcw, Paperclip, Megaphone, Save } from 'lucide-react';
import type { VeilleNote, MaintenanceBannerState } from '../types';
import {
  fetchVeilleAdmin,
  publishVeilleNote,
  setVeilleStatut,
  uploadVeillePiece,
  getMaintenanceBanner,
  saveMaintenanceBanner,
} from '../services/notifications';
import { toast } from './Toast';

// Publication super admin : brouillon → publié → archivé + pièces jointes (CDC §3).
export const VeilleAdminPanel: React.FC<{ userId?: string | null }> = ({ userId }) => {
  const [notes, setNotes] = useState<VeilleNote[]>([]);
  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [categorie, setCategorie] = useState('DGI & Fiscalité');
  const [isGlobal, setIsGlobal] = useState(true);
  const [pieces, setPieces] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const reload = async () => {
    try {
      setNotes(await fetchVeilleAdmin());
    } catch {
      toast('Chargement impossible', 'error');
    }
  };
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publish = async () => {
    if (!titre.trim() || !contenu.trim()) {
      toast('Titre et contenu requis', 'error');
      return;
    }
    try {
      await publishVeilleNote(
        { titre: titre.trim(), contenu: contenu.trim(), categorie, is_global_broadcast: isGlobal, pieces },
        userId
      );
      setTitre('');
      setContenu('');
      setPieces([]);
      toast('Note de veille publiée');
      reload();
    } catch {
      toast('Publication impossible (droits admin requis)', 'error');
    }
  };

  const changeStatut = async (id: string, statut: VeilleNote['statut']) => {
    try {
      await setVeilleStatut(id, statut);
      toast(statut === 'publie' ? 'Note publiée' : statut === 'archive' ? 'Note archivée' : 'Note en brouillon');
      reload();
    } catch {
      toast('Action impossible', 'error');
    }
  };

  const attach = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadVeillePiece(file);
      setPieces((prev) => [...prev, path]);
      toast('Pièce jointe ajoutée');
    } catch {
      toast('Upload impossible', 'error');
    } finally {
      setUploading(false);
    }
  };

  const statutBadge = (s: VeilleNote['statut']) =>
    s === 'publie'
      ? 'bg-[#E7F6EE] text-[#1F9254]'
      : s === 'archive'
      ? 'bg-[#F0F0F5] text-[#64748B]'
      : 'bg-[#FEF3D6] text-[#B06000]';

  return (
    <div className="space-y-5">
      {/* Formulaire de publication */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-black text-[#1E293B] m-0">Publier une note de veille</h3>
        <input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre de la note (ex : TVA 18 % — rappel échéance du 20)"
          className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#7C3AED]"
        />
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          rows={4}
          placeholder="Contenu Markdown (titres, listes, gras, liens)…"
          className="w-full text-xs p-2.5 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#7C3AED]"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg"
          >
            {['DGI & Fiscalité', 'CNPS & Social', 'CMU & Santé', 'FDFP & Formation', 'Douanes & Import', 'Commerce & Prix', 'Annexe Fiscale 2026'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#334155] cursor-pointer">
            <input type="checkbox" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} className="w-4 h-4" />
            Diffusion globale (sinon : ciblée)
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-[#4F46A0] cursor-pointer">
            <Paperclip className="w-4 h-4" />
            {uploading ? 'Envoi…' : 'Joindre un PDF (JO, circulaire)'}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => attach(e.target.files?.[0])}
            />
          </label>
        </div>
        {pieces.length > 0 && (
          <div className="text-[11px] text-[#64748B]">{pieces.length} pièce(s) jointe(s).</div>
        )}
        <button
          onClick={publish}
          className="px-4 py-2.5 rounded-xl text-xs font-black bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors cursor-pointer inline-flex items-center gap-2"
        >
          <Send className="w-3.5 h-3.5" /> Publier
        </button>
      </div>

      {/* Liste avec cycle de vie */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-black text-[#1E293B] m-0">Notes ({notes.length}) — brouillon → publié → archivé</h3>
        {notes.length === 0 && (
          <p className="text-xs text-[#64748B] m-0">Aucune note pour le moment (mode démo sans session : lecture seule).</p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="border border-[#F0F0F5] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-[#1E293B]">{n.titre}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statutBadge(n.statut)}`}>{n.statut}</span>
                {!n.is_global_broadcast && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EDEBF9] text-[#4F46A0]">ciblée</span>
                )}
              </div>
              <div className="text-[11px] text-[#64748B]">{n.categorie} · {new Date(n.published_at || n.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {n.statut !== 'publie' && (
                <button onClick={() => changeStatut(n.id, 'publie')} className="text-[11px] font-bold text-[#1F9254] hover:underline cursor-pointer">Publier</button>
              )}
              {n.statut !== 'brouillon' && (
                <button onClick={() => changeStatut(n.id, 'brouillon')} className="text-[11px] font-bold text-[#64748B] hover:underline cursor-pointer inline-flex items-center gap-1"><RotateCcw className="w-3 h-3" />Brouillon</button>
              )}
              {n.statut !== 'archive' && (
                <button onClick={() => changeStatut(n.id, 'archive')} className="text-[11px] font-bold text-[#B06000] hover:underline cursor-pointer inline-flex items-center gap-1"><Archive className="w-3 h-3" />Archiver</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <MaintenanceAdminCard />
    </div>
  );
};

export const MaintenanceAdminCard: React.FC = () => {
  const [state, setState] = useState<MaintenanceBannerState>({ active: false, message: '' });

  useEffect(() => {
    getMaintenanceBanner().then(setState).catch(() => undefined);
  }, []);

  const save = async () => {
    try {
      await saveMaintenanceBanner(state);
      toast('Bandeau maintenance mis à jour');
    } catch {
      toast('Enregistrement impossible', 'error');
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
      <h3 className="text-sm font-black text-[#1E293B] m-0 flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-[#7C3AED]" /> Bandeau maintenance / nouveauté
      </h3>
      <label className="flex items-center gap-2 text-xs font-semibold text-[#334155] cursor-pointer">
        <input type="checkbox" checked={state.active} onChange={(e) => setState({ ...state, active: e.target.checked })} className="w-4 h-4" />
        Afficher le bandeau à tous les utilisateurs connectés
      </label>
      <input
        value={state.message}
        onChange={(e) => setState({ ...state, message: e.target.value })}
        placeholder="Ex : Maintenance prévue ce soir à 22h"
        className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#7C3AED]"
      />
      <button
        onClick={save}
        className="px-4 py-2.5 rounded-xl text-xs font-black bg-[#1E293B] hover:bg-black text-white transition-colors cursor-pointer inline-flex items-center gap-2"
      >
        <Save className="w-3.5 h-3.5" /> Enregistrer
      </button>
    </div>
  );
};
