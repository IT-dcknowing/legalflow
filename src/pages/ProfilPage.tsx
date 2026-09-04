import React, { useState } from 'react';
import { CompanyProfile } from '../types';
import { Building2, Save, CheckCircle2 } from 'lucide-react';

interface ProfilPageProps {
  profile: CompanyProfile;
  onUpdateProfile: (updated: CompanyProfile) => void;
  onOpenSimulator: () => void;
  onOpenLaravelCode: () => void;
}

export const ProfilPage: React.FC<ProfilPageProps> = ({
  profile,
  onUpdateProfile,
  onOpenSimulator,
  onOpenLaravelCode,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CompanyProfile>(profile);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setIsEditing(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <div id="pageProfil" className="space-y-[20px]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-[12px] border border-[#E5E5F0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="m-0 text-[15px] font-extrabold text-[#171A2E]">
              Fiche Signalétique Entreprise (DGI / CNPS / RCCM)
            </h3>
            <p className="m-0 text-[12px] text-[#6B6F85]">
              Ces informations déterminent le paramétrage automatique de vos obligations et de vos échéances fiscales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="border border-[#E5E5F0] hover:bg-[#F6F6FB] px-3 py-1.5 rounded-[8px] font-bold text-[12.5px] text-[#20263A]"
          >
            {isEditing ? 'Annuler' : 'Modifier le profil'}
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-[8px] bg-[#E7F6EE] text-[#1F9254] flex items-center gap-2 font-bold text-[13px] animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4" />
          Profil mis à jour avec succès !
        </div>
      )}

      {/* Profile details */}
      <div className="bg-white border border-[#E5E5F0] rounded-[12px] p-[20px] max-w-[620px] shadow-xs">
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">Raison sociale</label>
              <input
                type="text"
                value={formData.raisonSociale}
                onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })}
                className="w-full border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">Numéro CC (Compte Contribuable)</label>
              <input
                type="text"
                value={formData.numeroCC}
                onChange={(e) => setFormData({ ...formData, numeroCC: e.target.value })}
                className="w-full border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">Forme juridique</label>
                <select
                  value={formData.formeJuridique}
                  onChange={(e) => setFormData({ ...formData, formeJuridique: e.target.value })}
                  className="w-full border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold bg-white"
                >
                  <option value="SARL">SARL</option>
                  <option value="SA">SA</option>
                  <option value="SAS">SAS</option>
                  <option value="Entreprise Individuelle">Entreprise Individuelle</option>
                </select>
              </div>
              <div>
                <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">Régime fiscal</label>
                <select
                  value={formData.regimeFiscal}
                  onChange={(e) => setFormData({ ...formData, regimeFiscal: e.target.value })}
                  className="w-full border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold bg-white"
                >
                  <option value="RSI (Régime Simplifié d'Imposition)">RSI (Régime Simplifié)</option>
                  <option value="RNE (Régime Normal d'Imposition)">RNE (Régime Normal)</option>
                  <option value="RME (Régime des Micro-Entreprises)">RME (Micro-Entreprise)</option>
                  <option value="TEE (Taxe d'État de l'Entreprenant)">TEE (Entreprenant)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">Centre des impôts (CDI)</label>
                <input
                  type="text"
                  value={formData.centreImpots}
                  onChange={(e) => setFormData({ ...formData, centreImpots: e.target.value })}
                  className="w-full border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold"
                />
              </div>
              <div>
                <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">Effectif déclaré</label>
                <input
                  type="text"
                  value={formData.effectif}
                  onChange={(e) => setFormData({ ...formData, effectif: e.target.value })}
                  className="w-full border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">Adhérent CGA</label>
              <input
                type="text"
                value={formData.adherentCGA}
                onChange={(e) => setFormData({ ...formData, adherentCGA: e.target.value })}
                className="w-full border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#4F46A0] hover:bg-[#3D3680] text-white py-2 rounded-[8px] font-bold text-[13px] flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer les modifications
            </button>
          </form>
        ) : (
          <div className="divide-y divide-[#E5E5F0]">
            <div className="py-[11px] first:pt-0">
              <div className="text-[11.5px] text-[#6B6F85] font-semibold">Raison sociale</div>
              <div className="font-bold text-[13.5px] text-[#171A2E] mt-[2px]">{profile.raisonSociale}</div>
            </div>
            <div className="py-[11px]">
              <div className="text-[11.5px] text-[#6B6F85] font-semibold">Numéro CC (Compte Contribuable)</div>
              <div className="font-bold text-[13.5px] text-[#171A2E] mt-[2px]">{profile.numeroCC}</div>
            </div>
            <div className="py-[11px]">
              <div className="text-[11.5px] text-[#6B6F85] font-semibold">Forme juridique</div>
              <div className="font-bold text-[13.5px] text-[#171A2E] mt-[2px]">{profile.formeJuridique}</div>
            </div>
            <div className="py-[11px]">
              <div className="text-[11.5px] text-[#6B6F85] font-semibold">Secteur d'activité</div>
              <div className="font-bold text-[13.5px] text-[#171A2E] mt-[2px]">{profile.secteurActivite}</div>
            </div>
            <div className="py-[11px]">
              <div className="text-[11.5px] text-[#6B6F85] font-semibold">Régime fiscal</div>
              <div className="font-bold text-[13.5px] text-[#171A2E] mt-[2px]">{profile.regimeFiscal}</div>
            </div>
            <div className="py-[11px]">
              <div className="text-[11.5px] text-[#6B6F85] font-semibold">Centre des impôts de rattachement</div>
              <div className="font-bold text-[13.5px] text-[#171A2E] mt-[2px]">{profile.centreImpots}</div>
            </div>
            <div className="py-[11px]">
              <div className="text-[11.5px] text-[#6B6F85] font-semibold">Effectif déclaré</div>
              <div className="font-bold text-[13.5px] text-[#171A2E] mt-[2px]">{profile.effectif}</div>
            </div>
            <div className="py-[11px] last:pb-0">
              <div className="text-[11.5px] text-[#6B6F85] font-semibold">Adhérent CGA</div>
              <div className="font-bold text-[13.5px] text-[#171A2E] mt-[2px]">{profile.adherentCGA}</div>
            </div>
          </div>
        )}
      </div>

      {/* Business Actions */}
      <div className="flex gap-3 flex-wrap pt-2">
        <button
          onClick={() => {
            const content = `FICHE DE SYNTHÈSE DE CONFORMITÉ FISCALE ET SOCIALE\n\n` +
              `Entreprise : ${profile.raisonSociale}\n` +
              `Numéro Compte Contribuable (NCC) : ${profile.numeroCC}\n` +
              `RCCM : ${profile.rccm || 'CI-ABJ-2022-B-11409'}\n` +
              `Régime fiscal : ${profile.regimeFiscal}\n` +
              `Centre des impôts : ${profile.centreImpots}\n` +
              `Numéro employeur CNPS : ${profile.numeroCnps || '118-2024-XXXX'}\n` +
              `Adhésion CGA : ${profile.adherentCGA}\n` +
              `Effectif : ${profile.effectif}\n\n` +
              `Certifié par Legal Flow Côte d'Ivoire.`;
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Fiche-Conformite-${profile.nom.replace(/\s+/g, '-')}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="bg-white border border-[#E5E5F0] hover:bg-[#F6F6FB] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#4F46A0] transition-colors cursor-pointer shadow-2xs"
        >
          Exporter la fiche signalétique fiscale
        </button>
      </div>
    </div>
  );
};
