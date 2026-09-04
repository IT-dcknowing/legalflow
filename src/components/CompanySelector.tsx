import React, { useState, useRef, useEffect } from 'react';
import { CompanyEntity } from '../types';
import { Building2, ChevronDown, Check, Plus, AlertTriangle, Edit3 } from 'lucide-react';

interface CompanySelectorProps {
  companies: CompanyEntity[];
  activeCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  onAddNewCompany: () => void;
  onCompleteCompanyProfile: (company: CompanyEntity) => void;
  isGestionnaire?: boolean;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  companies,
  activeCompanyId,
  onSelectCompany,
  onAddNewCompany,
  onCompleteCompanyProfile,
  isGestionnaire = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];

  return (
    <div className="relative inline-block text-left w-full" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        id="btnCompanySelectorTrigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-left transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Entreprise active {isGestionnaire && '(Cabinet)'}
            </div>
            <div className="text-xs font-black text-[#1E293B] truncate">
              {activeCompany ? activeCompany.name : 'Sélectionner...'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!activeCompany?.profilComplet && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]"
              title="Profil fiscal incomplet"
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              Incomplet
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-[#64748B] transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="companySelectorDropdown"
          className="absolute left-0 mt-2 w-full min-w-[280px] sm:min-w-[320px] bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B] border-b border-[#F1F5F9] flex items-center justify-between">
            <span>Portefeuille ({companies.length})</span>
            <span className="text-[10px] text-[#4F46A0] font-semibold">Switch instantané</span>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
            {companies.map((comp) => {
              const isActive = comp.id === activeCompanyId;
              return (
                <div
                  key={comp.id}
                  className={`group/item flex items-center justify-between gap-2 p-2 rounded-lg border transition-all ${
                    isActive
                      ? 'bg-[#EDEBF9]/40 border-[#4F46A0]/40'
                      : 'border-transparent hover:bg-[#F8FAFC] hover:border-[#E2E8F0]'
                  }`}
                >
                  <button
                    id={`btnSwitchToCompany-${comp.id}`}
                    onClick={() => {
                      onSelectCompany(comp.id);
                      setIsOpen(false);
                    }}
                    className="flex-1 flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-[#4F46A0] text-white'
                          : 'bg-[#F1F5F9] text-[#64748B] group-hover/item:text-[#1E293B]'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#1E293B] truncate">
                          {comp.name}
                        </span>
                        {isActive && (
                          <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 bg-[#4F46A0] text-white rounded shrink-0">
                            Actif
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-[#64748B] truncate">
                        {comp.secteurActivite || 'Secteur non spécifié'} · {comp.regimeFiscal || 'Régime inconnu'}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {!comp.profilComplet ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompleteCompanyProfile(comp);
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A] transition-colors border border-[#FCD34D] cursor-pointer"
                        title="Compléter le profil de ce client à sa place"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Compléter</span>
                      </button>
                    ) : (
                      isActive && (
                        <div className="w-4 h-4 rounded-full bg-[#15803D] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add company button */}
          <div className="pt-2 px-2 border-t border-[#F1F5F9]">
            <button
              id="btnAddCompanyTrigger"
              type="button"
              onClick={() => {
                onAddNewCompany();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-[#4F46A0] bg-[#EDEBF9] hover:bg-[#D9DAF0] rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Ajouter une entreprise (Formulaire complet)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
