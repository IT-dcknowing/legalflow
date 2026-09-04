import React, { useState } from 'react';
import { CompanyEntity } from '../types';
import { X, Building2, Check, ShieldCheck } from 'lucide-react';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCompany: (company: CompanyEntity) => void;
}

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({
  isOpen,
  onClose,
  onAddCompany,
}) => {
  const [name, setName] = useState('');
  const [raisonSociale, setRaisonSociale] = useState('');
  const [formeJuridique, setFormeJuridique] = useState('SARL');
  const [secteurActivite, setSecteurActivite] = useState('BTP / Travaux publics');
  const [regimeFiscal, setRegimeFiscal] = useState("RSI (Régime Simplifié d'Imposition)");
  const [caEstime, setCaEstime] = useState<number>(150_000_000);
  const [effectif, setEffectif] = useState<number>(12);
  const [adhesionCga, setAdhesionCga] = useState(true);
  const [cgaNom, setCgaNom] = useState('CGA Abidjan Lagunes');
  const [numeroCnps, setNumeroCnps] = useState('225-BTP-4491');
  const [numeroRccm, setNumeroRccm] = useState('CI-ABJ-2026-B-14022');
  const [numeroCc, setNumeroCc] = useState('2409112 A');
  const [secteurGeographique, setSecteurGeographique] = useState('Abidjan - Cocody Danga');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCompany: CompanyEntity = {
      id: `ent-${Date.now()}`,
      name: name.trim(),
      raisonSociale: raisonSociale.trim() || `${name.trim()} ${formeJuridique}`,
      formeJuridique,
      secteurActivite,
      regimeFiscal,
      caEstime: Number(caEstime) || 0,
      effectif: Number(effectif) || 0,
      adhesionCga,
      cgaNom: adhesionCga ? cgaNom : undefined,
      numeroCnps,
      numeroRccm,
      numeroCc,
      secteurGeographique,
      profilComplet: true, // Formulaire complet créé par le gestionnaire !
      createdBy: 'usr-cabinet-02',
      createdAt: new Date().toISOString().split('T')[0],
      centreImpots: 'CDI Cocody',
      scoreConformite: 85,
      alertesCount: 1,
      dossierManagerName: 'Cabinet Audit & Conseils CI',
    };

    onAddCompany(newCompany);
    onClose();
  };

  return (
    <div
      id="addCompanyModalOverlay"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="addCompanyModalContent"
        className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-5 animate-in zoom-in-95 duration-150 relative text-[#1E293B]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1E293B] m-0">
                Ajouter une nouvelle entreprise cliente
              </h2>
              <p className="text-xs text-[#64748B] m-0 mt-0.5">
                Formulaire complet gestionnaire — Crée un dossier immédiatement personnalisé.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                Nom d'usage de l'entreprise <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="fieldNewCompanyName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ivoire Génie Civil"
                className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#4F46A0]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                Raison sociale officielle
              </label>
              <input
                type="text"
                value={raisonSociale}
                onChange={(e) => setRaisonSociale(e.target.value)}
                placeholder="Ex: Ivoire Génie Civil SARL"
                className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                Forme juridique <span className="text-[#DC2626]">*</span>
              </label>
              <select
                value={formeJuridique}
                onChange={(e) => setFormeJuridique(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg"
              >
                <option value="SARL">SARL (Responsabilité Limitée)</option>
                <option value="SA">SA (Société Anonyme)</option>
                <option value="SAS">SAS (Actions Simplifiée)</option>
                <option value="Entreprise Individuelle">Entreprise Individuelle</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                Secteur d'activité <span className="text-[#DC2626]">*</span>
              </label>
              <select
                value={secteurActivite}
                onChange={(e) => setSecteurActivite(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg"
              >
                <option value="BTP / Travaux publics">BTP / Travaux publics</option>
                <option value="Commerce de gros & détail">Commerce de gros & détail</option>
                <option value="Industrie & Transformation">Industrie & Transformation</option>
                <option value="Services & Conseil">Services & Conseil</option>
                <option value="Transport & Logistique">Transport & Logistique</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                Régime fiscal <span className="text-[#DC2626]">*</span>
              </label>
              <select
                value={regimeFiscal}
                onChange={(e) => setRegimeFiscal(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg"
              >
                <option value="RSI (Régime Simplifié d'Imposition)">RSI (≤ 150M FCFA)</option>
                <option value="Régime du Réel Normal (RRN)">Réel Normal (&gt; 150M FCFA)</option>
                <option value="RME (Régime des Microentreprises)">RME</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                CA annuel estimé (FCFA) <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1000000"
                value={caEstime}
                onChange={(e) => setCaEstime(Number(e.target.value))}
                className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                Salariés <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={effectif}
                onChange={(e) => setEffectif(Number(e.target.value))}
                className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] mb-1">N° RCCM</label>
              <input
                type="text"
                value={numeroRccm}
                onChange={(e) => setNumeroRccm(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#64748B] mb-1">N° CNPS</label>
              <input
                type="text"
                value={numeroCnps}
                onChange={(e) => setNumeroCnps(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#64748B] mb-1">Compte Contribuable</label>
              <input
                type="text"
                value={numeroCc}
                onChange={(e) => setNumeroCc(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>
          </div>

          {/* Adhésion CGA */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="fieldAdhesionCgaNew"
              checked={adhesionCga}
              onChange={(e) => setAdhesionCga(e.target.checked)}
              className="w-4 h-4 text-[#4F46A0] rounded border-gray-300"
            />
            <label htmlFor="fieldAdhesionCgaNew" className="text-xs text-[#334155] font-semibold cursor-pointer">
              Entreprise membre d'un Centre de Gestion Agréé (CGA)
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              id="btnSubmitAddCompany"
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-[#4F46A0] hover:bg-[#3D3680] text-white rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Créer l'entreprise</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
