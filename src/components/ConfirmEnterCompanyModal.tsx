import React from 'react';
import { Building2, ArrowRight, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { CompanyEntity } from '../types';

interface ConfirmEnterCompanyModalProps {
  isOpen: boolean;
  company: CompanyEntity | null;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ConfirmEnterCompanyModal: React.FC<ConfirmEnterCompanyModalProps> = ({
  isOpen,
  company,
  onConfirm,
  onCancel,
  onClose,
}) => {
  if (!isOpen || !company) return null;

  const handleDismiss = onCancel || onClose || (() => {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E2E8F0] overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2A2E45] to-[#3B4268] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                Basculement de contexte
              </div>
              <h3 className="text-base font-black text-white leading-snug">
                Accéder à l'espace client
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-sm text-[#374151]">
            Voulez-vous aller dans l'espace de{' '}
            <strong className="text-[#171A2E] font-extrabold text-base block mt-1">
              {company.raisonSociale || company.name}
            </strong>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-2 text-xs text-[#475569]">
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Secteur & Forme :</span>
              <span className="font-bold text-[#1E293B]">
                {company.formeJuridique || 'Non définie'} · {company.secteurActivite}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Régime fiscal :</span>
              <span className="font-bold text-[#1E293B]">
                {company.regimeFiscal || 'Non défini (Mode TOUT)'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Conformité :</span>
              <span className="font-black text-[#4F46A0]">
                {company.scoreConformite || 60}%
              </span>
            </div>
            {!company.profilComplet && (
              <div className="pt-2 border-t border-[#E2E8F0] flex items-center gap-1.5 text-[#B45309] font-medium text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Profil incomplet — vous pourrez le compléter dans son espace.</span>
              </div>
            )}
          </div>

          <p className="text-xs text-[#64748B] leading-relaxed">
            Vous consulterez le tableau de bord détaillé, l'échéancier personnalisé, la veille ciblée et les documents spécifiques à cette entreprise.
          </p>
        </div>

        {/* Actions */}
        <div className="bg-[#F8FAFC] px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-[#64748B] hover:text-[#1E293B] hover:bg-[#E2E8F0]/50 rounded-lg transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46A0] hover:bg-[#3F3785] text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <span>Oui, accéder à l'espace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
