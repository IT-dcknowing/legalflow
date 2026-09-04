import React, { useState, useEffect } from 'react';
import { CompanyProfile, CompanyEntity } from '../types';
import { X, Check, Building2, AlertTriangle, Sparkles, ShieldCheck } from 'lucide-react';

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: CompanyProfile;
  onSaveProfile: (updatedProfile: CompanyProfile) => void;
  isManagerCompletingForClient?: boolean;
  clientCompanyName?: string;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
  isManagerCompletingForClient = false,
  clientCompanyName,
}) => {
  const [formeJuridique, setFormeJuridique] = useState(currentProfile.formeJuridique || 'SARL');
  const [secteurActivite, setSecteurActivite] = useState(
    currentProfile.secteurActivite || currentProfile.secteur || 'BTP / Travaux publics'
  );
  const [regimeFiscal, setRegimeFiscal] = useState(
    currentProfile.regimeFiscal || "RSI (Régime Simplifié d'Imposition)"
  );
  const [effectifSalaries, setEffectifSalaries] = useState<number>(
    currentProfile.effectifSalaries || (parseInt(currentProfile.effectif || '0', 10) || 10)
  );
  const [caEstime, setCaEstime] = useState<number>(
    currentProfile.chiffreAffairesEstime || 120_000_000
  );
  const [numeroRccm, setNumeroRccm] = useState(currentProfile.rccm || 'CI-ABJ-2024-B-08891');
  const [numeroCnps, setNumeroCnps] = useState(currentProfile.numeroCnps || '225-IND-9912');
  const [adhesionCga, setAdhesionCga] = useState<boolean>(currentProfile.adhesionCga || false);

  useEffect(() => {
    if (isOpen) {
      setFormeJuridique(currentProfile.formeJuridique || 'SARL');
      setSecteurActivite(
        currentProfile.secteurActivite || currentProfile.secteur || 'BTP / Travaux publics'
      );
      setRegimeFiscal(currentProfile.regimeFiscal || "RSI (Régime Simplifié d'Imposition)");
      setEffectifSalaries(
        currentProfile.effectifSalaries || (parseInt(currentProfile.effectif || '0', 10) || 10)
      );
      setCaEstime(currentProfile.chiffreAffairesEstime || 120_000_000);
      setNumeroRccm(currentProfile.rccm || 'CI-ABJ-2024-B-08891');
      setNumeroCnps(currentProfile.numeroCnps || '225-IND-9912');
      setAdhesionCga(currentProfile.adhesionCga || false);
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  // Validation des 5 champs requis par la spécification
  const isValidForme = formeJuridique.trim().length > 0;
  const isValidSecteur = secteurActivite.trim().length > 0;
  const isValidRegime = regimeFiscal.trim().length > 0;
  const isValidEffectif = effectifSalaries > 0;
  const isValidCa = caEstime > 0;

  const isAllValid = isValidForme && isValidSecteur && isValidRegime && isValidEffectif && isValidCa;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllValid) return;

    const updated: CompanyProfile = {
      ...currentProfile,
      formeJuridique,
      secteur: secteurActivite,
      secteurActivite,
      regimeFiscal,
      effectifSalaries,
      effectif: `${effectifSalaries} salariés`,
      chiffreAffairesEstime: caEstime,
      rccm: numeroRccm,
      numeroCnps,
      adhesionCga,
      adherentCGA: adhesionCga ? 'Oui — CGA Agréé' : 'Non',
      profilComplet: true,
    };

    onSaveProfile(updated);
    onClose();
  };

  return (
    <div
      id="completeProfileModalOverlay"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="completeProfileModalContent"
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
                {isManagerCompletingForClient
                  ? `Compléter le profil de ${clientCompanyName || currentProfile.nom}`
                  : 'Finaliser le profil de votre entreprise'}
              </h2>
              <p className="text-xs text-[#64748B] m-0 mt-0.5">
                Renseignez les 5 critères obligatoires pour débloquer le filtrage personnalisé.
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

        {/* Note informative */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-xs text-[#475569] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
          <span>
            Dès validation, le badge <strong>« Profil incomplet »</strong> disparaîtra et l’échéancier passera automatiquement du mode générique <em>« TOUT »</em> au calcul certifié CGI 2026 / CNPS.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Forme juridique */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                1. Forme juridique <span className="text-[#DC2626]">*</span>
              </label>
              <select
                id="fieldFormeJuridique"
                value={formeJuridique}
                onChange={(e) => setFormeJuridique(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#4F46A0] focus:ring-1 focus:ring-[#4F46A0]"
                required
              >
                <option value="SARL">SARL (Société à Responsabilité Limitée)</option>
                <option value="SA">SA (Société Anonyme)</option>
                <option value="SAS">SAS (Société par Actions Simplifiée)</option>
                <option value="Entreprise Individuelle">Entreprise Individuelle (EI)</option>
                <option value="SNC">SNC (Société en Nom Collectif)</option>
              </select>
            </div>

            {/* 2. Secteur d'activité */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                2. Secteur d'activité <span className="text-[#DC2626]">*</span>
              </label>
              <select
                id="fieldSecteurActivite"
                value={secteurActivite}
                onChange={(e) => setSecteurActivite(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#4F46A0] focus:ring-1 focus:ring-[#4F46A0]"
                required
              >
                <option value="BTP / Travaux publics">BTP / Travaux publics</option>
                <option value="Commerce de gros & détail">Commerce de gros & détail</option>
                <option value="Industrie & Transformation">Industrie & Transformation</option>
                <option value="Services & Conseil">Services & Conseil</option>
                <option value="Hôtellerie & Restauration">Hôtellerie & Restauration</option>
                <option value="Transport & Logistique">Transport & Logistique</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 3. Régime fiscal */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                3. Régime fiscal <span className="text-[#DC2626]">*</span>
              </label>
              <select
                id="fieldRegimeFiscal"
                value={regimeFiscal}
                onChange={(e) => setRegimeFiscal(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#4F46A0] focus:ring-1 focus:ring-[#4F46A0]"
                required
              >
                <option value="RSI (Régime Simplifié d'Imposition)">RSI (CA ≤ 150M FCFA)</option>
                <option value="Régime du Réel Normal (RRN)">Réel Normal (CA &gt; 150M FCFA)</option>
                <option value="RME (Régime des Microentreprises)">RME (Microentreprise)</option>
                <option value="Entreprenant OHADA">Statut de l'Entreprenant</option>
              </select>
            </div>

            {/* 4. Effectif salarié */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                4. Effectif salarié <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="fieldEffectifSalaries"
                type="number"
                min="1"
                value={effectifSalaries || ''}
                onChange={(e) => setEffectifSalaries(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#4F46A0] focus:ring-1 focus:ring-[#4F46A0]"
                placeholder="Ex: 14"
                required
              />
            </div>
          </div>

          {/* 5. Chiffre d'affaires estimé */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-1">
              5. Chiffre d'affaires annuel estimé (FCFA) <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <input
                id="fieldCaEstime"
                type="number"
                min="100000"
                step="1000000"
                value={caEstime || ''}
                onChange={(e) => setCaEstime(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-xs font-semibold p-2.5 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#4F46A0] focus:ring-1 focus:ring-[#4F46A0]"
                placeholder="Ex: 180000000"
                required
              />
              <span className="absolute right-3 top-2.5 text-xs text-[#64748B] font-bold">FCFA</span>
            </div>
            <div className="text-[11px] text-[#64748B] mt-1">
              Montant formaté : <strong>{(caEstime || 0).toLocaleString('fr-FR')} FCFA</strong>
            </div>
          </div>

          {/* Champs complémentaires */}
          <div className="pt-3 border-t border-[#F1F5F9] grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          {/* Adhésion CGA */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="fieldAdhesionCga"
              checked={adhesionCga}
              onChange={(e) => setAdhesionCga(e.target.checked)}
              className="w-4 h-4 text-[#4F46A0] rounded border-gray-300 focus:ring-[#4F46A0]"
            />
            <label htmlFor="fieldAdhesionCga" className="text-xs text-[#334155] font-semibold cursor-pointer">
              Adhérent à un Centre de Gestion Agréé (CGA) — active l’abattement fiscal BIC de 20% à 25%
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
              id="btnSubmitCompleteProfile"
              type="submit"
              disabled={!isAllValid}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                isAllValid
                  ? 'bg-[#15803D] hover:bg-[#166534] text-white'
                  : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Valider le profil complet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
