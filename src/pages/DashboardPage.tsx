import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Building2,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { Obligation, PageId, CompanyProfile, OpportunityItem, FlashVeille } from '../types';
import { ObligationEngine, ObligationInstance } from '../services/obligationEngine';
import { initialCompany, initialOpportunities, initialFlashs } from '../data/mockData';
import { IncompleteProfileBanner } from '../components/IncompleteProfileBanner';

interface DashboardPageProps {
  obligations: Obligation[];
  companyProfile?: CompanyProfile;
  opportunities?: OpportunityItem[];
  flashs?: FlashVeille[];
  onOpenConfirmModal: (obligation: Obligation) => void;
  onNavigate: (page: PageId) => void;
  onOpenAssistant: () => void;
  onOpenFiche?: (ficheId: string) => void;
  onOpenCompleteModal?: () => void;
  onOpenReportModal?: () => void;
  canEditAsManager?: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  obligations,
  companyProfile = initialCompany,
  opportunities = initialOpportunities,
  flashs = initialFlashs,
  onOpenConfirmModal,
  onNavigate,
  onOpenAssistant,
  onOpenFiche,
  onOpenCompleteModal,
  onOpenReportModal,
  canEditAsManager = false,
}) => {
  const [isSecondaryExpanded, setIsSecondaryExpanded] = useState(false);

  // Moteur réglementaire officiel : Résolution dynamique basée sur le profil réel
  const quittancesMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    obligations.forEach((ob) => {
      if (ob.statut === 'accomplie' || Boolean(ob.quittanceRef)) {
        map[ob.id] = true;
      }
    });
    return map;
  }, [obligations]);

  const engineOutput = useMemo(() => {
    return ObligationEngine.resolve(companyProfile, quittancesMap);
  }, [companyProfile, quittancesMap]);

  const {
    scoreConformite,
    nombreEnRetard,
    nombreAJour,
    nombreObligationsTotal,
    prochaineEcheance,
    alertesUrgentes,
  } = engineOutput;

  // Qualification du score
  const qualification =
    scoreConformite >= 80
      ? 'Conforme — Maîtrise Déclarative'
      : scoreConformite >= 60
      ? 'Vigilance Déclarative'
      : 'Exposition Fiscale & Sociale Critique';

  // Seuil légal de chiffre d'affaires (RSI : seuil plafond vers le RNI = 500M FCFA selon Art. 45 CGI)
  const caCumule = companyProfile.chiffreAffairesEstime || 300_000_000;
  const seuilRsiPlafond = 500_000_000;
  const caRatio = Math.min(100, Math.round((caCumule / seuilRsiPlafond) * 100));

  // Jauge circulaire
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scoreConformite / 100) * circumference;

  // Opportunité et flash prioritaires
  const priorityOpp =
    opportunities.find((o) => o.status === 'a_risque') ||
    opportunities.find((o) => o.status === 'eligible_non_capte') ||
    opportunities[0];

  const topFlash =
    flashs.find((f) => f.isApplicableDossier && f.actionType === 'checklist') ||
    flashs[0];

  return (
    <div id="pageDashboard" className="space-y-6">
      {/* ⚠️ Bannière Profil Incomplet si profil non certifié */}
      {!companyProfile.profilComplet && (
        <IncompleteProfileBanner
          profile={companyProfile}
          onOpenCompleteModal={onOpenCompleteModal || (() => onNavigate('profil'))}
          canEditAsManager={canEditAsManager}
        />
      )}

      {/* 1. Entête du dossier */}
      <div
        id="dashboardHeroHeader"
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white shadow-lg bg-[radial-gradient(120%_180%_at_15%_-20%,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0)_45%),linear-gradient(135deg,#332C6B_0%,#4F46A0_50%,#7C72BA_100%)] border border-white/15"
      >
        {/* Decorative background geometry matching Accueil */}
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 hidden sm:block" aria-hidden="true">
          <span className="absolute w-72 h-72 -left-36 -top-36 border border-white rounded-full" />
          <span className="absolute w-48 h-48 -left-24 -top-24 border border-white rounded-full" />
          <span className="absolute w-28 h-28 -left-14 -top-14 bg-white/20 border border-white rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-white border border-white/20">
                <Building2 className="w-3.5 h-3.5 text-white/80" />
                {companyProfile.formeJuridique || 'SARL'} · {companyProfile.secteurActivite || companyProfile.secteur || 'BTP / Travaux publics'}
              </span>

              {!companyProfile.profilComplet && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                  ⚠️ Profil incomplet · Mode « TOUT »
                </span>
              )}

              <span className="text-[11px] text-white/85 font-medium">
                RCCM : <strong className="text-white">{companyProfile.rccm || 'CI-ABJ-2022-B-11409'}</strong>
              </span>
              <span className="text-[11px] text-white/85 font-medium">
                NCC : <strong className="text-white">{companyProfile.ncc || companyProfile.numeroCC || '2104589 A'}</strong>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">
              {companyProfile.raisonSociale || companyProfile.nom}
            </h1>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-white/90">
              <span>
                Régime :{' '}
                <strong className="text-white font-bold">{companyProfile.regimeFiscal || 'RSI (Régime Simplifié)'}</strong>
              </span>
              <span>•</span>
              <span>
                Effectif :{' '}
                <strong className="text-white font-bold">{companyProfile.effectifSalaries || 15} salariés</strong>
              </span>
              <span>•</span>
              <span>
                Centre CDI :{' '}
                <strong className="text-white font-medium">{companyProfile.centreImpots || 'CDI Yopougon 1'}</strong>
              </span>
            </div>
          </div>

          {/* Quick Counter Badges dynamiques depuis ObligationEngine */}
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
            <div className="bg-white/15 backdrop-blur-xs border border-white/20 rounded-xl px-4 py-2 text-center min-w-[105px]">
              <div className="text-2xl font-black text-[#FCA5A5] leading-none">
                {nombreEnRetard}
              </div>
              <div className="text-[10px] font-semibold text-white/80 mt-1 uppercase tracking-wider">
                En retard
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur-xs border border-white/20 rounded-xl px-4 py-2 text-center min-w-[105px]">
              <div className="text-2xl font-black text-white leading-none">
                {alertesUrgentes.length}
              </div>
              <div className="text-[10px] font-semibold text-white/80 mt-1 uppercase tracking-wider">
                Alertes urgentes
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Synthèse de Conformité Globale (Format Exécutif Pleine Largeur) */}
      <div
        id="blockScoreGlobal"
        className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F1F5F9] gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black text-[#1E293B] uppercase tracking-wider m-0">
                Score de Conformité Global
              </h2>
              <div className="text-[11px] text-[#64748B] mt-0.5">
                Calculé dynamiquement par ObligationEngine (obligations à jour : {nombreAJour} / {nombreObligationsTotal})
              </div>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border bg-white self-start sm:self-auto ${
              scoreConformite >= 75
                ? 'border-[#15803D]/40 text-[#15803D]'
                : scoreConformite >= 60
                ? 'border-[#B45309]/40 text-[#B45309]'
                : 'border-[#B91C1C]/40 text-[#B91C1C]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                scoreConformite >= 75
                  ? 'bg-[#15803D]'
                  : scoreConformite >= 60
                  ? 'bg-[#B45309]'
                  : 'bg-[#B91C1C]'
              }`}
            />
            {qualification} ({scoreConformite}%)
          </span>
        </div>

        {/* Corps du Score Global */}
        <div className="pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Zone 1 (5 cols) : Jauge circulaire & Statut */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#F1F5F9"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={scoreConformite >= 75 ? '#15803D' : scoreConformite >= 50 ? '#D97706' : '#B91C1C'}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl sm:text-3xl font-black text-[#1E293B] leading-none">
                  {scoreConformite}%
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mt-1">
                  Sur 100 pts
                </span>
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="text-sm font-extrabold text-[#1E293B] leading-tight">
                {nombreEnRetard > 0
                  ? `${nombreEnRetard} point${nombreEnRetard > 1 ? 's' : ''} à régulariser`
                  : 'Toutes les obligations sont à jour'}
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{nombreAJour} obligation{nombreAJour > 1 ? 's' : ''} validée{nombreAJour > 1 ? 's' : ''}</span>
              </div>
              <p className="text-xs text-[#64748B] m-0 leading-relaxed">
                Règles extraites du CGI 2026, du Code de Prévoyance Sociale (CNPS) et du Code du Travail adaptées au profil {companyProfile.secteur || 'BTP'}.
              </p>
            </div>
          </div>

          {/* Zone 2 (4 cols) : Risque juridique & Couverture déclarative (AUCUN montant FCFA fictif) */}
          <div className="lg:col-span-4 lg:border-l lg:border-[#F1F5F9] lg:pl-6 space-y-3.5">
            <div>
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Sanctions légales applicables
              </div>
              <div className="text-sm font-black text-[#B91C1C] mt-1 leading-snug">
                {nombreEnRetard > 0
                  ? `${nombreEnRetard} formalité${nombreEnRetard > 1 ? 's' : ''} en retard déclaratif`
                  : 'Aucune sanction encourue'}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                {nombreEnRetard > 0
                  ? 'Exposition aux sanctions légales textuelles : majoration 10% DGI (Art. 1083 CGI) et pénalité 10% CNPS (Art. 30 CPS)'
                  : 'L’ensemble des déclarations de la période est couvert par quittance libératoire'}
              </div>
            </div>

            <div className="pt-2 border-t border-[#F8FAFC]">
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Couverture déclarative
              </div>
              <div className="text-xs font-bold text-[#1E293B] mt-0.5 flex items-center gap-1.5">
                <span className="text-[#15803D] font-black">{nombreAJour}</span> sur {nombreObligationsTotal} obligations à jour
                {nombreEnRetard > 0 && (
                  <span className="text-[10px] text-[#B91C1C] font-semibold bg-[#FEF2F2] px-1.5 py-0.5 rounded">
                    · {nombreEnRetard} à régulariser
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-[#64748B] mt-1 italic m-0">
                Statut clos uniquement sur preuve (quittance libératoire).
              </p>
            </div>
          </div>

          {/* Zone 3 (3 cols) : Prochaine échéance & Navigation */}
          <div className="lg:col-span-3 lg:border-l lg:border-[#F1F5F9] lg:pl-6 flex flex-col justify-center gap-2.5">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#475569]">
                <Clock className="w-3.5 h-3.5 text-[#4F46A0]" />
                <span>Prochaine échéance</span>
              </div>
              <div className="text-xs font-black text-[#1E293B]">
                {prochaineEcheance
                  ? `${prochaineEcheance.label} — ${prochaineEcheance.dateEcheance}`
                  : 'Toutes formalités à jour'}
              </div>
              {prochaineEcheance && (
                <div className="text-[10.5px] text-[#64748B]">
                  {prochaineEcheance.teleservice} · {prochaineEcheance.baseLegale}
                </div>
              )}
            </div>

            {/* Bouton Générer mon rapport (PDF) */}
            <button
              id="btnGenerateAuditReport"
              type="button"
              onClick={onOpenReportModal}
              className="w-full bg-[#1E2337] hover:bg-[#2C334E] text-white text-xs font-black py-2.5 px-3.5 rounded-xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs border border-white/10"
              title="Générer immédiatement l'état des lieux ou le rapport d'audit"
            >
              <FileText className="w-3.5 h-3.5 text-[#818CF8]" />
              <span>{canEditAsManager ? 'Certifier & éditer le rapport' : 'Générer mon rapport (PDF)'}</span>
            </button>

            <button
              onClick={() => onNavigate('echeancier')}
              className="w-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E293B] text-xs font-bold py-2 px-3.5 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Consulter l'échéancier</span>
              <ArrowRight className="w-3 h-3 text-[#64748B]" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Priorité Haute : Alertes Urgentes (Issus du ObligationEngine, AUCUN montant FCFA) */}
      <div id="blockAlertesSemaine" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#B91C1C]" />
            <h3 className="text-xs font-black text-[#1E293B] uppercase tracking-wider m-0">
              Alertes urgentes ({alertesUrgentes.length})
            </h3>
          </div>
          <button
            onClick={() => onNavigate('echeancier')}
            className="text-xs font-bold text-[#4F46A0] hover:text-[#3D3680] hover:underline cursor-pointer"
          >
            Voir tout l'échéancier →
          </button>
        </div>

        {alertesUrgentes.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-[#15803D] mx-auto" />
            <div className="text-sm font-bold text-[#1E293B]">
              Aucune alerte urgente
            </div>
            <p className="text-xs text-[#64748B] max-w-md mx-auto m-0">
              Toutes les déclarations et cotisations vérifiées sont couvertes par des quittances libératoires.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {alertesUrgentes.map((ob) => {
              const isRetard = ob.statut === 'en_retard';
              return (
                <div
                  key={ob.ruleId}
                  id={`cardAlerte-${ob.ruleId}`}
                  className={`bg-white border rounded-xl p-4 flex flex-col justify-between gap-3.5 transition-all hover:shadow-xs ${
                    isRetard ? 'border-[#FCA5A5]' : 'border-[#E2E8F0]'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* En-tête : Pastille de statut + Téléservice */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-0.5 rounded-full border bg-white ${
                          isRetard
                            ? 'border-[#B91C1C]/40 text-[#B91C1C]'
                            : 'border-[#B45309]/40 text-[#B45309]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isRetard ? 'bg-[#B91C1C]' : 'bg-[#D97706]'
                          }`}
                        />
                        {isRetard ? `En retard (${ob.joursRetard} jours)` : 'Échéance imminente'}
                      </span>
                      <span className="text-[11px] font-semibold text-[#64748B] truncate max-w-[130px]" title={ob.teleservice}>
                        {ob.teleservice}
                      </span>
                    </div>

                    {/* Titre & Référence Légale */}
                    <div>
                      <h4 className="text-[13.5px] font-bold text-[#1E293B] leading-snug m-0">
                        {ob.label}
                      </h4>
                      <div className="text-[11px] font-semibold text-[#4F46A0] mt-0.5">
                        {ob.baseLegale}
                      </div>
                    </div>

                    {/* Échéance réelle et Sanction légale textuelle (AUCUN montant FCFA calculé) */}
                    <div className="space-y-1.5 pt-2 border-t border-[#F1F5F9] text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748B] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                          Échéance :
                        </span>
                        <strong className="text-[#1E293B] font-extrabold">{ob.dateEcheance}</strong>
                      </div>
                      <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-2.5 text-[11px] text-[#991B1B] leading-relaxed">
                        <div className="font-bold mb-0.5">Sanction légale :</div>
                        <div className="font-medium">{ob.majorationTexte}</div>
                      </div>
                    </div>
                  </div>

                  {/* Bouton d'action Pointer la quittance */}
                  <div className="pt-1">
                    <button
                      onClick={() => onOpenConfirmModal(ObligationEngine.instanceToObligation(ob))}
                      className="w-full bg-[#4F46A0] hover:bg-[#3D3680] text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Pointer la quittance</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Blocs Secondaires Réorganisés : Compteurs d'accès rapide & section synthétique discrète */}
      <div id="blockSecondaireSynthese" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-[#64748B] uppercase tracking-wider m-0">
            Modules secondaires & opportunités
          </h3>
          <button
            onClick={() => setIsSecondaryExpanded(!isSecondaryExpanded)}
            className="text-xs font-semibold text-[#64748B] hover:text-[#1E293B] inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{isSecondaryExpanded ? 'Masquer le détail' : 'Afficher le détail'}</span>
            {isSecondaryExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* 3 Compteurs scannables avec liens directs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Compteur 1 : Opportunités fiscales et sociales */}
          <div
            onClick={() => onNavigate('opportunites')}
            className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all shadow-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#15803D]" />
                <span className="text-[11px] font-bold text-[#15803D]">
                  {opportunities.length} opportunités identifiées
                </span>
              </div>
              <div className="text-xs font-bold text-[#1E293B]">
                Gisement légal optimisable
              </div>
            </div>
            <div className="text-xs font-bold text-[#4F46A0] inline-flex items-center gap-1 shrink-0">
              <span>Explorer</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Compteur 2 : Seuil de Chiffre d'Affaires RSI (Plafond 500M FCFA Art. 45 CGI) */}
          <div
            onClick={() => {
              if (onOpenFiche) {
                onOpenFiche('f-transition-regime');
              } else {
                onNavigate('bibliotheque');
              }
            }}
            className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all shadow-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${caRatio >= 90 ? 'bg-[#B91C1C]' : 'bg-[#D97706]'}`}
                />
                <span
                  className={`text-[11px] font-bold ${
                    caRatio >= 90 ? 'text-[#B91C1C]' : 'text-[#B45309]'
                  }`}
                >
                  Plafond RSI (Art. 45 CGI) : {caRatio}%
                </span>
              </div>
              <div className="text-xs font-semibold text-[#475569]">
                Régime RSI en vigueur (seuil de bascule : 500M)
              </div>
            </div>
            <div className="text-xs font-bold text-[#4F46A0] inline-flex items-center gap-1 shrink-0">
              <span>Seuils</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Compteur 3 : Veille réglementaire & Annexe */}
          <div
            onClick={() => onNavigate('veille')}
            className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all shadow-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#475569]" />
                <span className="text-[11px] font-bold text-[#475569]">
                  Veille réglementaire
                </span>
              </div>
              <div className="text-xs font-bold text-[#1E293B] line-clamp-1 max-w-[200px]">
                {topFlash.title}
              </div>
            </div>
            <div className="text-xs font-bold text-[#4F46A0] inline-flex items-center gap-1 shrink-0">
              <span>Consulter</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Section détaillée repliable */}
        {isSecondaryExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
            {/* Détail Opportunité */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-2">
              <div className="text-xs font-bold text-[#1E293B]">
                {priorityOpp.name}
              </div>
              <div className="text-[11px] text-[#64748B]">
                {priorityOpp.tagLabel} · Dispositif incitatif CGI 2026
              </div>
              <button
                onClick={() => onNavigate('opportunites')}
                className="w-full text-xs font-bold text-[#4F46A0] bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer text-center"
              >
                Ouvrir la fiche opportunité →
              </button>
            </div>

            {/* Détail Seuil RSI */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-2">
              <div className="text-xs font-bold text-[#1E293B]">
                Surveillance du régime fiscal (RSI plafond 500M)
              </div>
              <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${caRatio >= 90 ? 'bg-[#DC2626]' : 'bg-[#94A3B8]'}`}
                  style={{ width: `${caRatio}%` }}
                />
              </div>
              <button
                onClick={() => {
                  if (onOpenFiche) {
                    onOpenFiche('f-transition-regime');
                  } else {
                    onNavigate('bibliotheque');
                  }
                }}
                className="w-full text-xs font-bold text-[#4F46A0] bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer text-center"
              >
                Fiche bascule de régime →
              </button>
            </div>

            {/* Détail Flash Veille */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-2">
              <div className="text-xs font-bold text-[#1E293B]">
                {topFlash.title}
              </div>
              <div className="text-[11px] text-[#64748B]">
                Date d'effet : {topFlash.dateEffet || '2026'}
              </div>
              <button
                onClick={() => onNavigate('veille')}
                className="w-full text-xs font-bold text-[#4F46A0] bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer text-center"
              >
                Lire le texte réglementaire →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. LEGAL FLOW AI Prompt Banner */}
      <div className="border border-[#E2E8F0] bg-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#4F46A0] text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#1E293B]">
              Une interrogation sur une formalité DGI ou CNPS ?
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5">
              LEGAL FLOW AI est paramétré avec votre RCCM et votre régime fiscal ({companyProfile.regimeFiscal || 'RSI'}).
            </div>
          </div>
        </div>
        <button
          id="btnDashboardOpenAssist"
          onClick={onOpenAssistant}
          className="bg-[#4F46A0] hover:bg-[#3D3680] text-white font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-xs shrink-0 self-start sm:self-center cursor-pointer"
        >
          Interroger LEGAL FLOW AI
        </button>
      </div>
    </div>
  );
};

