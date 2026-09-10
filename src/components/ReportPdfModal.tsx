import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Clock,
  Award,
  FileText,
} from 'lucide-react';
import { CompanyProfile, Obligation, OpportunityItem, DocumentItem, UserRole } from '../types';
import { buildAuditReportData, AUDIT_MOTIFS_OPTIONS, AuditReportData } from '../data/auditReportEngine';

interface ReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyProfile: CompanyProfile;
  obligations: Obligation[];
  opportunities?: OpportunityItem[];
  initialState?: 'miroir' | 'certifie';
  userRole?: UserRole;
  onArchiveDocument?: (doc: DocumentItem) => void;
}

export const ReportPdfModal: React.FC<ReportPdfModalProps> = ({
  isOpen,
  onClose,
  companyProfile,
  obligations,
  opportunities = [],
  initialState = 'miroir',
  userRole = 'entreprise',
  onArchiveDocument,
}) => {
  const [reportState, setReportState] = useState<'miroir' | 'certifie'>(initialState);
  const [selectedMotif, setSelectedMotif] = useState<string>("Audit périodique trimestriel");
  const [archiveSuccess, setArchiveSuccess] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);

  // Synchroniser quand initialState change à l'ouverture & réinitialiser le scroll
  useEffect(() => {
      if (isOpen) {
        if (userRole === 'entreprise') {
        setReportState('miroir');
      } else {
        setReportState(initialState);
      }
      setArchiveSuccess(false);

      // S'assurer que le scroll est en haut pour afficher l'en-tête officiel
      setTimeout(() => {
        if (scrollWrapperRef.current) {
          scrollWrapperRef.current.scrollTop = 0;
        }
      }, 50);
    }
  }, [isOpen, initialState, userRole]);

  if (!isOpen) return null;

  // Construction dynamique des données de l'audit depuis l'unique source de vérité
  const reportData: AuditReportData = buildAuditReportData(
    companyProfile,
    obligations,
    opportunities,
    reportState,
    selectedMotif,
    { auditNumero: 3, initialScore: 45 }
  );

  const cleanNomEntreprise = (companyProfile.nom || 'Entreprise')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 25);
  const pdfFileName = `Rapport_Audit_Fiscal_${reportState === 'certifie' ? 'Certifie' : 'Miroir'}_${cleanNomEntreprise}_2026.pdf`;

  // Archivage automatique du rapport dans "Mes documents"
  const archiveToDocuments = () => {
    if (!onArchiveDocument) return;
    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const newDoc: DocumentItem = {
      id: `audit-doc-${Date.now()}`,
      name: pdfFileName,
      category: 'Fiscal',
      modifiedDate: "Généré à l'instant",
      size: '340 Ko',
      meta: `${reportState === 'certifie' ? 'Rapport Certifié (Visa Cabinet)' : 'Rapport Miroir (Auto-évaluation)'} · Motif : ${selectedMotif} · N° ${reportData.auditNumero}`,
      type: 'PDF',
      taille: '340 Ko',
      date: dateFormatted,
    };
    onArchiveDocument(newDoc);
    setArchiveSuccess(true);
  };

  /**
   * Impression / Ouverture haute fidélité dans un nouvel onglet avec CSS A4 et bouton d'impression
   */
  const handleOpenInNewTab = () => {
    if (!printContainerRef.current) return;
    const content = printContainerRef.current.innerHTML;
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>${pdfFileName}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=IBM+Plex+Mono:wght@400;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            background-color: #F1F5F9;
            margin: 0;
            padding: 24px 0 40px 0;
            color: #1E293B;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .action-bar-top {
            max-width: 850px;
            margin: 0 auto 16px auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 20px;
            background: #1E2337;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            color: #FFFFFF;
          }
          .btn-print-action {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #FFFFFF;
            color: #1E2337;
            font-weight: 800;
            font-size: 13px;
            padding: 8px 18px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.12);
          }
          .btn-print-action:hover {
            background: #F8FAFC;
          }
          #audit-report-print-container {
            max-width: 850px;
            margin: 0 auto;
            background: #FFFFFF;
            padding: 36px 40px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            border: 1px solid #E2E8F0;
            border-radius: 12px;
          }
          .font-display { font-family: 'Cinzel', serif; }
          .font-serif-legal { font-family: 'Newsreader', Georgia, serif; }
          .font-mono-legal { font-family: 'IBM Plex Mono', monospace; }
          .page-break-avoid { page-break-inside: avoid; }
          @media print {
            body { background: #FFFFFF; padding: 0; }
            .action-bar-top { display: none !important; }
            #audit-report-print-container {
              box-shadow: none;
              border: none;
              padding: 0;
              max-width: 100%;
            }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="action-bar-top">
          <div style="font-size: 13px; font-weight: 700;">
            Aperçu Officiel — ${reportState === 'certifie' ? 'Rapport d’Audit Fiscal Certifié' : 'Rapport d’Audit Miroir'}
          </div>
          <button class="btn-print-action" onclick="window.print()">
            🖨️ Imprimer / Sauvegarder en PDF
          </button>
        </div>
        <div id="audit-report-print-container">
          ${content}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
    archiveToDocuments();
  };

  const isNiveau2 = userRole === 'gestionnaire';

  return (
    <div
      id="reportPdfModalBackdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
    >
      <div
        id="reportPdfModalCard"
        className="bg-[#F8FAFC] w-full max-w-5xl rounded-2xl shadow-2xl border border-[#CBD5E1] flex flex-col h-[95vh] overflow-hidden"
      >
        {/* Top Control Bar (Hors Document) */}
        <div className="bg-[#1E2337] text-white px-4 py-3 sm:px-6 sm:py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Titre et statut */}
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                reportState === 'certifie' ? 'bg-[#10B981] text-white' : 'bg-[#4F46A0] text-white'
              }`}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black text-white m-0 truncate">
                    {reportState === 'certifie' ? 'Rapport d’Audit Fiscal Certifié' : 'Rapport d’Audit Miroir'}
                  </h2>
                  <span className={`text-[10px] sm:text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                    reportState === 'certifie'
                      ? 'bg-[#10B981]/20 text-[#6EE7B7] border-[#10B981]/40'
                      : 'bg-[#6366F1]/20 text-[#C7D2FE] border-[#6366F1]/40'
                  }`}>
                    {reportState === 'certifie' ? 'VISA NIVEAU 2' : 'ÉTAT DES LIEUX'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-white/70 m-0 truncate">
                  {reportState === 'certifie'
                    ? 'Document officiel opposable avec signature électronique et cachet cabinet'
                    : 'Auto-évaluation continue instantanée (en attente de visa du cabinet)'}
                </p>
              </div>
            </div>

            {/* Bouton Fermer fermement ancré en haut à droite */}
            <button
              id="btnCloseReportModal"
              type="button"
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 ml-2"
              aria-label="Fermer la fenêtre"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Deuxième ligne de contrôles : Motif, Switch Certifié/Miroir et Bouton Imprimer Blanc */}
          <div className="flex items-center justify-between flex-wrap gap-2.5 mt-3 pt-2.5 border-t border-white/10">
            <div className="flex items-center flex-wrap gap-2">
              {/* Sélecteur de Déclencheur / Motif (Brique 07) */}
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                <Clock className="w-3.5 h-3.5 text-[#A5B4FC] shrink-0" />
                <label htmlFor="auditMotifSelect" className="text-[11px] font-bold text-white/80 shrink-0">
                  Motif :
                </label>
                <select
                  id="auditMotifSelect"
                  value={selectedMotif}
                  onChange={(e) => setSelectedMotif(e.target.value)}
                  className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer pr-1"
                >
                  {AUDIT_MOTIFS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.label} className="text-[#1E293B] bg-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Commutateur d'état (Autorisé pour Niveau 2 Gestionnaire) */}
              {isNiveau2 && (
                <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15">
                  <button
                    type="button"
                    onClick={() => setReportState('certifie')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      reportState === 'certifie'
                        ? 'bg-[#10B981] text-white shadow-xs'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Certifié
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportState('miroir')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      reportState === 'miroir'
                        ? 'bg-[#4F46A0] text-white shadow-xs'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Miroir
                  </button>
                </div>
              )}
            </div>

            {/* Bouton Blanc UNIQUE : Imprimer */}
            <button
              id="btnPrintAuditReport"
              type="button"
              onClick={handleOpenInNewTab}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-[#1E2337] rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer ml-auto"
              title="Ouvrir dans un nouvel onglet pour impression ou enregistrement PDF"
            >
              <Printer className="w-4 h-4 text-[#4F46A0]" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>

        {archiveSuccess && (
          <div className="bg-[#ECFDF5] border-b border-[#A7F3D0] px-6 py-2 text-[#065F46] text-xs font-bold flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              Le rapport a été archivé avec succès dans « Mes documents » ({pdfFileName}).
            </span>
            <span className="text-[11px] font-semibold text-[#047857]">Dossier fiscal à jour</span>
          </div>
        )}

        {/* Corps Scrollable avec le rendu de la page A4 (850px standard) */}
        <div
          ref={scrollWrapperRef}
          className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#EEF2F6] flex justify-center"
        >
          <div
            id="audit-report-document"
            ref={printContainerRef}
            className="w-full max-w-[850px] bg-white text-[#1E293B] shadow-lg rounded-xl border border-[#E2E8F0] p-6 sm:p-10 space-y-7 self-start"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            {/* 1. EN-TÊTE OFFICIEL RÉPUBLIQUE DE CÔTE D'IVOIRE & MINISTÈRE */}
            <div className="border-b-2 border-[#1E293B] pb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-0.5 text-left">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">
                    RÉPUBLIQUE DE CÔTE D'IVOIRE
                  </div>
                  <div className="text-[11px] font-bold text-[#1E293B]">
                    Union — Discipline — Travail
                  </div>
                  <div className="text-[10px] text-[#475569] font-medium mt-1">
                    Ministère du Budget et des Finances · Direction Générale des Impôts (DGI)
                  </div>
                  <div className="text-[10px] text-[#475569] font-medium">
                    Caisse Nationale de Prévoyance Sociale (CNPS) · Caisse Nationale d'Assurance Maladie (CMU)
                  </div>
                </div>

                {/* Badge d'Authentification / Statut du document */}
                <div className="text-left sm:text-right flex flex-col sm:items-end">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-black tracking-wider uppercase border ${
                    reportData.isCertifie
                      ? 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30'
                      : 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/30'
                  }`}>
                    {reportData.isCertifie ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
                        <span>VISA ÉLECTRONIQUE CERTIFIÉ</span>
                      </>
                    ) : (
                      <>
                        <FileCheck2 className="w-3.5 h-3.5 text-[#B45309]" />
                        <span>RAPPORT MIROIR · AUTO-ÉVALUATION</span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-1 font-mono">
                    Réf : <strong className="text-[#1E293B]">{reportData.referenceDossier}</strong>
                  </div>
                  <div className="text-[10px] text-[#64748B]">
                    Date d'audit : <strong>{reportData.auditDate}</strong>
                  </div>
                </div>
              </div>

              {/* Titre Majeur du Document */}
              <div className="mt-5 text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight uppercase m-0" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
                  RAPPORT D’AUDIT & DE CONFORMITÉ RÉGLEMENTAIRE
                </h1>
                <p className="text-xs text-[#4F46A0] font-bold m-0 italic">
                  {reportData.auditMotif} n° {reportData.auditNumero} — {reportData.entreprise.raisonSociale}
                </p>
                <p className="text-[11px] text-[#64748B] m-0">
                  {reportData.isCertifie
                    ? 'Document certifié par le cabinet d’expertise comptable sous mandat de révision professionnelle'
                    : 'État des lieux — auto-évaluation assistée, en attente de revue cabinet'}
                </p>
              </div>
            </div>

            {/* 1. BIS — FICHE SIGNALÉTIQUE ENTREPRISE (5 CHAMPS + IDENTIFIANTS) */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="font-black text-[#1E293B] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#4F46A0]" />
                  Identification de l'Assujetti (Référentiel Fiscale CI)
                </span>
                <span className="text-[11px] text-[#64748B]">
                  Centre des Impôts : <strong className="text-[#1E293B]">{reportData.entreprise.centreImpots}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-[#64748B] block">Raison Sociale :</span>
                  <strong className="text-[#1E293B] font-bold">{reportData.entreprise.raisonSociale}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Forme Juridique :</span>
                  <strong className="text-[#1E293B] font-bold">{reportData.entreprise.formeJuridique}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Régime Fiscal :</span>
                  <strong className="text-[#1E293B] font-bold">{reportData.entreprise.regimeFiscal}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Secteur d'Activité :</span>
                  <strong className="text-[#1E293B] font-bold">{reportData.entreprise.secteurActivite}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">N° Compte Contribuable (NCC) :</span>
                  <strong className="text-[#1E293B] font-mono break-all">{reportData.entreprise.ncc}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Registre Commerce (RCCM) :</span>
                  <strong className="text-[#1E293B] font-mono break-all">{reportData.entreprise.rccm}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Numéro Employeur CNPS :</span>
                  <strong className="text-[#1E293B] font-mono break-all">{reportData.entreprise.numeroCnps}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Effectif Déclaré :</span>
                  <strong className="text-[#1E293B] font-bold">{reportData.entreprise.effectifSalaries} salariés</strong>
                </div>
              </div>
            </div>

            {/* 2. SYNTHÈSE EXÉCUTIVE (4 CARTES + TRAJECTOIRE DU SCORE + LECTURE DU CABINET) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1E293B] m-0">
                  2. Synthèse Exécutive & Trajectoire de Conformité
                </h3>
                <span className="text-[11px] font-bold text-[#4F46A0]">
                  Trajectoire : {reportData.trajectoireScore}
                </span>
              </div>

              {/* 4 Cartes KPI */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Score */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    Score Global
                  </div>
                  <div className={`text-2xl font-black mt-1 ${
                    reportData.conformityScore >= 75
                      ? 'text-[#15803D]'
                      : reportData.conformityScore >= 60
                      ? 'text-[#B45309]'
                      : 'text-[#B91C1C]'
                  }`}>
                    {reportData.conformityScore} %
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">
                    {reportData.qualification.split('·')[0]}
                  </div>
                </div>

                {/* Exposition Pénalités */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    Exposition Résiduelle
                  </div>
                  <div className={`text-xl font-black mt-1 ${
                    reportData.expositionResiduelleFcfa === 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                  }`}>
                    {reportData.expositionResiduelleFcfa.toLocaleString('fr-FR')} F
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">
                    {reportData.expositionResiduelleFcfa === 0 ? 'Aucune majoration' : 'Risque DGI & CNPS'}
                  </div>
                </div>

                {/* Couverture Déclarative */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    Couverture Déclarative
                  </div>
                  <div className="text-xl font-black text-[#1E293B] mt-1">
                    {reportData.couvertureDeclarativeText.split(' ')[0]} / {reportData.couvertureDeclarativeText.split(' ')[2]}
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">
                    Obligations à jour
                  </div>
                </div>

                {/* Gisement d'Optimisation */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    Gisement Captable
                  </div>
                  <div className="text-xl font-black text-[#4F46A0] mt-1">
                    {(reportData.gainACapterAnnuelFcfa / 1000).toFixed(0)} k F
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">
                    Économies annuelles CGI
                  </div>
                </div>
              </div>

              {/* Lecture du Cabinet */}
              <div className="bg-[#F1F5F9] border-l-4 border-[#4F46A0] p-3 rounded-r-xl">
                <div className="text-[11px] font-black text-[#1E293B] uppercase tracking-wider mb-1">
                  Lecture Analytique du Cabinet (Brique Révision) :
                </div>
                <p className="text-xs text-[#334155] m-0 leading-relaxed font-serif-legal">
                  {reportData.lectureDuCabinetText}
                </p>
              </div>
            </div>

            {/* 3. MÉTHODOLOGIE & RÉFÉRENTIEL COUVERT (CORRIGÉ : AUCUNE TRONCATURE) */}
            <div className="space-y-2.5 page-break-avoid">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1E293B] m-0">
                3. Méthodologie & Périmètre d’Instruction Réglementaire
              </h3>
              <p className="text-xs text-[#475569] m-0 leading-relaxed">
                {reportData.methodologieText}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {reportData.impotsCouvertsList.map((impot, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[#334155] bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-lg text-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4F46A0] shrink-0 mt-1.5" />
                    <span className="font-medium text-[11px] leading-snug">{impot}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. ÉCARTS IDENTIFIÉS (RÈGLE D'OR : CLOS UNIQUEMENT SUR PREUVE) */}
            <div className="space-y-2.5 page-break-avoid">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1E293B] m-0">
                  4. Constat des Écarts & Expositions Financières
                </h3>
                <span className="text-[11px] font-semibold text-[#64748B]">
                  Règle d'or : statut « Clos » uniquement sur quittance libératoire
                </span>
              </div>

              {reportData.ecarts.length === 0 ? (
                <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs text-[#166534] font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
                  <span>Aucun écart constaté. L'ensemble des déclarations et cotisations vérifiées est à jour.</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-black uppercase text-[#475569]">
                      <tr>
                        <th className="p-2.5 w-10">N°</th>
                        <th className="p-2.5">Point de Contrôle Audité</th>
                        <th className="p-2.5">Domaine</th>
                        <th className="p-2.5">Risque / Impact</th>
                        <th className="p-2.5">Statut</th>
                        <th className="p-2.5">Preuve Déclarative</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {reportData.ecarts.map((ecart) => (
                        <tr key={ecart.numero} className="hover:bg-[#F8FAFC]">
                          <td className="p-2.5 font-bold text-[#64748B]">{ecart.numero}</td>
                          <td className="p-2.5 font-bold text-[#1E293B]">{ecart.pointControle}</td>
                          <td className="p-2.5 text-[#475569]">{ecart.domaine}</td>
                          <td className={`p-2.5 font-semibold ${ecart.isClos ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                            {ecart.impactEstime}
                          </td>
                          <td className="p-2.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              ecart.isClos
                                ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
                                : 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]'
                            }`}>
                              {ecart.isClos ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                              {ecart.statut}
                            </span>
                          </td>
                          <td className="p-2.5 text-[11px] font-mono text-[#475569]">
                            {ecart.preuveRef || <span className="text-[#B91C1C] italic">Non fournie (En retard)</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[11px] text-[#64748B] m-0 italic">
                {reportData.ecartsInterpretationText}
              </p>
            </div>

            {/* 5. PLAN DE RÉGULARISATION & REMÉDIATION */}
            <div className="space-y-2.5 page-break-avoid">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1E293B] m-0">
                  5. Plan d'Action & Mesures de Remédiation (Avancement : {reportData.avancementRemediationPercent} %)
                </h3>
                <div className="w-32 bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#15803D] h-full rounded-full transition-all"
                    style={{ width: `${reportData.avancementRemediationPercent}%` }}
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-black uppercase text-[#475569]">
                    <tr>
                      <th className="p-2.5 w-10">N°</th>
                      <th className="p-2.5">Action Corrective Prioritaire</th>
                      <th className="p-2.5">Responsable</th>
                      <th className="p-2.5">Échéance</th>
                      <th className="p-2.5">État d'Avancement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {reportData.actionsRemediation.map((act) => (
                      <tr key={act.numero} className="hover:bg-[#F8FAFC]">
                        <td className="p-2.5 font-bold text-[#64748B]">{act.numero}</td>
                        <td className="p-2.5 font-bold text-[#1E293B]">{act.actionCorrective}</td>
                        <td className="p-2.5 text-[#475569]">{act.responsable}</td>
                        <td className="p-2.5 text-[#475569] font-medium">{act.echeance}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            act.isVerifie
                              ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
                              : 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                          }`}>
                            {act.statut}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-[#64748B] m-0 italic">
                {reportData.planRegularisationClotureText}
              </p>
            </div>

            {/* 6. PLAN DE CAPTATION (OPPORTUNITÉS FISCALES) */}
            <div className="space-y-2.5 page-break-avoid">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1E293B] m-0">
                  6. Plan de Captation des Optimisations Légales & Abattements
                </h3>
                <span className="text-[11px] font-bold text-[#4F46A0]">
                  Gisement total : {reportData.gainACapterAnnuelFcfa.toLocaleString('fr-FR')} FCFA / an
                </span>
              </div>

              <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-black uppercase text-[#475569]">
                    <tr>
                      <th className="p-2.5">Dispositif Fiscal Incitatif</th>
                      <th className="p-2.5">Gain Annuel Projeté</th>
                      <th className="p-2.5">Statut de Captation</th>
                      <th className="p-2.5">Action Recommandée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {reportData.optimisations.map((opt, i) => (
                      <tr key={i} className="hover:bg-[#F8FAFC]">
                        <td className="p-2.5 font-bold text-[#1E293B]">{opt.opportunite}</td>
                        <td className="p-2.5 font-semibold text-[#15803D]">{opt.gainAnnuelEstime}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            opt.isValidated
                              ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
                              : 'bg-[#EDEBF9] text-[#4F46A0] border-[#DDD8F5]'
                          }`}>
                            {opt.statut}
                          </span>
                        </td>
                        <td className="p-2.5 text-[11px] text-[#475569]">{opt.prochaineEtape}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-[#64748B] m-0 italic">
                {reportData.planCaptationInterpretationText}
              </p>
            </div>

            {/* 7. POINTS CONFORMES VÉRIFIÉS */}
            <div className="space-y-2 page-break-avoid">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1E293B] m-0">
                7. Points de Conformité Satisfaits
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {reportData.pointsConformes.slice(0, 6).map((pt, i) => (
                  <div key={i} className="p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[#1E293B] text-[11px]">{pt.point}</div>
                      <div className="text-[10px] text-[#64748B]">{pt.statutLegal}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 8. RECOMMANDATIONS, RELANCE J-7 & DOUBLE VISA ÉLECTRONIQUE */}
            <div className="space-y-4 page-break-avoid pt-2 border-t border-[#E2E8F0]">
              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1E293B] m-0">
                  8. Recommandations & Surveillance Continue (Relance J-7)
                </h3>
                <p className="text-xs text-[#334155] m-0 leading-relaxed font-serif-legal">
                  {reportData.recommandationsText}
                </p>
                <div className="bg-[#FFFBEB] border border-[#FDE68A] p-2.5 rounded-lg text-xs text-[#92400E] font-medium flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-[#B45309] shrink-0" />
                  <span>{reportData.relanceJ7NotificationText}</span>
                </div>
              </div>

              {/* MENTIONS & SIGNATURES / CACHETS (DISTINCTION MIROIR VS CERTIFIÉ) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
                {/* Bloc 1 : Entreprise Assujettie */}
                <div className="border border-[#CBD5E1] rounded-xl p-4 text-center space-y-2 bg-[#FAFAFC]">
                  <div className="text-[10.5px] font-black uppercase tracking-wider text-[#64748B]">
                    Pour l'Assujetti / Direction Générale
                  </div>
                  <div className="text-xs font-bold text-[#1E293B]">
                    {reportData.entreprise.raisonSociale}
                  </div>
                  <div className="h-16 flex items-center justify-center border-b border-dashed border-[#CBD5E1] text-[11px] text-[#94A3B8] italic">
                    Cachet commercial & Signature du représentant légal
                  </div>
                  <div className="text-[10px] text-[#64748B]">
                    Document indexé au registre fiscal d'entreprise · {reportData.exportDate}
                  </div>
                </div>

                {/* Bloc 2 : Cabinet Référent / Gestionnaire (VISA ÉLECTRONIQUE) */}
                <div className={`border rounded-xl p-4 text-center space-y-2 relative overflow-hidden ${
                  reportData.isCertifie
                    ? 'border-[#15803D]/40 bg-[#F0FDF4]'
                    : 'border-[#CBD5E1] bg-[#F1F5F9]'
                }`}>
                  <div className="text-[10.5px] font-black uppercase tracking-wider text-[#475569]">
                    Pour le Cabinet d’Audit & d’Expertise
                  </div>
                  <div className="text-xs font-bold text-[#1E293B]">
                    {reportData.cabinetNom}
                  </div>

                  {reportData.isCertifie ? (
                    // ÉTAT CERTIFIÉ : Cachet circulaire + signature stylisée + hash SHA-256
                    <div className="space-y-1 py-1">
                      <div className="inline-flex items-center gap-1 text-[11px] font-black text-[#15803D] bg-white px-2.5 py-1 rounded-full border border-[#86EFAC] shadow-2xs">
                        <Award className="w-3.5 h-3.5 text-[#15803D]" />
                        <span>VISA ÉLECTRONIQUE APPOSÉ</span>
                      </div>
                      <div className="text-xs font-black text-[#1E293B] italic font-serif-legal">
                        {reportData.gestionnaireNom}
                      </div>
                      <div className="text-[9.5px] text-[#166534] font-mono truncate">
                        Sceau cryptographique : {reportData.visaElectroniqueHash}
                      </div>
                      <div className="text-[9.5px] text-[#475569]">
                        {reportData.visaHorodatage}
                      </div>
                    </div>
                  ) : (
                    // ÉTAT MIROIR : Grisé avec mention d'attente
                    <div className="h-20 flex flex-col items-center justify-center border-b border-dashed border-[#CBD5E1] space-y-1">
                      <span className="text-[11px] font-black text-[#94A3B8] uppercase tracking-wider">
                        En attente de visa cabinet
                      </span>
                      <span className="text-[10px] text-[#94A3B8] italic max-w-xs">
                        Le visa certifié, le cachet et la signature professionnelle sont délivrés par le Niveau 2 sous mandat.
                      </span>
                    </div>
                  )}

                  <div className="text-[10px] text-[#64748B]">
                    {reportData.cabinetAgrement}
                  </div>
                </div>
              </div>

              {/* Mentions Légales Pied de Page */}
              <div className="pt-3 border-t border-[#E2E8F0] text-center text-[9.5px] text-[#94A3B8] space-y-0.5">
                <div>
                  Plateforme Legal Flow CI · Conforme au Code Général des Impôts de Côte d'Ivoire (CGI 2026),
                  au Code de Prévoyance Sociale et au Traité OHADA.
                </div>
                <div>
                  Ce document constitue un audit de conformité déclarative formalisé sous la référence unique {reportData.referenceDossier}.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

