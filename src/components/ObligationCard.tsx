import React, { useState } from 'react';
import {
  Calendar,
  FileCheck2,
  AlertTriangle,
  History,
  ExternalLink,
  BookOpen,
  Scale,
  CheckCircle2,
  Calculator,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Bell,
  EyeOff,
  Eye,
  Plus,
} from 'lucide-react';
import { Obligation } from '../types';

interface ObligationCardProps {
  obligation: Obligation;
  onOpenConfirmModal: (ob: Obligation) => void;
  onOpenSimulator: (ob: Obligation) => void;
  onOpenFiche?: (ficheId: string) => void;
}

type TabKey = 'resume' | 'reglementation' | 'historique' | 'simulation';

export const ObligationCard: React.FC<ObligationCardProps> = ({
  obligation: ob,
  onOpenConfirmModal,
  onOpenSimulator,
  onOpenFiche,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('resume');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const isAccomplie = ob.statut === 'accomplie';
  const isRetard = ob.statut === 'en_retard';

  // Badge dynamique d'échéance
  const getBadgeInfo = () => {
    if (ob.statut === 'accomplie') {
      return {
        label: 'Accomplie',
        classes: 'bg-[#E7F6EE] text-[#1F9254] border border-[#A5E3BE]',
      };
    }
    if (ob.statut === 'en_retard') {
      return {
        label: 'En retard',
        classes: 'bg-[#FBEAE5] text-[#C4432B] border border-[#F8B4A6]',
      };
    }
    if (ob.echeanceDateIso) {
      const target = new Date(ob.echeanceDateIso).getTime();
      const currentSimulated = new Date('2026-09-04').getTime();
      const diffDays = Math.ceil((target - currentSimulated) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        return {
          label: 'Aujourd’hui',
          classes: 'bg-[#FBEAE5] text-[#C4432B] border border-[#F8B4A6]',
        };
      }
      if (diffDays <= 7) {
        return {
          label: `J-${diffDays}`,
          classes: 'bg-[#FEF3D6] text-[#B06000] border border-[#FAD98D]',
        };
      }
    }
    if (ob.statut === 'imminente') {
      return {
        label: ob.tagLabel || 'Imminent',
        classes: 'bg-[#FEF3D6] text-[#B06000] border border-[#FAD98D]',
      };
    }
    return {
      label: 'À venir',
      classes: 'bg-[#F0F0F5] text-[#555870] border border-[#DCDCE6]',
    };
  };

  const badge = getBadgeInfo();
  const hasSimulation = Boolean(ob.simulation && ob.simulation.lines && ob.simulation.lines.length > 0);

  return (
    <div
      id={`rowObligation-${ob.id}`}
      className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all shadow-xs ${
        isRetard
          ? 'border-[#F8D7DA]'
          : isAccomplie
          ? 'border-[#D1E7DD] bg-[#FCFDFD]'
          : 'border-[#E5E5F0] hover:border-[#C7C4E8]'
      }`}
    >
      {/* 1. Header principal de la carte */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Date Badge + Title + Quick Info */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Day / Month Pill */}
          <div
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 font-black leading-none ${
              isRetard
                ? 'bg-[#FBEAE5] text-[#C4432B]'
                : isAccomplie
                ? 'bg-[#E7F6EE] text-[#1F9254]'
                : 'bg-[#EDEBF9] text-[#4F46A0]'
            }`}
          >
            <span className="text-base">{ob.jour}</span>
            <span className="text-[9px] uppercase tracking-tighter mt-0.5">{ob.mois}</span>
          </div>

          {/* Content */}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-[#171A2E] leading-snug m-0">{ob.titre}</h3>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${badge.classes}`}>
                {badge.label}
              </span>
              <span className="text-[11px] font-bold text-[#4F46A0] bg-[#EDEBF9] px-2 py-0.5 rounded-md">
                {ob.administration}
              </span>

              {/* Badge de coût réel sauvegardé (cliquable pour rouvrir) */}
              {hasSimulation && ob.simulation && (
                <button
                  type="button"
                  onClick={() => onOpenSimulator(ob)}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-[#047857] bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                  title="Cliquer pour modifier la simulation de coût réel"
                >
                  <Calculator className="w-3 h-3 text-[#059669]" />
                  <span>Coût réel estimé : {ob.simulation.total.toLocaleString('fr-FR')} FCFA</span>
                </button>
              )}
            </div>

            <p className="text-xs text-[#555870] leading-relaxed line-clamp-2 m-0">
              {ob.description ||
                `Déclaration périodique auprès de ${ob.administration} sous peine des sanctions prévues au code.`}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B6F85] pt-0.5">
              <span>
                Montant de base :{' '}
                <strong className="text-[#171A2E]">{ob.montantEstime || 'Variable'}</strong>
              </span>

              {ob.penaliteEstimee && isRetard && !hasSimulation && (
                <span className="text-[#C4432B] font-bold">
                  Majoration encourue : +{ob.penaliteEstimee.toLocaleString('fr-FR')} FCFA
                </span>
              )}

              {hasSimulation && ob.simulation?.datePaiementPrevue && (
                <span className="text-[#3D3680] font-semibold flex items-center gap-1 bg-[#F5F3FF] px-2 py-0.5 rounded-md">
                  <Calendar className="w-3 h-3 text-[#6366F1]" />
                  <span>
                    Paiement prévu le{' '}
                    {new Date(ob.simulation.datePaiementPrevue).toLocaleDateString('fr-FR')}
                  </span>
                  {ob.simulation.rappelActif && (
                    <span title="Rappel actif" className="inline-flex items-center">
                      <Bell className="w-3 h-3 text-[#4F46A0] inline ml-0.5" />
                    </span>
                  )}
                </span>
              )}

              {isAccomplie && ob.quittanceRef && (
                <span className="text-[#1F9254] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Réf: {ob.quittanceRef}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Les 3 Actions (Pointer, Simuler ce cas, Masquer) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
          {/* Action 1 : Pointer + Preuve */}
          {isAccomplie ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F9254] bg-[#E7F6EE] px-3 py-2 rounded-xl">
              <FileCheck2 className="w-4 h-4" />
              <span>Pointé &amp; Archivé</span>
            </div>
          ) : (
            <button
              id={`btnPointer-${ob.id}`}
              type="button"
              onClick={() => onOpenConfirmModal(ob)}
              className="bg-[#4F46A0] hover:bg-[#3D3680] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Pointer + Preuve</span>
            </button>
          )}

          {/* Action 2 : Simuler ce cas */}
          <button
            id={`btnSimuler-${ob.id}`}
            type="button"
            onClick={() => onOpenSimulator(ob)}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              hasSimulation
                ? 'bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]'
                : 'bg-[#EDEBF9] hover:bg-[#DDD8F5] text-[#3D3680] border border-[#C7C4E8]'
            }`}
            title="Ouvrir le simulateur de coût réel pour cette échéance"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{hasSimulation ? 'Modifier coût réel' : 'Simuler ce cas'}</span>
          </button>

          {/* Action 3 : Masquer / Afficher */}
          <button
            id={`btnToggleDetail-${ob.id}`}
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="bg-[#F9F9FD] hover:bg-[#EDEBF9] text-[#3D3680] border border-[#E5E5F0] text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            title={isCollapsed ? 'Développer la carte' : 'Masquer les détails de la carte'}
          >
            {isCollapsed ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Afficher</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Masquer</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Barre d'onglets (si non masquée) */}
      {!isCollapsed && (
        <div className="mt-4 pt-3 border-t border-[#F0F0F5] space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#E5E5F0] pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('resume')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'resume'
                  ? 'bg-[#3D3680] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
              }`}
            >
              <span>Résumé</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reglementation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'reglementation'
                  ? 'bg-[#3D3680] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
              }`}
            >
              <Scale className="w-3 h-3" />
              <span>Réglementation</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('historique')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'historique'
                  ? 'bg-[#3D3680] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
              }`}
            >
              <History className="w-3 h-3" />
              <span>Historique</span>
              {ob.versionHistory && ob.versionHistory.length > 0 && (
                <span className="text-[10px] bg-[#E2E8F0] text-[#475569] px-1.5 py-0.2 rounded-full">
                  {ob.versionHistory.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('simulation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'simulation'
                  ? 'bg-[#047857] text-white shadow-xs'
                  : hasSimulation
                  ? 'text-[#065F46] bg-[#ECFDF5] hover:bg-[#D1FAE5]'
                  : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
              }`}
            >
              <Calculator className="w-3 h-3" />
              <span>Ma simulation</span>
              {hasSimulation && (
                <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block animate-pulse" />
              )}
            </button>
          </div>

          {/* 3. Contenu de chaque onglet */}
          {/* A. ONGLET RÉSUMÉ */}
          {activeTab === 'resume' && (
            <div className="text-xs text-[#475569] space-y-2.5 pt-1 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#4F46A0]" />
                  <span>
                    Échéance légale :{' '}
                    <strong className="text-[#1E293B]">{ob.echeanceLabel}</strong>
                  </span>
                </div>
                <div className="text-[#64748B]">
                  Régime d'application :{' '}
                  <span className="font-semibold text-[#1E293B]">
                    {ob.periodicitePlateforme || 'Régime standard'}
                  </span>
                </div>
              </div>

              {hasSimulation && ob.simulation && (
                <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-[#166534] uppercase tracking-wider">
                      Simulation de coût attachée à cette échéance
                    </div>
                    <div className="text-xs text-[#15803D]">
                      {ob.simulation.lines.length} ligne{ob.simulation.lines.length > 1 ? 's' : ''} de
                      coût chiffrée{ob.simulation.lines.length > 1 ? 's' : ''}
                      {ob.simulation.datePaiementPrevue && (
                        <span>
                          {' '}
                          · Règlement prévu au{' '}
                          {new Date(ob.simulation.datePaiementPrevue).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[#166534]">
                      {ob.simulation.total.toLocaleString('fr-FR')} FCFA
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('simulation')}
                      className="text-xs font-bold text-[#166534] hover:underline"
                    >
                      Voir le détail →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* B. ONGLET RÉGLEMENTATION */}
          {activeTab === 'reglementation' && (
            <div className="space-y-3 pt-1 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#F9F9FD] p-3 rounded-xl border border-[#E5E5F0]/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B6F85] flex items-center gap-1">
                    <Scale className="w-3 h-3 text-[#4F46A0]" />
                    Base légale &amp; CGI
                  </div>
                  <div className="font-bold text-[#171A2E] mt-1">
                    {ob.baseLegale || 'Code Général des Impôts de Côte d’Ivoire'}
                  </div>
                </div>

                <div className="bg-[#F9F9FD] p-3 rounded-xl border border-[#E5E5F0]/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B6F85]">
                    Barème &amp; Taux en vigueur
                  </div>
                  <div className="font-bold text-[#171A2E] mt-1">
                    {ob.baremeTaux || 'Selon assiette déclarée'}
                  </div>
                </div>

                <div className="bg-[#F9F9FD] p-3 rounded-xl border border-[#E5E5F0]/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B6F85] flex items-center gap-1">
                    <ExternalLink className="w-3 h-3 text-[#4F46A0]" />
                    Plateforme officielle
                  </div>
                  <div className="font-bold text-[#4F46A0] mt-1">
                    {ob.periodicitePlateforme || 'Portail E-Impôts DGI Côte d’Ivoire'}
                  </div>
                </div>

                <div className="bg-[#F9F9FD] p-3 rounded-xl border border-[#E5E5F0]/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#C4432B] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Pénalités encourues
                  </div>
                  <div className="font-semibold text-[#C4432B] mt-1">
                    {ob.penalitesDetail ||
                      'Majoration de 10% + 1% d’intérêt moratoire par mois de retard.'}
                  </div>
                </div>
              </div>

              {onOpenFiche && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenFiche('f-transition-regime')}
                    className="text-xs font-bold text-[#4F46A0] hover:text-[#3D3680] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Consulter le guide pas-à-pas associé</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* C. ONGLET HISTORIQUE */}
          {activeTab === 'historique' && (
            <div className="space-y-2 pt-1 animate-fadeIn">
              {ob.versionHistory && ob.versionHistory.length > 0 ? (
                <div className="overflow-x-auto border border-[#E5E5F0] rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F0F0F5] text-[#555870] font-bold">
                        <th className="p-2.5">Version</th>
                        <th className="p-2.5">Date d'effet</th>
                        <th className="p-2.5">Ancienne date</th>
                        <th className="p-2.5">Nouvelle date</th>
                        <th className="p-2.5">Motif du décret / Arrêté</th>
                        <th className="p-2.5">Auteur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5F0] bg-white">
                      {ob.versionHistory.map((v, idx) => (
                        <tr key={idx} className="hover:bg-[#F9F9FD]">
                          <td className="p-2.5 font-bold text-[#4F46A0]">{v.version}</td>
                          <td className="p-2.5">{v.dateEffet}</td>
                          <td className="p-2.5 text-[#6B6F85] line-through">{v.ancienneDate}</td>
                          <td className="p-2.5 font-bold text-[#1F9254]">{v.nouvelleDate}</td>
                          <td className="p-2.5 text-[#555870]">{v.motif}</td>
                          <td className="p-2.5 text-[#6B6F85]">{v.auteur}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  Aucun changement réglementaire d'échéance enregistré pour cette obligation.
                </div>
              )}
            </div>
          )}

          {/* D. ONGLET MA SIMULATION */}
          {activeTab === 'simulation' && (
            <div className="space-y-3 pt-1 animate-fadeIn">
              {hasSimulation && ob.simulation ? (
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                    <div>
                      <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                        Détail des postes enregistrés
                      </div>
                      <div className="text-xs text-[#1E293B] font-semibold">
                        Simulé le {new Date(ob.simulation.savedAt || Date.now()).toLocaleDateString('fr-FR')}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenSimulator(ob)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F46A0] hover:text-[#3D3680] bg-white border border-[#CBD5E1] px-3 py-1.5 rounded-lg hover:border-[#4F46A0] transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Modifier dans le simulateur</span>
                    </button>
                  </div>

                  {/* Tableau des lignes */}
                  <div className="divide-y divide-[#E2E8F0] bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
                    {ob.simulation.lines.map((line) => (
                      <div key={line.id} className="flex items-center justify-between p-2.5 text-xs">
                        <span className="font-medium text-[#1E293B]">{line.label}</span>
                        <span className="font-bold text-[#0F172A]">
                          {line.montant.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bloc Total (Inter 800) & Rappel */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#171A2E] text-white rounded-xl">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                        Total validé de l'échéance
                      </div>
                      {ob.simulation.datePaiementPrevue && (
                        <div className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-[#818CF8]" />
                          <span>
                            Paiement prévu le{' '}
                            {new Date(ob.simulation.datePaiementPrevue).toLocaleDateString('fr-FR')}
                          </span>
                          {ob.simulation.rappelActif && (
                            <span className="ml-1 bg-[#4F46A0] text-white text-[10px] px-1.5 py-0.2 rounded font-bold">
                              Rappel actif
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-black text-[#34D399] tracking-tight">
                        {ob.simulation.total.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-xl space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center mx-auto">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1E293B] m-0">
                      Aucune simulation de coût enregistrée
                    </h4>
                    <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1 mb-0">
                      Chiffrez vos postes réels (montant principal, majoration 10%, intérêts moratoires) et planifiez votre date de décaissement avec rappel.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenSimulator(ob)}
                    className="bg-[#4F46A0] hover:bg-[#3D3680] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lancer le simulateur de coût</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
