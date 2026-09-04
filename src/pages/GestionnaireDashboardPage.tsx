import React from 'react';
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  ExternalLink,
  Plus,
  FileCheck2,
} from 'lucide-react';
import { CompanyEntity, PageId } from '../types';

interface GestionnaireDashboardPageProps {
  companies: CompanyEntity[];
  onNavigate: (page: PageId) => void;
  onSelectCompany: (company: CompanyEntity) => void;
  onOpenCompleteModal: (company: CompanyEntity) => void;
  onAddNewCompany: () => void;
  onOpenCertifyReport?: (company: CompanyEntity) => void;
}

export const GestionnaireDashboardPage: React.FC<GestionnaireDashboardPageProps> = ({
  companies,
  onNavigate,
  onSelectCompany,
  onOpenCompleteModal,
  onAddNewCompany,
  onOpenCertifyReport,
}) => {
  const totalCompanies = companies.length;
  const incomplets = companies.filter((c) => !c.profilComplet);
  const avgScore = Math.round(
    companies.reduce((acc, c) => acc + (c.scoreConformite || 65), 0) / (totalCompanies || 1)
  );
  const alertesCountTotal = companies.reduce((acc, c) => acc + (c.alertesCount || 0), 0);

  // Mock échéances transversales du cabinet
  const echeancesUrgentes = [
    {
      id: 'ech-1',
      type: 'TVA Mensuelle',
      companyId: 'ent-koffi',
      companyName: 'Établissements Koffi BTP',
      date: '20 Août 2026',
      statut: 'en_retard',
      badge: 'En retard',
      badgeStyle: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
    },
    {
      id: 'ech-2',
      type: 'Cotisations Sociales CNPS',
      companyId: 'ent-batipro',
      companyName: 'SARL BÂTIPRO CI',
      date: '15 Sept. 2026',
      statut: 'imminent',
      badge: 'Imminent (J-10)',
      badgeStyle: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]',
    },
    {
      id: 'ech-3',
      type: 'Acompte Impôt Synthétique (ITS)',
      companyId: 'ent-alpha',
      companyName: 'Alpha Distribution CI',
      date: '10 Sept. 2026',
      statut: 'a_venir',
      badge: 'À venir',
      badgeStyle: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]',
    },
    {
      id: 'ech-4',
      type: 'Déclaration FDFP Apprentissage',
      companyId: 'ent-koffi',
      companyName: 'Établissements Koffi BTP',
      date: '20 Août 2026',
      statut: 'en_retard',
      badge: 'En retard',
      badgeStyle: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
    },
    {
      id: 'ech-5',
      type: 'Cotisation CMU Employeur',
      companyId: 'ent-nguessan',
      companyName: "ATELIER N'GUESSAN",
      date: '15 Sept. 2026',
      statut: 'imminent',
      badge: 'Imminent (J-10)',
      badgeStyle: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]',
    },
    {
      id: 'ech-6',
      type: 'Taxe sur Véhicules à Moteur (TVM)',
      companyId: 'ent-ivoire-services',
      companyName: 'Ivoire Logistique Services',
      date: '30 Sept. 2026',
      statut: 'a_venir',
      badge: 'À venir',
      badgeStyle: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]',
    },
  ];

  return (
    <div id="pageGestionnaireDashboard" className="space-y-6">
      {/* 1. Header du Gestionnaire */}
      <div className="bg-[radial-gradient(120%_180%_at_15%_-20%,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_45%),linear-gradient(135deg,#1E2337_0%,#2B3252_50%,#434D7A_100%)] rounded-2xl p-6 text-white shadow-md border border-white/10 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-white border border-white/20">
              <Building2 className="w-3.5 h-3.5" />
              <span>NIVEAU 2 — ESPACE GESTIONNAIRE & CABINET</span>
            </div>
            <h1 className="text-2xl font-black text-white m-0">
              Bonjour, Cabinet Audit & Conseils CI
            </h1>
            <p className="text-xs text-white/80 m-0 max-w-xl">
              Voici l'état de votre portefeuille aujourd'hui. Suivez les échéances consolidées, les alertes fiscales et les profils sous votre responsabilité.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('mes_entreprises')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#1E2337] rounded-xl text-xs font-black shadow-sm hover:bg-white/90 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-[#4F46A0]" />
              <span>Voir Mes entreprises</span>
            </button>
            <button
              onClick={onAddNewCompany}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4F46A0] hover:bg-[#3F3785] text-white rounded-xl text-xs font-black border border-white/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter dossier</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPIs du Portefeuille */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1 : Entreprises */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E5F0] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[#6B6F85] text-xs font-semibold">
            <span>Entreprises gérées</span>
            <Building2 className="w-4 h-4 text-[#4F46A0]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-[#171A2E]">
            {totalCompanies}
          </div>
          <div className="text-[11px] text-[#6B6F85] mt-1 font-medium">
            5 dossiers actifs en CI
          </div>
        </div>

        {/* KPI 2 : Score moyen */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E5F0] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[#6B6F85] text-xs font-semibold">
            <span>Conformité moyenne</span>
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-[#171A2E]">
            {avgScore}%
          </div>
          <div className="text-[11px] text-[#10B981] mt-1 font-bold">
            Score global portefeuille
          </div>
        </div>

        {/* KPI 3 : Alertes critiques */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E5F0] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[#6B6F85] text-xs font-semibold">
            <span>Alertes critiques</span>
            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-[#DC2626]">
            {alertesCountTotal}
          </div>
          <div className="text-[11px] text-[#DC2626] mt-1 font-bold">
            Échéances en retard
          </div>
        </div>

        {/* KPI 4 : Profils incomplets */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E5F0] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[#6B6F85] text-xs font-semibold">
            <span>Profils incomplets</span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-[#D97706]">
            {incomplets.length}
          </div>
          <div className="text-[11px] text-[#D97706] mt-1 font-bold">
            Mode générique « TOUT »
          </div>
        </div>
      </div>

      {/* 3. Bloc Urgent : Profils incomplets à certifier */}
      {incomplets.length > 0 && (
        <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-[#92400E] font-black text-sm">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
              <span>Entreprises avec profil incomplet ({incomplets.length})</span>
            </div>
            <span className="text-[11px] font-bold text-[#B45309] bg-white px-2 py-0.5 rounded-md border border-[#FDE68A]">
              Action requise du cabinet
            </span>
          </div>
          <p className="text-xs text-[#78350F] mb-4">
            Ces clients n'ont pas encore renseigné leurs 5 critères réglementaires (forme, secteur, régime fiscal, effectif, CA). Vous pouvez compléter leur profil directement pour calibrer leurs obligations.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {incomplets.map((company) => (
              <div
                key={company.id}
                className="bg-white rounded-xl p-3.5 border border-[#FDE68A] flex items-center justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="text-xs font-black text-[#171A2E]">{company.name}</div>
                  <div className="text-[11px] text-[#6B6F85]">
                    {company.secteurActivite || 'Secteur non défini'} · Créé le {company.createdAt}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenCompleteModal(company)}
                  className="px-3 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Compléter
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Deux Colonnes : Échéances urgentes & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Échéances urgentes cette semaine */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-[#E5E5F0] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#4F46A0]" />
                <h2 className="text-sm font-black text-[#171A2E] m-0">
                  Échéances urgentes cette semaine ({echeancesUrgentes.length})
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-[#6B6F85]">
                Consolidé cabinet
              </span>
            </div>

            <div className="space-y-2.5">
              {echeancesUrgentes.map((item) => {
                const comp = companies.find((c) => c.id === item.companyId);
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-[#E5E5F0] hover:border-[#CBD5E1] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFAFC]"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-black text-[#171A2E]">
                        {item.type}
                      </div>
                      <div className="text-[11px] font-semibold text-[#4F46A0] flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{item.companyName}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border ${item.badgeStyle}`}
                      >
                        {item.badge}
                      </span>
                      <span className="text-[11px] text-[#6B6F85] font-medium min-w-[70px] text-right">
                        {item.date}
                      </span>
                      {comp && (
                        <button
                          type="button"
                          onClick={() => onSelectCompany(comp)}
                          className="p-1 rounded text-[#6B6F85] hover:text-[#4F46A0] hover:bg-white transition-colors cursor-pointer"
                          title="Accéder au dossier"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E5E5F0] flex items-center justify-between text-xs">
            <span className="text-[#6B6F85]">Prochaine clôture fiscale : 15 Septembre</span>
            <button
              onClick={() => onNavigate('mes_entreprises')}
              className="text-[#4F46A0] font-black hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Gérer les dossiers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Performance par entreprise */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E5E5F0] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
                <h2 className="text-sm font-black text-[#171A2E] m-0">
                  Performance par entreprise
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-[#6B6F85]">
                Conformité CGI
              </span>
            </div>

            <div className="space-y-3.5">
              {companies.map((comp) => {
                const score = comp.scoreConformite || 60;
                const isGood = score >= 75;
                const isWarning = score >= 50 && score < 75;
                return (
                  <div
                    key={comp.id}
                    onClick={() => onSelectCompany(comp)}
                    className="p-2.5 rounded-xl border border-transparent hover:border-[#E5E5F0] hover:bg-[#F8FAFC] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-extrabold text-[#171A2E] group-hover:text-[#4F46A0] transition-colors truncate max-w-[200px]">
                        {comp.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-[11px] text-[#171A2E]">
                          {score}%
                        </span>
                        {isGood ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
                        )}
                      </div>
                    </div>

                    <div className="w-full bg-[#E5E5F0] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isGood
                            ? 'bg-[#10B981]'
                            : isWarning
                            ? 'bg-[#F59E0B]'
                            : 'bg-[#EF4444]'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#6B6F85] mt-1.5 pt-1.5 border-t border-[#F1F5F9]">
                      <span className="truncate max-w-[120px]">{comp.secteurActivite || 'Secteur non défini'}</span>
                      <div className="flex items-center gap-1.5">
                        {comp.alertesCount ? (
                          <span className="text-[#DC2626] font-bold">
                            {comp.alertesCount} en retard
                          </span>
                        ) : (
                          <span className="text-[#10B981] font-bold">À jour</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCertifyReport?.(comp);
                          }}
                          className="px-2 py-0.5 bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#047857] hover:text-[#065F46] font-bold text-[10px] rounded-md transition-all cursor-pointer inline-flex items-center gap-1 border border-[#10B981]/30"
                          title="Certifier & éditer le rapport d'audit officiel"
                        >
                          <FileCheck2 className="w-3 h-3 text-[#10B981]" />
                          <span>Certifier & éditer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E5E5F0]">
            <button
              onClick={() => onNavigate('mes_entreprises')}
              className="w-full py-2 bg-[#F6F6FB] hover:bg-[#EDEBF9] text-[#4F46A0] text-xs font-black rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Accéder à la liste complète</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
