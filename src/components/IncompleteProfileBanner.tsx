import React from 'react';
import { CompanyProfile } from '../types';
import { AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';

interface IncompleteProfileBannerProps {
  profile: CompanyProfile;
  onOpenCompleteModal: () => void;
  canEditAsManager?: boolean;
}

export const IncompleteProfileBanner: React.FC<IncompleteProfileBannerProps> = ({
  profile,
  onOpenCompleteModal,
  canEditAsManager = false,
}) => {
  // Check the 5 required fields
  const hasForme = Boolean(profile.formeJuridique && profile.formeJuridique.trim().length > 0);
  const hasSecteur = Boolean((profile.secteurActivite || profile.secteur) && (profile.secteurActivite || profile.secteur).trim().length > 0);
  const hasRegime = Boolean(profile.regimeFiscal && profile.regimeFiscal.trim().length > 0);
  const hasEffectif = (profile.effectifSalaries || 0) > 0 || parseInt(profile.effectif || '0', 10) > 0;
  const hasCa = (profile.chiffreAffairesEstime || 0) > 0;

  const missingFields: string[] = [];
  if (!hasForme) missingFields.push('Forme juridique');
  if (!hasSecteur) missingFields.push("Secteur d'activité");
  if (!hasRegime) missingFields.push('Régime fiscal');
  if (!hasEffectif) missingFields.push('Effectif salarié');
  if (!hasCa) missingFields.push("Chiffre d'affaires estimé");

  const completedCount = 5 - missingFields.length;

  return (
    <div
      id="incompleteProfileBanner"
      className="bg-[#FFFBEB] border-2 border-[#FDE68A] rounded-2xl p-4 sm:p-5 shadow-xs text-[#92400E] space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] border border-[#FCD34D] text-[#D97706] flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-[#92400E] uppercase tracking-wider m-0">
                ⚠️ Profil incomplet
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#B45309] border border-[#FDE68A]">
                {completedCount}/5 critères renseignés
              </span>
            </div>

            <p className="text-xs text-[#78350F] m-0 leading-relaxed font-medium max-w-2xl">
              Complétez votre profil pour personnaliser vos échéances, opportunités et alertes. Actuellement, la plateforme fonctionne en <strong>mode générique « TOUT »</strong> (obligations et seuils généraux non filtrés).
            </p>
          </div>
        </div>

        <button
          id="btnOpenCompleteProfile"
          type="button"
          onClick={onOpenCompleteModal}
          className="self-start sm:self-center shrink-0 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
        >
          <span>{canEditAsManager ? 'Compléter pour le client' : 'Compléter mon profil'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Checklist des 5 champs obligatoires */}
      <div className="pt-2 border-t border-[#FDE68A]/60 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[11px] font-bold text-[#78350F] uppercase tracking-wider">
          Critères requis :
        </span>

        {[
          { label: 'Forme juridique', valid: hasForme },
          { label: 'Secteur', valid: hasSecteur },
          { label: 'Régime fiscal', valid: hasRegime },
          { label: 'Effectif', valid: hasEffectif },
          { label: 'CA annuel', valid: hasCa },
        ].map((c, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
              c.valid
                ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                : 'bg-white text-[#92400E] border-[#FCD34D]'
            }`}
          >
            {c.valid ? (
              <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            )}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
};
