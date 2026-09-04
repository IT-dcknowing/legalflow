import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Users,
  Briefcase,
  FileCheck2,
} from 'lucide-react';
import { CompanyEntity } from '../types';

interface GestionnaireEntreprisesPageProps {
  companies: CompanyEntity[];
  onSelectCompany: (company: CompanyEntity) => void;
  onAddNewCompany: () => void;
  onOpenCompleteModal: (company: CompanyEntity) => void;
  onOpenCertifyReport?: (company: CompanyEntity) => void;
}

export const GestionnaireEntreprisesPage: React.FC<GestionnaireEntreprisesPageProps> = ({
  companies,
  onSelectCompany,
  onAddNewCompany,
  onOpenCompleteModal,
  onOpenCertifyReport,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'complet' | 'incomplet'>('all');

  const filtered = companies.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.secteurActivite.toLowerCase().includes(search.toLowerCase()) ||
      c.regimeFiscal.toLowerCase().includes(search.toLowerCase()) ||
      c.formeJuridique.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (filter === 'complet') return c.profilComplet;
    if (filter === 'incomplet') return !c.profilComplet;
    return true;
  });

  return (
    <div id="pageGestionnaireEntreprises" className="space-y-6">
      {/* 1. Header Hub Central */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#171A2E] m-0">
              Mes entreprises
            </h1>
            <span className="bg-[#EDEBF9] text-[#4F46A0] text-xs font-black px-2.5 py-0.5 rounded-full">
              {companies.length} dossiers
            </span>
          </div>
          <p className="text-xs text-[#6B6F85] mt-1 m-0">
            Portefeuille des entreprises gérées sous mandat d'expertise comptable et juridique en Côte d'Ivoire.
          </p>
        </div>

        {/* Bouton d'action principal */}
        <button
          id="btnCreateNewCompany"
          type="button"
          onClick={onAddNewCompany}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4F46A0] hover:bg-[#3F3785] text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Créer une nouvelle entreprise</span>
        </button>
      </div>

      {/* 2. Recherche & Filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5E5F0] shadow-2xs">
        <div className="flex items-center gap-2 bg-[#F6F6FB] border border-[#E5E5F0] rounded-xl px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-[#6B6F85] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par raison sociale, secteur, régime..."
            className="w-full bg-transparent text-xs text-[#171A2E] placeholder-[#6B6F85] outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-[#171A2E] text-white'
                : 'bg-[#F6F6FB] text-[#6B6F85] hover:text-[#171A2E]'
            }`}
          >
            Toutes ({companies.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('complet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filter === 'complet'
                ? 'bg-[#10B981] text-white'
                : 'bg-[#F6F6FB] text-[#6B6F85] hover:text-[#171A2E]'
            }`}
          >
            Profil complet ({companies.filter((c) => c.profilComplet).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('incomplet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filter === 'incomplet'
                ? 'bg-[#D97706] text-white'
                : 'bg-[#F6F6FB] text-[#6B6F85] hover:text-[#171A2E]'
            }`}
          >
            Profil incomplet ({companies.filter((c) => !c.profilComplet).length})
          </button>
        </div>
      </div>

      {/* 3. Grille de Cartes d'Entreprises */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((company) => {
          const score = company.scoreConformite || 60;
          const isGood = score >= 75;
          const isCritique = score < 50;

          return (
            <div
              key={company.id}
              onClick={() => onSelectCompany(company)}
              className="bg-white rounded-2xl p-5 border border-[#E5E5F0] hover:border-[#4F46A0] hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group relative overflow-hidden"
            >
              {/* Top card info */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F6F6FB] group-hover:bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center font-black transition-colors shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {company.profilComplet ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Profil certifié</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-black bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Profil incomplet</span>
                      </span>
                    )}

                    {company.alertesCount && company.alertesCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-black bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                        {company.alertesCount} en retard
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                        À jour
                      </span>
                    )}
                  </div>
                </div>

                {/* Nom & Forme */}
                <h3 className="text-base font-black text-[#171A2E] group-hover:text-[#4F46A0] transition-colors leading-snug m-0">
                  {company.name}
                </h3>
                <div className="text-xs text-[#6B6F85] font-semibold mt-1">
                  {company.formeJuridique || 'Forme non définie'} · {company.secteurActivite || 'Secteur non défini'}
                </div>

                {/* Régime fiscal & Détails */}
                <div className="mt-3.5 space-y-1.5 text-xs text-[#475569] bg-[#FAFAFC] p-3 rounded-xl border border-[#E5E5F0]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Régime fiscal :</span>
                    <strong className="text-[#1E293B] text-right truncate max-w-[170px]">
                      {company.regimeFiscal || 'Non défini (TOUT)'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">RCCM :</span>
                    <span className="text-[#1E293B] font-mono text-[11px]">
                      {company.numeroRccm || 'À renseigner'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Effectif :</span>
                    <span className="text-[#1E293B] font-medium">
                      {company.effectif ? `${company.effectif} salariés` : 'À renseigner'}
                    </span>
                  </div>
                </div>

                {/* Score de conformité */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#6B6F85]">
                      Score de conformité :
                    </span>
                    <span
                      className={`font-black ${
                        isGood
                          ? 'text-[#10B981]'
                          : isCritique
                          ? 'text-[#DC2626]'
                          : 'text-[#D97706]'
                      }`}
                    >
                      {score}% {isCritique && '— Critique'}
                    </span>
                  </div>
                  <div className="w-full bg-[#E5E5F0] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isGood
                          ? 'bg-[#10B981]'
                          : isCritique
                          ? 'bg-[#DC2626]'
                          : 'bg-[#D97706]'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3.5 border-t border-[#E5E5F0] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {!company.profilComplet && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCompleteModal(company);
                      }}
                      className="px-2.5 py-1.5 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Compléter profil
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCertifyReport?.(company);
                    }}
                    className="px-2.5 py-1.5 bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#047857] hover:text-[#065F46] border border-[#10B981]/30 text-[11px] font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                    title="Certifier & éditer le rapport officiel"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Certifier & éditer</span>
                  </button>
                </div>

                <div className="ml-auto inline-flex items-center gap-1.5 text-xs font-black text-[#4F46A0] group-hover:translate-x-1 transition-transform">
                  <span>Accéder au dossier</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-[#E5E5F0] text-sm text-[#6B6F85]">
          Aucune entreprise ne correspond à votre recherche.
        </div>
      )}
    </div>
  );
};
