import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Scale,
  Clock,
  X,
  Upload,
  ExternalLink,
  Info,
} from 'lucide-react';
import { OpportunityItem, PageId } from '../types';

interface OpportunitesPageProps {
  opportunities: OpportunityItem[];
  onNavigate: (page: PageId) => void;
  onOpenFiche?: (ficheId: string) => void;
}

export const OpportunitesPage: React.FC<OpportunitesPageProps> = ({
  opportunities,
  onNavigate,
  onOpenFiche,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'capte' | 'a_risque' | 'eligible'>('all');
  const [selectedOppForRegularisation, setSelectedOppForRegularisation] =
    useState<OpportunityItem | null>(null);
  const [modalStep, setModalStep] = useState<number>(1);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Computations for banner
  const captedList = opportunities.filter((o) => o.status === 'obtenu');
  const aRisqueList = opportunities.filter((o) => o.status === 'a_risque');
  const eligibleNonCaptesList = opportunities.filter((o) => o.status === 'eligible_non_capte' || o.status === 'eligible');

  const totalCaptesFcfa = captedList.reduce((acc, curr) => acc + (curr.gainAnnuelFcfa || 0), 0);
  const totalPotentielsFcfa = [...aRisqueList, ...eligibleNonCaptesList].reduce(
    (acc, curr) => acc + (curr.gainAnnuelFcfa || 0),
    0
  );

  const totalAvantages = opportunities.length;
  const captedCount = captedList.length;
  const ratioCaptePct = Math.round((captedCount / (totalAvantages || 1)) * 100);

  // Filtering
  const filteredList = useMemo(() => {
    if (activeTab === 'capte') return captedList;
    if (activeTab === 'a_risque') return aRisqueList;
    if (activeTab === 'eligible') return eligibleNonCaptesList;
    return opportunities;
  }, [opportunities, activeTab, captedList, aRisqueList, eligibleNonCaptesList]);

  // Open regularisation modal
  const handleOpenRegularisation = (opp: OpportunityItem) => {
    setSelectedOppForRegularisation(opp);
    setModalStep(1);
    setUploadedFileName('');
  };

  return (
    <div id="pageOpportunites" className="space-y-6">
      {/* 1. Synthèse du score d'optimisation (Bandeau supérieur) */}
      <div
        id="bannerSyntheseOptimisation"
        className="bg-white border border-[#E5E5F0] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-stretch justify-between gap-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center shrink-0">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#171A2E] m-0">
                Optimisation Fiscale &amp; Sociale Légale
              </h2>
              <span className="text-[11px] font-bold text-[#1F9254] bg-[#E7F6EE] px-2 py-0.5 rounded-full">
                {ratioCaptePct}% d'optimisation
              </span>
            </div>
            <p className="text-xs text-[#6B6F85] mt-1 max-w-md m-0">
              Dispositifs légaux incitatifs (Code Général des Impôts, FDFP, Code des Investissements) identifiés pour votre profil d'entreprise.
            </p>
          </div>
        </div>

        {/* Metrics Blocks */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-[#E5E5F0] md:pl-6">
          <div>
            <div className="text-[11px] font-bold text-[#6B6F85] uppercase tracking-wider">
              Avantages captés
            </div>
            <div className="text-xl font-black text-[#1F9254] mt-0.5">
              {captedCount} / {totalAvantages}
            </div>
            <div className="text-[11px] text-[#6B6F85]">
              {totalCaptesFcfa.toLocaleString('fr-FR')} FCFA sécurisés
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-10 bg-[#E5E5F0]" />

          <div>
            <div className="text-[11px] font-bold text-[#6B6F85] uppercase tracking-wider">
              Gain potentiel restant
            </div>
            <div className="text-xl font-black text-[#4F46A0] mt-0.5">
              {totalPotentielsFcfa.toLocaleString('fr-FR')} FCFA / an
            </div>
            <div className="text-[11px] text-[#C4432B] font-semibold">
              {aRisqueList.length} dispositif(s) à risque
            </div>
          </div>
        </div>
      </div>

      {/* 2. Onglets de filtrage par niveau de captation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[#E5E5F0]">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#3D3680] text-white shadow-xs'
              : 'bg-white text-[#6B6F85] hover:text-[#171A2E] hover:bg-[#F6F6FB] border border-[#E5E5F0]'
          }`}
        >
          Toutes les opportunités ({opportunities.length})
        </button>

        <button
          onClick={() => setActiveTab('capte')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'capte'
              ? 'bg-[#1F9254] text-white shadow-xs'
              : 'bg-white text-[#1F9254] hover:bg-[#E7F6EE] border border-[#A5E3BE]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Captées ({captedList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('a_risque')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'a_risque'
              ? 'bg-[#C4432B] text-white shadow-xs'
              : 'bg-white text-[#C4432B] hover:bg-[#FBEAE5] border border-[#F8B4A6]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>À risque ({aRisqueList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('eligible')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'eligible'
              ? 'bg-[#4F46A0] text-white shadow-xs'
              : 'bg-white text-[#4F46A0] hover:bg-[#EDEBF9] border border-[#C7C4E8]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Éligibles non captées ({eligibleNonCaptesList.length})</span>
        </button>
      </div>

      {/* 3. Grille de cartes d'opportunités */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredList.map((opp) => {
          const isCapte = opp.status === 'obtenu';
          const isARisque = opp.status === 'a_risque';
          const isEligible = opp.status === 'eligible_non_capte' || opp.status === 'eligible';

          return (
            <div
              key={opp.id}
              id={`cardOpp-${opp.id}`}
              className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all shadow-xs ${
                isARisque
                  ? 'border-[#F8D7DA] hover:border-[#E2A0A7]'
                  : isCapte
                  ? 'border-[#D1E7DD] hover:border-[#A5E3BE]'
                  : 'border-[#E5E5F0] hover:border-[#C7C4E8]'
              }`}
            >
              <div className="space-y-3">
                {/* Header with Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      isCapte
                        ? 'bg-[#E7F6EE] text-[#1F9254]'
                        : isARisque
                        ? 'bg-[#FBEAE5] text-[#C4432B]'
                        : 'bg-[#EDEBF9] text-[#4F46A0]'
                    }`}
                  >
                    {isCapte && <CheckCircle2 className="w-3 h-3" />}
                    {isARisque && <AlertTriangle className="w-3 h-3" />}
                    {isEligible && <Sparkles className="w-3 h-3" />}
                    {opp.tagLabel}
                  </span>

                  <div className="text-right">
                    <div className="text-xs font-bold text-[#6B6F85]">Gain annuel</div>
                    <div className="text-sm font-black text-[#171A2E]">{opp.gain}</div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-[#171A2E] leading-snug m-0">
                  {opp.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-[#555870] leading-relaxed line-clamp-3 m-0">
                  {opp.description ||
                    'Dispositif légal permettant une réduction d’assiette ou un crédit d’impôt sur vos déclarations fiscales ou sociales.'}
                </p>

                {/* Legal Base & Condition */}
                <div className="space-y-1 pt-1 text-xs">
                  {opp.articleRef && (
                    <div className="text-[11px] text-[#4F46A0] font-semibold flex items-center gap-1">
                      <Scale className="w-3 h-3 shrink-0" />
                      <span>{opp.articleRef}</span>
                    </div>
                  )}

                  {opp.maintienCondition && (
                    <div
                      className={`text-[11px] p-2 rounded-lg font-medium leading-tight ${
                        isARisque
                          ? 'bg-[#FBEAE5] text-[#C4432B]'
                          : 'bg-[#F0F0F5] text-[#555870]'
                      }`}
                    >
                      <strong className="block text-[10px] uppercase tracking-wider mb-0.5">
                        Condition de maintien :
                      </strong>
                      {opp.maintienCondition}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-[#F0F0F5]">
                {isARisque ? (
                  <button
                    onClick={() => handleOpenRegularisation(opp)}
                    className="w-full bg-[#C4432B] hover:bg-[#A3341F] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Renouveler l'attestation</span>
                  </button>
                ) : isEligible ? (
                  <button
                    onClick={() => {
                      if (onOpenFiche) {
                        onOpenFiche('f-transition-regime');
                      } else {
                        onNavigate('bibliotheque');
                      }
                    }}
                    className="w-full bg-[#4F46A0] hover:bg-[#3D3680] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Activer la démarche</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('documents')}
                    className="w-full bg-[#F6F6FB] hover:bg-[#EDEBF9] text-[#3D3680] text-xs font-bold py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Voir les justificatifs archivés</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Note légale de prudence (Pied de page) */}
      <div className="bg-[#F9F9FD] border border-[#E5E5F0] rounded-2xl p-4 text-xs text-[#6B6F85] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#4F46A0] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#171A2E]">Avertissement de conformité :</strong> Les abattements et exonérations présentés ci-dessus sont strictement conformes aux dispositions du Code Général des Impôts (CGI), du Code de Prévoyance Sociale (CNPS) et de la loi relative au FDFP en République de Côte d’Ivoire. Tout bénéfice d’un régime de faveur est conditionné au respect absolu des critères d’admissibilité et à la régularité des déclarations souscrites.
        </div>
      </div>

      {/* 5. Modal de régularisation en 4 étapes */}
      {selectedOppForRegularisation && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5F0] rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#F0F0F5] pb-3">
              <div>
                <span className="text-[10px] font-black tracking-wider uppercase text-[#C4432B] bg-[#FBEAE5] px-2 py-0.5 rounded">
                  Procédure de régularisation
                </span>
                <h3 className="text-base font-bold text-[#171A2E] mt-1 m-0">
                  Renouvellement : {selectedOppForRegularisation.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOppForRegularisation(null)}
                className="p-1 rounded-lg text-[#6B6F85] hover:bg-[#F0F0F5] hover:text-[#171A2E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Header (4 steps) */}
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
              {[
                { step: 1, label: '1. Vérification' },
                { step: 2, label: '2. Demande en ligne' },
                { step: 3, label: '3. Droits de timbre' },
                { step: 4, label: '4. Téléversement' },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`p-2 rounded-lg border ${
                    modalStep === s.step
                      ? 'bg-[#4F46A0] text-white border-[#4F46A0]'
                      : modalStep > s.step
                      ? 'bg-[#E7F6EE] text-[#1F9254] border-[#A5E3BE]'
                      : 'bg-[#F9F9FD] text-[#6B6F85] border-[#E5E5F0]'
                  }`}
                >
                  {s.label}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="p-4 bg-[#F9F9FD] rounded-xl border border-[#E5E5F0] text-xs space-y-3">
              {modalStep === 1 && (
                <div className="space-y-2">
                  <div className="font-bold text-[#171A2E]">
                    Étape 1 : Contrôle préalable des quittances e-impôts
                  </div>
                  <p className="text-[#555870] leading-relaxed">
                    Avant de solliciter l'Attestation de Régularité Fiscale (ARF), assurez-vous que toutes vos déclarations TVA et acomptes BIC des 3 derniers mois ont généré une quittance validée.
                  </p>
                  <div className="p-2.5 bg-white border border-[#E5E5F0] rounded-lg text-[11px] space-y-1">
                    <div className="text-[#1F9254] font-bold">✓ Quittances TVA Juin &amp; Juillet : En règle</div>
                    <div className="text-[#C4432B] font-bold">⚠ Déclaration TVA Août : En attente de quittance de paiement</div>
                  </div>
                </div>
              )}

              {modalStep === 2 && (
                <div className="space-y-2">
                  <div className="font-bold text-[#171A2E]">
                    Étape 2 : Dépôt de la demande d'ARF sur le portail E-Impôts
                  </div>
                  <p className="text-[#555870] leading-relaxed">
                    Connectez-vous avec vos identifiants à l'espace télé-procédures de la Direction Générale des Impôts (DGI) et sélectionnez le formulaire ARF Entreprise.
                  </p>
                  <a
                    href="https://e-impots.gouv.ci"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-[#4F46A0] hover:underline"
                  >
                    <span>Accéder à e-impots.gouv.ci</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {modalStep === 3 && (
                <div className="space-y-2">
                  <div className="font-bold text-[#171A2E]">
                    Étape 3 : Paiement des droits de timbre dématérialisés
                  </div>
                  <p className="text-[#555870] leading-relaxed">
                    S'acquitter des droits de timbre fiscal (1 500 FCFA) par voie électronique (Mobile Money ou carte bancaire) directement sur le guichet DGI.
                  </p>
                  <div className="p-2.5 bg-white border border-[#E5E5F0] rounded-lg text-[11px]">
                    <strong>Référence timbre dématérialisé :</strong> À conserver pour validation du quitus.
                  </div>
                </div>
              )}

              {modalStep === 4 && (
                <div className="space-y-2">
                  <div className="font-bold text-[#171A2E]">
                    Étape 4 : Téléversement du quitus / certificat renouvelé
                  </div>
                  <p className="text-[#555870] leading-relaxed">
                    Une fois l'attestation délivrée et signée électroniquement, chargez-la dans Legal Flow pour mettre à jour la couverture et sécuriser l'exonération.
                  </p>

                  <label className="border-2 border-dashed border-[#C7C4E8] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors">
                    <Upload className="w-6 h-6 text-[#4F46A0] mb-1" />
                    <span className="font-bold text-[#4F46A0]">Sélectionner l'attestation PDF</span>
                    <span className="text-[10px] text-[#6B6F85] mt-0.5">Format PDF (max. 5 Mo)</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setUploadedFileName(file.name);
                      }}
                      className="hidden"
                    />
                  </label>

                  {uploadedFileName && (
                    <div className="text-[11px] font-bold text-[#1F9254] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Fichier prêt : {uploadedFileName}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                disabled={modalStep === 1}
                onClick={() => setModalStep((prev) => Math.max(1, prev - 1))}
                className="text-xs font-bold text-[#6B6F85] hover:text-[#171A2E] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer px-3 py-2"
              >
                ← Précédent
              </button>

              {modalStep < 4 ? (
                <button
                  onClick={() => setModalStep((prev) => Math.min(4, prev + 1))}
                  className="bg-[#4F46A0] hover:bg-[#3D3680] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Suivant →
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Update state locally or close
                    setSelectedOppForRegularisation(null);
                  }}
                  className="bg-[#1F9254] hover:bg-[#167844] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valider le renouvellement</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
