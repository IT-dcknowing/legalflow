import React, { useState } from 'react';
import {
  PageId,
  Obligation,
  CompanyProfile,
  FicheGuide,
  DocumentItem,
  OpportunityItem,
  VeilleItem,
  FlashVeille,
  UserRole,
  AppUser,
  CompanyEntity,
  CostSimulation,
  ChatMessage,
} from './types';
import {
  initialCompanyProfile,
  initialOpportunities,
  initialFiches,
  initialVeilleItems,
  initialDocuments,
  initialFlashs,
} from './data/mockData';
import { mockUsers, initialCompaniesEntities, checkIsProfileComplete } from './data/rolesData';
import {
  supabase,
  logEvent,
  sanitizeFileName,
  type DbProfile,
} from './services/supabaseClient';
import { LoginPage } from './components/LoginPage';
import { canAccess } from './services/routeGuard';
import { pageToPath, pathToPage } from './services/router';
import { Loader } from './components/Loader';
import { entityToProfile } from './utils/transformers';
import { ObligationEngine } from './services/obligationEngine';
import {
  diffDays,
  formatDateLong,
  formatMonthLabel,
  getDateReference,
  initDateReferenceQaHook,
  parseIsoDate,
  pillForDate,
} from './services/dateReference';
import { groupObligations } from './services/echeancier';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { AssistantPanel } from './components/AssistantPanel';
import { ConfirmModal } from './components/ConfirmModal';
import { AddDeadlineModal } from './components/AddDeadlineModal';
import { FicheReaderModal } from './components/FicheReaderModal';
// PEN-027 : modales lourdes en chunks séparés (code splitting).
const EngineSimulatorModal = React.lazy(() =>
  import('./components/EngineSimulatorModal').then((m) => ({ default: m.EngineSimulatorModal }))
);
const ReportPdfModal = React.lazy(() =>
  import('./components/ReportPdfModal').then((m) => ({ default: m.ReportPdfModal }))
);
import { LaravelCodeViewerModal } from './components/LaravelCodeViewerModal';
import { CompleteProfileModal } from './components/CompleteProfileModal';
import { AddCompanyModal } from './components/AddCompanyModal';
import { ConfirmEnterCompanyModal } from './components/ConfirmEnterCompanyModal';
import { ArrowLeft } from 'lucide-react';

// Pages
import { AccueilPage } from './pages/AccueilPage';
import { LandingPage } from './pages/LandingPage';
import { InscriptionPage } from './pages/InscriptionPage';
import { EnAttentePage } from './pages/EnAttentePage';
import { SuspenduPage } from './pages/SuspenduPage';
import { JournalPage } from './pages/JournalPage';
import { CabinetsEnAttentePage } from './pages/CabinetsEnAttentePage';
import { DashboardPage } from './pages/DashboardPage';
import { EcheancierPage } from './pages/EcheancierPage';
import { OpportunitesPage } from './pages/OpportunitesPage';
import { BibliothequePage } from './pages/BibliothequePage';
import { VeillePage } from './pages/VeillePage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ProfilPage } from './pages/ProfilPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { GestionnaireDashboardPage } from './pages/GestionnaireDashboardPage';
import { GestionnaireEntreprisesPage } from './pages/GestionnaireEntreprisesPage';

/** Page d'entrée par rôle (compte actif). */
export function getDefaultPageForRole(role: string): PageId {
  if (role === 'super_admin') return 'super_admin';
  if (role === 'gestionnaire') return 'gestionnaire_dashboard';
  return 'dashboard';
}

/** Routage après login : rôle × statut (PEN-015). */
export function routeAfterLogin(role: string, statut: string): PageId {
  if (statut === 'en_attente') return 'en_attente';
  if (statut === 'suspendu') return 'suspendu';
  return getDefaultPageForRole(role);
}

export function App() {
  // Page initiale = URL réelle (lien direct / favori / refresh).
  const [activePage, setActivePage] = useState<PageId>(() => {
    try {
      return pathToPage(window.location.pathname);
    } catch {
      return 'landing';
    }
  });
  const [currentUser, setCurrentUser] = useState<AppUser>(mockUsers.gestionnaire);
  const [currentRole, setCurrentRole] = useState<UserRole>('gestionnaire');
  const [companies, setCompanies] = useState<CompanyEntity[]>(initialCompaniesEntities);
  const [activeCompanyId, setActiveCompanyId] = useState<string>('ent-koffi');
  const [isGestionnaireInCompanyMode, setIsGestionnaireInCompanyMode] = useState<boolean>(false);
  const [companyPendingEnter, setCompanyPendingEnter] = useState<CompanyEntity | null>(null);

  // AMENDEMENT #2 — horloge unique + source unique : le pipeline roulant du moteur.
  // `dateReference` (système réel par défaut, forçable en QA) pilote tout.
  const [dateTick, setDateTick] = useState(0);
  const dateReference = React.useMemo(() => getDateReference(), [dateTick]);
  React.useEffect(() => {
    initDateReferenceQaHook(() => setDateTick((t) => t + 1));
  }, []);

  // Quittances pointées par occurrence (clé stable `RULE_…@AAAA-MM-JJ` ou `custom-…`).
  // Pointer fait disparaître l'élément de « En retard » dans LES DEUX vues (critère 4).
  const [quittances, setQuittances] = useState<Record<string, { ref: string; date: string; file?: string }>>({});
  // Simulations de coût réel par occurrence (montants saisis, jamais calculés).
  const [simulations, setSimulations] = useState<Record<string, CostSimulation>>({
    'RULE_TVA_MENSUELLE@2026-08-20': {
      lines: [
        { id: 'sim-1', label: 'Montant principal TVA déclaré', montant: 600000 },
        { id: 'sim-2', label: 'Majoration légale 10% (Art. 1083 CGI)', montant: 60000 },
        { id: 'sim-3', label: 'Intérêt moratoire de retard (1% / mois)', montant: 6000 },
        { id: 'sim-4', label: 'Pénalité pour déclaration tardive', montant: 19000 },
      ],
      total: 685000,
      datePaiementPrevue: '2026-09-12',
      rappelActif: true,
      savedAt: '2026-09-02T10:30:00Z',
    },
  });
  // Échéances libres ajoutées par le cabinet (brouillons datés, statut dérivé de dateReference).
  const [customDrafts, setCustomDrafts] = useState<
    Array<{ id: string; titre: string; domaine: Obligation['domaine']; dateIso: string; montant: string }>
  >([]);

  const pointedKeys = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    Object.keys(quittances).forEach((k) => {
      map[k] = true;
    });
    return map;
  }, [quittances]);
  const [profile, setProfile] = useState<CompanyProfile>(() => {
    const active = initialCompaniesEntities.find((c) => c.id === 'ent-koffi') || initialCompaniesEntities[0];
    return entityToProfile(active);
  });
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(initialOpportunities);
  const [fiches] = useState<FicheGuide[]>(initialFiches);
  const [veilleItems] = useState<VeilleItem[]>(initialVeilleItems);
  const [flashs] = useState<FlashVeille[]>(initialFlashs);
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);

  // UI state
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isAssistantFull, setIsAssistantFull] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [confirmModalObligation, setConfirmModalObligation] = useState<Obligation | null>(null);
  const [isAddDeadlineOpen, setIsAddDeadlineOpen] = useState(false);
  const [selectedFiche, setSelectedFiche] = useState<FicheGuide | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isLaravelViewerOpen, setIsLaravelViewerOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(3);

  // ---- AUTH MISE EN PAUSE (décision produit 2026-09-06) ----
  // Pas de session, pas de tokens, pas d'OAuth. Login/Signup redirigent
  // directement vers l'app ; le sélecteur de profils démo pilote les niveaux.
  // Base de données et tout le reste inchangés.
  // Réactivation : passer AUTH_BYPASSED à false ET restaurer le bloc session
  // (getSession/onAuthStateChange/enterRealSession) depuis l'historique git.
  const AUTH_BYPASSED = true;
  const [authUserId] = useState<string | null>(null);
  const [dbProfile] = useState<DbProfile | null>(null);
  const [authReady] = useState(true);
  const [profileChecked] = useState(false);
  const useRealAuth = false;

  const uuidOrUndef = (v?: string | null): string | undefined =>
    v && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined;

  // Modals pour la gestion multi-niveaux et profil incomplet
  const [isCompleteProfileOpen, setIsCompleteProfileOpen] = useState(false);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [companyTargetForManager, setCompanyTargetForManager] = useState<CompanyEntity | null>(null);

  // Modal Rapport d'Audit (Miroir vs Certifié)
  const [isReportPdfModalOpen, setIsReportPdfModalOpen] = useState(false);
  const [reportModalState, setReportModalState] = useState<'miroir' | 'certifie'>('miroir');
  const [reportModalProfile, setReportModalProfile] = useState<CompanyProfile | null>(null);

  // Résolution roulante unique : occurrences moteur + échéances libres, enrichies
  // (quittances, simulations). Dashboard ET échéancier lisent CETTE liste.
  const engineOutput = React.useMemo(() => {
    return ObligationEngine.resolve(profile, pointedKeys, dateReference);
  }, [profile, pointedKeys, dateReference]);

  const obligations = React.useMemo<Obligation[]>(() => {
    const list: Obligation[] = engineOutput.obligationsActives.map((inst) =>
      ObligationEngine.instanceToObligation(inst, dateReference)
    );
    for (const d of customDrafts) {
      const parsed = parseIsoDate(d.dateIso);
      const pill = parsed ? pillForDate(parsed) : { jour: '15', mois: '—' };
      const lag = parsed ? diffDays(parsed, dateReference) : 0;
      const ahead = parsed ? diffDays(dateReference, parsed) : 999;
      const late = lag > 0;
      const imminent = !late && ahead >= 0 && ahead <= 7;
      list.push({
        id: d.id,
        titre: d.titre,
        echeanceLabel: parsed
          ? late
            ? `Échéance dépassée le ${formatDateLong(parsed)}`
            : `Échéance le ${formatDateLong(parsed)}`
          : d.titre,
        dateIso: d.dateIso,
        echeanceDateIso: d.dateIso,
        statut: late ? 'en_retard' : imminent ? 'imminente' : 'a_venir',
        tagLabel: late ? `En retard (${lag}j)` : imminent ? 'Imminent' : 'À venir',
        tagClass: late ? 'retard' : imminent ? 'imminent' : 'avenir',
        domaine: d.domaine,
        jour: pill.jour,
        mois: pill.mois,
        moisGroupe: parsed ? formatMonthLabel(parsed) : '',
        montantEstime: d.montant || undefined,
        administration: d.domaine === 'social' ? 'CNPS' : d.domaine === 'douanes' ? 'Douanes (DGD)' : 'DGI',
        baseLegale: 'Déclaration spontanée',
      });
    }
    return list.map((ob) => {
      const q = quittances[ob.id];
      const sim = simulations[ob.id];
      if (!q && !sim) return ob;
      return {
        ...ob,
        ...(q
          ? {
              statut: 'accomplie' as const,
              quittanceRef: q.ref,
              dateDeclaration: q.date,
              tagLabel: 'Accomplie',
              tagClass: 'fait' as const,
              pieceJointeUrl: q.file ? `/uploads/${q.file}` : undefined,
            }
          : {}),
        ...(sim ? { simulation: sim } : {}),
      };
    });
  }, [engineOutput, customDrafts, quittances, simulations, dateReference]);

  // Compteurs globaux cohérents : même source que les deux vues.
  const groupesGlobaux = React.useMemo(
    () => groupObligations(obligations, dateReference),
    [obligations, dateReference]
  );
  const scoreConformiteGlobal =
    obligations.length > 0
      ? Math.round(((obligations.length - groupesGlobaux.totalLate) / obligations.length) * 100)
      : 100;

  // ---- Session réelle : SUPPRIMÉ (auth en pause, voir AUTH_BYPASSED) ----

  // ---- Historique chatbot : désactivé sans session (réactivé avec l'auth) ----

  // ---- Bypass auth : clic = entrée directe, aucune vérification ----
  const handleLogin = async (): Promise<null> => {
    setActivePage(getDefaultPageForRole(currentRole));
    return null;
  };

  const handleResetPassword = async (): Promise<void> => {};

  const handleGoogleSignIn = async () => {
    setActivePage(getDefaultPageForRole(currentRole));
  };

  // Après inscription (visuelle uniquement) : entrée directe.
  const handleInscriptionComplete = async () => {
    setActivePage(getDefaultPageForRole(currentRole));
  };

  const handleLogout = async () => {
    setActivePage('landing');
  };

  // ---- RGPD : export + suppression de compte (inopérants sans session) ----
  const getAccessToken = async (): Promise<string | null> => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  };

  const handleExportData = async () => {
    const token = await getAccessToken();
    if (!token) return;
    const res = await fetch('/api/user/export-data', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'legalflow-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    const token = await getAccessToken();
    if (!token) return;
    await fetch('/api/user/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await handleLogout();
  };

  // ---- Sélecteur de profils démo (Topbar) ----
  // Bascule l'état AFFICHÉ (rôle + entreprise + dashboard) sans authentification.
  // Profils issus de mockUsers (rolesData.ts) : super_admin, gestionnaire,
  // utilisateur_complet (Koffi BTP), utilisateur_incomplet (Atelier N'Guessan).
  const handleSelectProfile = (userKey: string) => {
    const selectedUser = mockUsers[userKey] || mockUsers.utilisateur_complet;
    setCurrentUser(selectedUser);
    setIsGestionnaireInCompanyMode(false);
    setCompanyPendingEnter(null);
    const role = selectedUser.role;

    if (role === 'super_admin') {
      setCurrentRole('super_admin');
      setActivePage('super_admin');
    } else if (role === 'gestionnaire') {
      setCurrentRole('gestionnaire');
      setActivePage('gestionnaire_dashboard');
    } else if (userKey === 'utilisateur_incomplet') {
      const incomplet = companies.find((c) => c.id === 'ent-nguessan') || companies[0];
      setActiveCompanyId(incomplet.id);
      setProfile(entityToProfile(incomplet));
      setCurrentRole('utilisateur');
      setActivePage('dashboard');
    } else {
      const complet = companies.find((c) => c.id === 'ent-koffi') || companies[0];
      setActiveCompanyId(complet.id);
      setProfile(entityToProfile(complet));
      setCurrentRole('utilisateur');
      setActivePage('dashboard');
    }
  };

  // Page titles map
  const pageTitles: Record<PageId, string> = {
    landing: 'Accueil',
    login: 'Connexion',
    inscription: 'Créer mon compte',
    assistant: 'Assistant LEGAL FLOW AI',
    en_attente: 'Compte en cours d’activation',
    suspendu: 'Compte suspendu',
    accueil: 'Accueil',
    dashboard: currentRole === 'gestionnaire' && isGestionnaireInCompanyMode ? `Dashboard — ${profile.nom}` : 'Tableau de bord',
    echeancier: 'Échéancier',
    opportunites: 'Opportunités fiscales',
    bibliotheque: 'Bibliothèque de fiches',
    veille: 'Veille réglementaire',
    documents: 'Documents',
    profil: currentRole === 'gestionnaire' && isGestionnaireInCompanyMode ? "Fiche de l'entreprise" : 'Profil entreprise',
    entreprise_historique: 'Mon historique',
    super_admin: 'Dashboard Global — Super Admin HQ',
    super_admin_entreprises: 'Entreprises Référencées',
    super_admin_pipeline: 'Pipeline de Veille Réglementaire (J0→J+5)',
    super_admin_notifications: 'Diffusion Notifications',
    super_admin_audits: 'Audits Transversaux',
    super_admin_rappels: 'Séquences de Rappels (J+3, J+7, J+15)',
    super_admin_journal: 'Journal d’audit',
    super_admin_cabinets_attente: 'Cabinets en attente',
    gestionnaire_dashboard: 'Vue d’ensemble Portefeuille',
    gestionnaire_journal: 'Journal mes clients',
    mes_entreprises: 'Mes Entreprises',
    admin_console: 'Super Admin HQ',
    admin_entreprises: 'Gestion Entreprises',
    admin_pipeline: 'Pipeline Veille',
    admin_notifications: 'Notifications Globales',
    admin_audits: 'Audits Transversaux',
    admin_schema: 'Schéma Supabase',
  };

  // Demande d'accès à l'espace d'une entreprise (Gestionnaire -> Confirmation Modal)
  const handleRequestEnterCompany = (company: CompanyEntity) => {
    setCompanyPendingEnter(company);
  };

  // Confirmation d'accès à l'espace d'une entreprise
  const handleConfirmEnterCompany = () => {
    if (companyPendingEnter) {
      setActiveCompanyId(companyPendingEnter.id);
      setProfile(entityToProfile(companyPendingEnter));
      setIsGestionnaireInCompanyMode(true);
      setActivePage('dashboard');
      setCompanyPendingEnter(null);
    }
  };

  // Sortie de l'espace d'une entreprise pour revenir à "Mes entreprises"
  const handleExitCompanyMode = () => {
    setIsGestionnaireInCompanyMode(false);
    setActivePage('mes_entreprises');
  };

  // Switch d'entreprise (Niveau 2 Gestionnaire)
  const handleSelectCompany = (companyId: string) => {
    const found = companies.find((c) => c.id === companyId);
    if (found) {
      setActiveCompanyId(found.id);
      setProfile(entityToProfile(found));
    }
  };

  // Ajout d'une entreprise (Niveau 2 Gestionnaire)
  const handleAddNewCompany = (newCompany: CompanyEntity) => {
    setCompanies((prev) => [newCompany, ...prev]);
    setActiveCompanyId(newCompany.id);
    setProfile(entityToProfile(newCompany));
  };

  // Gestionnaire complétant le profil à la place du client
  const handleManagerCompleteProfile = (targetCompany: CompanyEntity) => {
    setCompanyTargetForManager(targetCompany);
    // S'assurer que le modal a le profil de cette entreprise
    setProfile(entityToProfile(targetCompany));
    setActiveCompanyId(targetCompany.id);
    setIsCompleteProfileOpen(true);
  };

  // Sauvegarde après complétion du profil (les 5 champs sont validés)
  const handleSaveCompletedProfile = (updatedProfile: CompanyProfile) => {
    const isNowComplete = checkIsProfileComplete(updatedProfile);
    const finalProfile: CompanyProfile = {
      ...updatedProfile,
      profilComplet: isNowComplete,
    };
    setProfile(finalProfile);

    // Mettre à jour l'entité correspondante dans la liste des entreprises
    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id === (finalProfile.id || activeCompanyId)) {
          return {
            ...c,
            formeJuridique: finalProfile.formeJuridique || c.formeJuridique,
            secteurActivite: finalProfile.secteurActivite || finalProfile.secteur || c.secteurActivite,
            regimeFiscal: finalProfile.regimeFiscal || c.regimeFiscal,
            caEstime: finalProfile.chiffreAffairesEstime || c.caEstime,
            effectif: finalProfile.effectifSalaries || c.effectif,
            numeroRccm: finalProfile.rccm || c.numeroRccm,
            numeroCnps: finalProfile.numeroCnps || c.numeroCnps,
            adhesionCga: finalProfile.adhesionCga ?? c.adhesionCga,
            profilComplet: isNowComplete,
          };
        }
        return c;
      })
    );
    setCompanyTargetForManager(null);
    void logEvent('profil_complete', 'entreprise', uuidOrUndef(activeCompanyId), {});
  };

  // Pointer une quittance : upload bucket `preuves` + ligne journal + bascule locale.
  const handleConfirmObligation = async (
    obligationId: string,
    quittanceRef: string,
    declarationDate: string,
    fileName?: string,
    file?: File | null
  ) => {
    let storedPath = fileName ? `/uploads/${fileName}` : undefined;
    const entId = uuidOrUndef(activeCompanyId) || uuidOrUndef(dbProfile?.entreprise_id);
    if (file && supabase && authUserId && entId) {
      const safe = sanitizeFileName(file.name || fileName || 'quittance.pdf');
      const path = `${entId}/${obligationId}/${safe}`;
      const { error: upErr } = await supabase.storage.from('preuves').upload(path, file, {
        upsert: true,
      });
      if (!upErr) storedPath = path;
    }
    setQuittances((prev) => ({
      ...prev,
      [obligationId]: { ref: quittanceRef, date: declarationDate, file: storedPath },
    }));
    await logEvent('quittance_pointee', 'echeance', entId, {
      obligation: obligationId,
      ref: quittanceRef,
      fichier: storedPath,
    });

    // If a document was attached, add to documents list
    if (fileName) {
      const newDoc: DocumentItem = {
        id: Date.now().toString(),
        name: fileName,
        meta: `PDF · Justificatif quittance ${quittanceRef}`,
        type: 'PDF',
        taille: '180 Ko',
        date: declarationDate,
      };
      setDocuments((prev) => [newDoc, ...prev]);
    }
  };

  // Sauvegarde d'une simulation de coût réel par occurrence
  const handleSaveSimulation = (obligationId: string, simulation: CostSimulation) => {
    setSimulations((prev) => ({ ...prev, [obligationId]: simulation }));
  };

  // Suppression d'une simulation de coût réel
  const handleDeleteSimulation = (obligationId: string) => {
    setSimulations((prev) => {
      const next = { ...prev };
      delete next[obligationId];
      return next;
    });
  };

  // Ouverture du Rapport d'Audit (Miroir ou Certifié)
  const handleOpenReportModal = (state: 'miroir' | 'certifie', targetProfile?: CompanyProfile) => {
    setReportModalState(state);
    setReportModalProfile(targetProfile || profile);
    setIsReportPdfModalOpen(true);
    logEvent('rapport_genere', 'rapport', uuidOrUndef(activeCompanyId), { etat: state });
  };

  // Ouverture directe de certification pour une entreprise (depuis le tableau de bord gestionnaire)
  const handleOpenCertifyForCompany = (comp: CompanyEntity) => {
    const prof = entityToProfile(comp);
    handleOpenReportModal('certifie', prof);
  };

  // Échéance libre du cabinet : statut et libellés dérivés de dateReference (jamais en dur).
  const handleAddCustomDeadline = (newDeadline: {
    titre: string;
    domaine: 'fiscal' | 'social' | 'douanes' | 'commerce' | 'administratif';
    dateIso: string;
    montant: string;
    moisGroupe: string;
  }) => {
    setCustomDrafts((prev) => [
      {
        id: `custom-${Date.now()}`,
        titre: newDeadline.titre,
        domaine: newDeadline.domaine,
        dateIso: newDeadline.dateIso,
        montant: newDeadline.montant,
      },
      ...prev,
    ]);
  };

  const handleNavigate = (page: PageId | string) => {
    const target = (page === 'registre' ? 'dashboard' : page) as PageId;
    // Entrée sidebar LEGAL FLOW AI : ouvre directement le mode pleine page existant.
    if (target === 'assistant') {
      setIsAssistantOpen(true);
      setIsAssistantFull(true);
    }
    // Navigation utilisateur : pousse l'URL (bouton précédent OK).
    try {
      const path = pageToPath(target);
      if (window.location.pathname !== path) window.history.pushState({ page: target }, '', path);
    } catch {
      /* navigation sans History API */
    }
    setActivePage(target);
  };

  // Page de repli en quittant l'assistant pleine page (jamais de page vide).
  const assistantFallbackPage = (): PageId =>
    currentRole === 'gestionnaire' && isGestionnaireInCompanyMode
      ? 'dashboard'
      : getDefaultPageForRole(currentRole);

  // Fermeture du panneau : si on venait de l'entrée sidebar, retour à l'accueil du rôle.
  const handleCloseAssistant = () => {
    setIsAssistantOpen(false);
    if (activePage === 'assistant') {
      setActivePage(assistantFallbackPage());
    }
  };

  // Réduction pleine page → panneau : idem, pas de page vide derrière.
  const handleToggleAssistantFull = () => {
    if (isAssistantFull && activePage === 'assistant') {
      setIsAssistantFull(false);
      setActivePage(assistantFallbackPage());
      return;
    }
    setIsAssistantFull(!isAssistantFull);
  };

  // Sync URL ← état (redirects/gardes : replace, pas d'entrée parasite) + titre onglet.
  // Écoute précédent/suivant : popstate → état.
  React.useEffect(() => {
    try {
      const path = pageToPath(activePage);
      if (window.location.pathname !== path) window.history.replaceState({ page: activePage }, '', path);
    } catch {
      /* noop */
    }
    const title = pageTitles[activePage];
    if (title) document.title = `${title} — Legal Flow`;
  }, [activePage]);

  React.useEffect(() => {
    const onPopState = () => {
      try {
        setActivePage(pathToPage(window.location.pathname));
      } catch {
        /* noop */
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Garde : DÉSACTIVÉE (auth en pause — pas de session à contrôler).
  // PEN-019 : matrice complète rôle × route + traçage acces_refuse.
  React.useEffect(() => {
    if (AUTH_BYPASSED) return;
    if (!useRealAuth || !authReady) return;
    const ctx = {
      session: !!authUserId,
      role: dbProfile?.role || (currentRole as string),
      statut: dbProfile?.statut || 'actif',
      page: activePage,
    };
    if (!authUserId) {
      if (!canAccess({ ...ctx, session: false })) setActivePage('landing');
      return;
    }
    if (!dbProfile) return;
    if ((dbProfile.statut || 'actif') === 'actif' &&
        (activePage === 'en_attente' || activePage === 'suspendu')) {
      setActivePage(getDefaultPageForRole(dbProfile.role));
      return;
    }
    if (!canAccess(ctx)) {
      logEvent('acces_refuse', undefined, undefined, {
        requested_page: activePage,
        user_role: dbProfile.role,
      });
      setActivePage(routeAfterLogin(dbProfile.role, dbProfile.statut || 'actif'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, authUserId, dbProfile, authReady]);

  // Portail public : sans session → landing (défaut), login ou inscription.
  if (useRealAuth && !authUserId) {
    if (!authReady) {
      return <Loader label="Chargement de la session…" />;
    }
    if (activePage === 'landing') {
      return <LandingPage onNavigate={handleNavigate} />;
    }
    if (activePage === 'inscription') {
      return <InscriptionPage onNavigate={handleNavigate} onComplete={handleInscriptionComplete} onGoogleSignIn={handleGoogleSignIn} />;
    }
    if (activePage === 'login') {
      return <LoginPage onLogin={handleLogin} onResetPassword={handleResetPassword} onGoogleSignIn={handleGoogleSignIn} onGoSignup={() => handleNavigate('inscription')} />;
    }
    return <LandingPage onNavigate={handleNavigate} />;
  }
  // Pages blocantes : compte non actif, sans Topbar ni Sidebar (PEN-017).
  if (useRealAuth && authUserId && activePage === 'en_attente') {
    return <EnAttentePage onLogout={handleLogout} />;
  }
  if (useRealAuth && authUserId && activePage === 'suspendu') {
    return <SuspenduPage onLogout={handleLogout} />;
  }
  if (useRealAuth && authUserId && profileChecked && !dbProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F6FB] p-4">
        <div className="bg-white border border-[#E5E5F0] rounded-2xl p-6 max-w-[400px] text-center space-y-3">
          <div className="text-sm font-black text-[#171A2E]">Compte sans profil</div>
          <p className="text-xs text-[#6B6F85]">
            Votre compte n'est rattaché à aucun niveau. Contactez Legal Flow HQ ou votre cabinet.
          </p>
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-[#4F46A0] hover:underline cursor-pointer"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FDFDFE] text-[#20263A] font-sans antialiased selection:bg-[#EDEBF9] selection:text-[#3D3680]">
      {/* Sidebar Nav - Toujours visible, largeur fixe */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        retardCount={groupesGlobaux.totalLate}
        complianceScore={scoreConformiteGlobal}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        role={currentRole}
        companies={companies}
        activeCompanyId={activeCompanyId}
        onSelectCompany={handleSelectCompany}
        onAddNewCompany={() => setIsAddCompanyOpen(true)}
        onCompleteCompanyProfile={handleManagerCompleteProfile}
        companyName={profile.raisonSociale || profile.nom}
        userRole={
          currentRole === 'super_admin'
            ? 'Super Admin (Équipe Legal Flow)'
            : currentRole === 'gestionnaire'
            ? 'Cabinet Comptable CI'
            : currentUser.fullName
        }
        isGestionnaireInCompanyMode={isGestionnaireInCompanyMode}
        activeCompanyEntity={companies.find((c) => c.id === activeCompanyId) || null}
        onExitCompanyMode={handleExitCompanyMode}
      />

      {/* Zone de Contenu Principal (content-area) */}
      <div className="flex-1 flex flex-row min-w-0 h-full overflow-hidden relative">
        {/* Dashboard / Page active - Visible EN MODE COMPACT UNIQUEMENT (masqué totalement quand isAssistantOpen && isAssistantFull) */}
        <div
          className={`flex-1 flex flex-col min-w-0 h-full overflow-y-auto transition-all duration-250 ease-in-out ${
            isAssistantOpen && isAssistantFull ? 'hidden' : 'flex'
          }`}
        >
          {/* Topbar */}
          <Topbar
            pageTitle={pageTitles[activePage] || 'Legal Flow'}
            dateReference={dateReference}
            onQaDateChange={() => setDateTick((t) => t + 1)}
            onLogout={handleLogout}
            onOpenAssistant={() => setIsAssistantOpen(true)}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
            onNavigateToVeille={() => {
              setActivePage('veille');
              setUnreadNotifCount(0);
            }}
            unreadCount={unreadNotifCount}
            currentRole={currentRole}
            currentUser={currentUser}
            onSelectProfile={handleSelectProfile}
          />

          {/* Bandeau d'espace client pour le Gestionnaire quand il est dans un dossier */}
          {currentRole === 'gestionnaire' && isGestionnaireInCompanyMode && (
            <div
              id="bannerGestionnaireCompanyMode"
              className="bg-[#1E2337] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-white/10 shadow-xs shrink-0"
            >
              <div className="flex items-center gap-3">
                <button
                  id="btnBackToPortfolioBanner"
                  onClick={handleExitCompanyMode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>← Retour à Mes entreprises</span>
                </button>
                <span className="text-xs text-white/30 hidden sm:inline">|</span>
                <div className="text-xs">
                  <span className="text-white/70">Dossier client : </span>
                  <strong className="text-white font-black">{profile.raisonSociale || profile.nom}</strong>
                  <span className="ml-2 hidden sm:inline-block text-[10.5px] bg-[#4F46A0] text-white px-2 py-0.5 rounded-full font-bold">
                    Mode Gestionnaire Cabinet
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsCompleteProfileOpen(true)}
                className="text-xs font-bold text-white/80 hover:text-white underline cursor-pointer shrink-0"
              >
                Modifier fiche client
              </button>
            </div>
          )}

          {/* Page Container */}
          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full pb-28 mx-auto">
            {/* GESTIONNAIRE PORTFOLIO PAGES */}
            {currentRole === 'gestionnaire' && !isGestionnaireInCompanyMode && activePage === 'gestionnaire_dashboard' && (
              <GestionnaireDashboardPage
                companies={companies}
                onNavigate={handleNavigate}
                onSelectCompany={handleRequestEnterCompany}
                onOpenCompleteModal={handleManagerCompleteProfile}
                onAddNewCompany={() => setIsAddCompanyOpen(true)}
                onOpenCertifyReport={handleOpenCertifyForCompany}
              />
            )}

            {currentRole === 'gestionnaire' && !isGestionnaireInCompanyMode && activePage === 'mes_entreprises' && (
              <GestionnaireEntreprisesPage
                companies={companies}
                onSelectCompany={handleRequestEnterCompany}
                onAddNewCompany={() => setIsAddCompanyOpen(true)}
                onOpenCompleteModal={handleManagerCompleteProfile}
                onOpenCertifyReport={handleOpenCertifyForCompany}
              />
            )}

            {currentRole === 'gestionnaire' &&
              !isGestionnaireInCompanyMode &&
              activePage === 'gestionnaire_journal' && (
                <JournalPage role="gestionnaire" entreprises={companies} />
              )}

            {activePage === 'entreprise_historique' && <JournalPage role="utilisateur" />}

            {currentRole === 'super_admin' && activePage === 'super_admin_journal' && (
              <JournalPage role="super_admin" />
            )}

            {currentRole === 'super_admin' && activePage === 'super_admin_cabinets_attente' && (
              <CabinetsEnAttentePage />
            )}

            {/* SUPER ADMIN PAGES */}
            {(activePage === 'super_admin' ||
              activePage === 'super_admin_entreprises' ||
              activePage === 'super_admin_pipeline' ||
              activePage === 'super_admin_notifications' ||
              activePage === 'super_admin_audits' ||
              activePage === 'super_admin_rappels') && (
              <SuperAdminPage
                companies={companies}
                onSelectCompanyAsAdmin={handleSelectCompany}
                onNavigate={handleNavigate}
                initialTab={
                  activePage === 'super_admin_entreprises'
                    ? 'entreprises'
                    : activePage === 'super_admin_pipeline'
                    ? 'pipeline'
                    : activePage === 'super_admin_notifications'
                    ? 'notifications'
                    : activePage === 'super_admin_audits'
                    ? 'audits'
                    : activePage === 'super_admin_rappels'
                    ? 'emails'
                    : 'stats'
                }
              />
            )}

            {activePage === 'accueil' && <AccueilPage onNavigate={handleNavigate} />}

            {activePage === 'dashboard' && (
              <DashboardPage
                obligations={obligations}
                dateReference={dateReference}
                companyProfile={profile}
                opportunities={opportunities}
                flashs={flashs}
                onOpenConfirmModal={(ob) => setConfirmModalObligation(ob)}
                onNavigate={handleNavigate}
                onOpenAssistant={() => setIsAssistantOpen(true)}
                onOpenFiche={(ficheId) => {
                  const found = fiches.find((f) => f.id === ficheId);
                  if (found) setSelectedFiche(found);
                  else if (fiches.length > 0) setSelectedFiche(fiches[0]);
                }}
                onOpenCompleteModal={() => setIsCompleteProfileOpen(true)}
                onOpenReportModal={() =>
                  handleOpenReportModal(
                    currentRole === 'gestionnaire' && isGestionnaireInCompanyMode
                      ? 'certifie'
                      : 'miroir'
                  )
                }
                canEditAsManager={currentRole === 'gestionnaire'}
              />
            )}

            {activePage === 'echeancier' && (
              <EcheancierPage
                obligations={obligations}
                dateReference={dateReference}
                onOpenConfirmModal={(ob) => setConfirmModalObligation(ob)}
                onOpenAddDeadlineModal={() => setIsAddDeadlineOpen(true)}
                onOpenFiche={(ficheId) => {
                  const found = fiches.find((f) => f.id === ficheId);
                  if (found) setSelectedFiche(found);
                  else if (fiches.length > 0) setSelectedFiche(fiches[0]);
                }}
                onSaveSimulation={handleSaveSimulation}
                onDeleteSimulation={handleDeleteSimulation}
              />
            )}

            {activePage === 'opportunites' && (
              <OpportunitesPage
                opportunities={opportunities}
                onNavigate={setActivePage}
                onOpenFiche={(ficheId) => {
                  const found = fiches.find((f) => f.id === ficheId);
                  if (found) setSelectedFiche(found);
                  else if (fiches.length > 0) setSelectedFiche(fiches[0]);
                }}
              />
            )}

            {activePage === 'bibliotheque' && (
              <BibliothequePage fiches={fiches} onOpenFiche={(f) => setSelectedFiche(f)} />
            )}

            {activePage === 'veille' && <VeillePage onNavigate={setActivePage} flashs={flashs} />}

            {activePage === 'documents' && (
              <DocumentsPage
                documents={documents}
                onUploadDocument={(doc) => setDocuments((prev) => [doc, ...prev])}
              />
            )}

            {activePage === 'profil' && (
              <ProfilPage
                profile={profile}
                onUpdateProfile={(p) => handleSaveCompletedProfile(p)}
                onOpenSimulator={() => setIsSimulatorOpen(true)}
                onOpenLaravelCode={() => setIsLaravelViewerOpen(true)}
                onExportData={handleExportData}
                onDeleteAccount={handleDeleteAccount}
              />
            )}
          </main>
        </div>

        {/* Panneau IA - Cohabite en mode compact (430px) OU prend 100% de la zone de contenu en mode agrandi */}
        {isAssistantOpen && (
          <div
            className={`h-full flex flex-col transition-[width] duration-250 ease-in-out shrink-0 ${
              isAssistantFull
                ? 'w-full flex-1'
                : 'w-full md:w-[430px] md:min-w-[430px] md:max-w-[430px] border-l border-[#E5E5F0]'
            }`}
          >
            <AssistantPanel
              isOpen={isAssistantOpen}
              onClose={handleCloseAssistant}
              isFull={isAssistantFull}
              onToggleFull={handleToggleAssistantFull}
              onNavigate={(page) => {
                setActivePage(page);
                if (isAssistantFull) setIsAssistantFull(false);
              }}
              companyProfile={profile}
              obligations={obligations}
              opportunities={opportunities}
              flashs={flashs}
              key={authUserId || 'demo'}
              userId={authUserId}
initialMessages={null}
onMessagesChange={() => {}}
            />
          </div>
        )}
      </div>

      {/* Complete Profile Modal (Niveau 3 Utilisateur & Niveau 2 Gestionnaire) */}
      <CompleteProfileModal
        isOpen={isCompleteProfileOpen}
        onClose={() => {
          setIsCompleteProfileOpen(false);
          setCompanyTargetForManager(null);
        }}
        currentProfile={profile}
        onSaveProfile={handleSaveCompletedProfile}
        isManagerCompletingForClient={currentRole === 'gestionnaire' && !!companyTargetForManager}
        clientCompanyName={companyTargetForManager?.name || profile.nom}
      />

      {/* Add Company Modal (Niveau 2 Gestionnaire - Formulaire Complet) */}
      <AddCompanyModal
        isOpen={isAddCompanyOpen}
        onClose={() => setIsAddCompanyOpen(false)}
        onAddCompany={handleAddNewCompany}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!confirmModalObligation}
        obligation={confirmModalObligation}
        onClose={() => setConfirmModalObligation(null)}
        onConfirm={handleConfirmObligation}
      />

      {/* Add Custom Deadline Modal */}
      <AddDeadlineModal
        isOpen={isAddDeadlineOpen}
        onClose={() => setIsAddDeadlineOpen(false)}
        onAdd={handleAddCustomDeadline}
      />

      {/* Fiche Reader Modal */}
      <FicheReaderModal fiche={selectedFiche} onClose={() => setSelectedFiche(null)} />

      {/* Business Engines Simulator Modal */}
      <React.Suspense fallback={null}>
        <EngineSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          currentObligations={obligations}
        />
      </React.Suspense>

      {/* Laravel 12 & PHP 8.3 Code Inspector Modal */}
      <LaravelCodeViewerModal
        isOpen={isLaravelViewerOpen}
        onClose={() => setIsLaravelViewerOpen(false)}
      />

      {/* Confirmation d'accès à l'espace d'une entreprise (Niveau 2 Gestionnaire) */}
      <ConfirmEnterCompanyModal
        isOpen={!!companyPendingEnter}
        company={companyPendingEnter}
        onClose={() => setCompanyPendingEnter(null)}
        onConfirm={handleConfirmEnterCompany}
      />

      {/* Rapport d'Audit × Vision « Conformité d'abord » (Miroir vs Certifié) */}
      <React.Suspense fallback={null}>
        <ReportPdfModal
          isOpen={isReportPdfModalOpen}
          onClose={() => {
            setIsReportPdfModalOpen(false);
            setReportModalProfile(null);
          }}
          companyProfile={reportModalProfile || profile}
          obligations={obligations}
          opportunities={opportunities}
          initialState={reportModalState}
          userRole={currentRole}
          onArchiveDocument={(doc) => setDocuments((prev) => [doc, ...prev])}
        />
      </React.Suspense>
    </div>
  );
}
export default App;
