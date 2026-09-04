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
} from './types';
import {
  initialObligations,
  initialCompanyProfile,
  initialOpportunities,
  initialFiches,
  initialVeilleItems,
  initialDocuments,
  initialFlashs,
} from './data/mockData';
import { mockUsers, initialCompaniesEntities, checkIsProfileComplete } from './data/rolesData';
import { ObligationEngine } from './services/obligationEngine';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { AssistantPanel } from './components/AssistantPanel';
import { ConfirmModal } from './components/ConfirmModal';
import { AddDeadlineModal } from './components/AddDeadlineModal';
import { FicheReaderModal } from './components/FicheReaderModal';
import { EngineSimulatorModal } from './components/EngineSimulatorModal';
import { LaravelCodeViewerModal } from './components/LaravelCodeViewerModal';
import { CompleteProfileModal } from './components/CompleteProfileModal';
import { AddCompanyModal } from './components/AddCompanyModal';
import { ConfirmEnterCompanyModal } from './components/ConfirmEnterCompanyModal';
import { ReportPdfModal } from './components/ReportPdfModal';
import { ArrowLeft } from 'lucide-react';

// Pages
import { AccueilPage } from './pages/AccueilPage';
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

function entityToProfile(ent: CompanyEntity): CompanyProfile {
  return {
    ...initialCompanyProfile,
    id: ent.id,
    nom: ent.name,
    raisonSociale: ent.raisonSociale || ent.name,
    formeJuridique: ent.formeJuridique,
    secteurActivite: ent.secteurActivite,
    secteur: ent.secteurActivite,
    regimeFiscal: ent.regimeFiscal,
    chiffreAffairesEstime: ent.caEstime,
    effectif: `${ent.effectif || 0} salariés`,
    effectifSalaries: ent.effectif || 0,
    adhesionCga: ent.adhesionCga,
    adherentCGA: ent.adhesionCga ? 'Oui — CGA Agréé' : 'Non',
    rccm: ent.numeroRccm || '',
    numeroCnps: ent.numeroCnps || '',
    numeroCC: ent.numeroCc || '',
    ncc: ent.numeroCc || '',
    centreImpots: ent.centreImpots || 'CDI Plateau',
    profilComplet: ent.profilComplet,
  };
}

export function App() {
  const [activePage, setActivePage] = useState<PageId>('gestionnaire_dashboard');
  const [currentUser, setCurrentUser] = useState<AppUser>(mockUsers.gestionnaire);
  const [currentRole, setCurrentRole] = useState<UserRole>('gestionnaire');
  const [companies, setCompanies] = useState<CompanyEntity[]>(initialCompaniesEntities);
  const [activeCompanyId, setActiveCompanyId] = useState<string>('ent-koffi');
  const [isGestionnaireInCompanyMode, setIsGestionnaireInCompanyMode] = useState<boolean>(false);
  const [companyPendingEnter, setCompanyPendingEnter] = useState<CompanyEntity | null>(null);

  const [obligations, setObligations] = useState<Obligation[]>(initialObligations);
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

  // Modals pour la gestion multi-niveaux et profil incomplet
  const [isCompleteProfileOpen, setIsCompleteProfileOpen] = useState(false);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [companyTargetForManager, setCompanyTargetForManager] = useState<CompanyEntity | null>(null);

  // Modal Rapport d'Audit (Miroir vs Certifié)
  const [isReportPdfModalOpen, setIsReportPdfModalOpen] = useState(false);
  const [reportModalState, setReportModalState] = useState<'miroir' | 'certifie'>('miroir');
  const [reportModalProfile, setReportModalProfile] = useState<CompanyProfile | null>(null);

  // Résolution dynamique continue des obligations selon le profil réel par ObligationEngine
  const quittancesMap = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    obligations.forEach((ob) => {
      if (ob.statut === 'accomplie' || Boolean(ob.quittanceRef)) {
        map[ob.id] = true;
      }
    });
    return map;
  }, [obligations]);

  const engineOutput = React.useMemo(() => {
    return ObligationEngine.resolve(profile, quittancesMap);
  }, [profile, quittancesMap]);

  // Page titles map
  const pageTitles: Record<PageId, string> = {
    accueil: 'Accueil',
    dashboard: currentRole === 'gestionnaire' && isGestionnaireInCompanyMode ? `Dashboard — ${profile.nom}` : 'Tableau de bord',
    echeancier: 'Échéancier',
    opportunites: 'Opportunités fiscales',
    bibliotheque: 'Bibliothèque de fiches',
    veille: 'Veille réglementaire',
    documents: 'Documents',
    profil: currentRole === 'gestionnaire' && isGestionnaireInCompanyMode ? "Fiche de l'entreprise" : 'Profil entreprise',
    super_admin: 'Dashboard Global — Super Admin HQ',
    super_admin_entreprises: 'Entreprises Référencées',
    super_admin_pipeline: 'Pipeline de Veille Réglementaire (J0→J+5)',
    super_admin_notifications: 'Diffusion Notifications',
    super_admin_audits: 'Audits Transversaux',
    super_admin_rappels: 'Séquences de Rappels (J+3, J+7, J+15)',
    gestionnaire_dashboard: 'Vue d’ensemble Portefeuille',
    mes_entreprises: 'Mes Entreprises',
    admin_console: 'Super Admin HQ',
    admin_entreprises: 'Gestion Entreprises',
    admin_pipeline: 'Pipeline Veille',
    admin_notifications: 'Notifications Globales',
    admin_audits: 'Audits Transversaux',
    admin_schema: 'Schéma Supabase',
  };

  // Switch de rôle depuis le RoleSwitcher
  const handleSelectRoleProfile = (role: UserRole, userKey: string) => {
    setCurrentRole(role);
    const selectedUser = mockUsers[userKey] || mockUsers.utilisateur_complet;
    setCurrentUser(selectedUser);
    setIsGestionnaireInCompanyMode(false);
    setCompanyPendingEnter(null);

    if (role === 'super_admin') {
      setActivePage('super_admin');
    } else if (role === 'gestionnaire') {
      setActivePage('gestionnaire_dashboard');
    } else if (userKey === 'utilisateur_incomplet') {
      // Utilisateur Niveau 3 avec profil incomplet (Atelier N'Guessan)
      const incomplet = companies.find((c) => c.id === 'ent-nguessan') || companies[0];
      setActiveCompanyId(incomplet.id);
      setProfile(entityToProfile(incomplet));
      setActivePage('dashboard');
    } else {
      // Utilisateur Niveau 3 avec profil complet (Koffi BTP)
      const complet = companies.find((c) => c.id === 'ent-koffi') || companies[0];
      setActiveCompanyId(complet.id);
      setProfile(entityToProfile(complet));
      setActivePage('dashboard');
    }
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
  };

  // Mark obligation as accomplished
  const handleConfirmObligation = (
    obligationId: string,
    quittanceRef: string,
    declarationDate: string,
    fileName?: string
  ) => {
    setObligations((prev) =>
      prev.map((ob) => {
        if (ob.id === obligationId) {
          return {
            ...ob,
            statut: 'accomplie',
            quittanceRef,
            dateDeclaration: declarationDate,
            pieceJointeUrl: fileName ? `/uploads/${fileName}` : undefined,
          };
        }
        return ob;
      })
    );

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

  // Sauvegarde d'une simulation de coût réel par obligation
  const handleSaveSimulation = (obligationId: string, simulation: CostSimulation) => {
    setObligations((prev) =>
      prev.map((ob) => (ob.id === obligationId ? { ...ob, simulation } : ob))
    );
  };

  // Suppression d'une simulation de coût réel
  const handleDeleteSimulation = (obligationId: string) => {
    setObligations((prev) =>
      prev.map((ob) => (ob.id === obligationId ? { ...ob, simulation: undefined } : ob))
    );
  };

  // Ouverture du Rapport d'Audit (Miroir ou Certifié)
  const handleOpenReportModal = (state: 'miroir' | 'certifie', targetProfile?: CompanyProfile) => {
    setReportModalState(state);
    setReportModalProfile(targetProfile || profile);
    setIsReportPdfModalOpen(true);
  };

  // Ouverture directe de certification pour une entreprise (depuis le tableau de bord gestionnaire)
  const handleOpenCertifyForCompany = (comp: CompanyEntity) => {
    const prof = entityToProfile(comp);
    handleOpenReportModal('certifie', prof);
  };

  // Add custom deadline
  const handleAddCustomDeadline = (newDeadline: {
    titre: string;
    domaine: 'fiscal' | 'social' | 'douanes' | 'commerce' | 'administratif';
    dateIso: string;
    montant: string;
    moisGroupe: string;
  }) => {
    const d = new Date(newDeadline.dateIso);
    const monthsShort = ['JANV', 'FÉVR', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
    const jour = String(d.getDate()).padStart(2, '0');
    const mois = monthsShort[d.getMonth()];

    const newObligation: Obligation = {
      id: `custom-${Date.now()}`,
      titre: newDeadline.titre,
      domaine: newDeadline.domaine,
      statut: 'imminente',
      tagLabel: 'Imminent',
      tagClass: 'imminent',
      echeanceLabel: `Échéance le ${jour}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
      echeanceDateIso: newDeadline.dateIso,
      jour,
      mois,
      moisGroupe: newDeadline.moisGroupe,
      montantEstime: newDeadline.montant,
      administration: newDeadline.domaine === 'social' ? 'CNPS' : 'DGI',
      baseLegale: 'Déclaration spontanée',
    };

    setObligations((prev) => [newObligation, ...prev]);
  };

  const handleNavigate = (page: PageId | string) => {
    if (page === 'registre') {
      setActivePage('dashboard');
    } else {
      setActivePage(page as PageId);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#FDFDFE] text-[#20263A] font-sans antialiased selection:bg-[#EDEBF9] selection:text-[#3D3680]">
      {/* Sidebar Nav - Toujours visible, largeur fixe */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        retardCount={engineOutput.nombreEnRetard}
        complianceScore={engineOutput.scoreConformite}
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
            onOpenAssistant={() => setIsAssistantOpen(true)}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
            onNavigateToVeille={() => {
              setActivePage('veille');
              setUnreadNotifCount(0);
            }}
            unreadCount={unreadNotifCount}
            currentRole={currentRole}
            currentUser={currentUser}
            isProfileIncomplete={!profile.profilComplet}
            onSelectRoleProfile={handleSelectRoleProfile}
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
              onClose={() => setIsAssistantOpen(false)}
              isFull={isAssistantFull}
              onToggleFull={() => setIsAssistantFull(!isAssistantFull)}
              onNavigate={(page) => {
                setActivePage(page);
                if (isAssistantFull) setIsAssistantFull(false);
              }}
              companyProfile={profile}
              obligations={obligations}
              opportunities={opportunities}
              flashs={flashs}
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
      <EngineSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        currentObligations={obligations}
      />

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
    </div>
  );
}
export default App;
