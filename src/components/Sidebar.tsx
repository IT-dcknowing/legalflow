import React from 'react';
import {
  Home,
  LayoutDashboard,
  Calendar,
  Zap,
  BookOpen,
  Radio,
  UserCheck,
  Search,
  X,
  FolderLock,
  ShieldAlert,
  Building2,
  Send,
  FileCheck2,
  Mail,
  TrendingUp,
  ArrowLeft,
  Briefcase,
  Settings,
} from 'lucide-react';
import { PageId, UserRole, CompanyEntity } from '../types';
import { LegalFlowLogo } from './LegalFlowLogo';

interface SidebarProps {
  currentPage?: PageId;
  activePage?: PageId;
  onSelectPage?: (page: PageId) => void;
  onNavigate?: (page: PageId) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  retardCount?: number;
  complianceScore?: number;
  userRole?: string;
  companyName?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  role?: UserRole;
  companies?: CompanyEntity[];
  activeCompanyId?: string;
  onSelectCompany?: (id: string) => void;
  onAddNewCompany?: () => void;
  onCompleteCompanyProfile?: (company: CompanyEntity) => void;
  // Gestionnaire navigation state
  isGestionnaireInCompanyMode?: boolean;
  activeCompanyEntity?: CompanyEntity | null;
  onExitCompanyMode?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  activePage,
  onSelectPage,
  onNavigate,
  searchQuery = '',
  onSearchChange,
  retardCount,
  userRole = 'Établissements Koffi BTP',
  companyName = 'Alex Koffi',
  isMobileOpen = false,
  onCloseMobile,
  role = 'utilisateur',
  companies = [],
  activeCompanyId,
  isGestionnaireInCompanyMode = false,
  activeCompanyEntity,
  onExitCompanyMode,
}) => {
  const current = activePage || currentPage || 'dashboard';

  const handleSelect = (page: PageId) => {
    if (onNavigate) onNavigate(page);
    else if (onSelectPage) onSelectPage(page);
    if (onCloseMobile) onCloseMobile();
  };

  // 1. Navigation items for SUPER ADMIN (Niveau 1) — Épurée & Tour de contrôle
  const superAdminNavItems: Array<{
    id: PageId;
    label: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }> = [
    {
      id: 'super_admin',
      label: 'Dashboard Global',
      icon: <TrendingUp className="w-[18px] h-[18px]" />,
    },
    {
      id: 'super_admin_entreprises',
      label: 'Entreprises',
      icon: <Building2 className="w-[18px] h-[18px]" />,
      badge: (
        <span className="ml-auto bg-[#EDEBF9] text-[#7C3AED] text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
          {companies.length}
        </span>
      ),
    },
    {
      id: 'super_admin_pipeline',
      label: 'Pipeline Veille (J0→J+5)',
      icon: <Radio className="w-[18px] h-[18px]" />,
      badge: (
        <span className="ml-auto bg-[#EDEBF9] text-[#7C3AED] text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
          3
        </span>
      ),
    },
    {
      id: 'super_admin_notifications',
      label: 'Diffusion Notifications',
      icon: <Send className="w-[18px] h-[18px]" />,
    },
    {
      id: 'super_admin_audits',
      label: 'Audits Transversaux',
      icon: <FileCheck2 className="w-[18px] h-[18px]" />,
    },
    {
      id: 'super_admin_rappels',
      label: 'Rappels J+3, J+7, J+15',
      icon: <Mail className="w-[18px] h-[18px]" />,
    },
  ];

  // 2. Navigation items for GESTIONNAIRE (Niveau 2) — Portefeuille (Ultra Simple)
  const gestionnairePortfolioNavItems: Array<{
    id: PageId;
    label: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }> = [
    {
      id: 'gestionnaire_dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
    },
    {
      id: 'mes_entreprises',
      label: 'Mes entreprises',
      icon: <Building2 className="w-[18px] h-[18px]" />,
      badge: (
        <span className="ml-auto bg-[#EDEBF9] text-[#4F46A0] text-[10.5px] font-black px-1.5 py-0.5 rounded-full leading-none">
          {companies.length}
        </span>
      ),
    },
    {
      id: 'profil',
      label: 'Mon profil / Paramètres',
      icon: <Settings className="w-[18px] h-[18px]" />,
    },
  ];

  // 3. Navigation items for GESTIONNAIRE INSIDE A COMPANY OR STANDARD USER (Niveau 3)
  const companyNavItems: Array<{
    id: PageId;
    label: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }> = [
    ...(role === 'utilisateur'
      ? [
          {
            id: 'accueil' as PageId,
            label: 'Accueil',
            icon: <Home className="w-[18px] h-[18px]" />,
          },
        ]
      : []),
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
    },
    {
      id: 'echeancier',
      label: 'Échéancier',
      icon: <Calendar className="w-[18px] h-[18px]" />,
      badge: retardCount && retardCount > 0 ? (
        <span className="ml-auto bg-[#C4432B] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
          {retardCount}
        </span>
      ) : undefined,
    },
    {
      id: 'opportunites',
      label: 'Opportunités',
      icon: <Zap className="w-[18px] h-[18px]" />,
    },
    {
      id: 'bibliotheque',
      label: 'Bibliothèque',
      icon: <BookOpen className="w-[18px] h-[18px]" />,
    },
    {
      id: 'veille',
      label: 'Veille & Flashs',
      icon: <Radio className="w-[18px] h-[18px]" />,
      badge: (
        <span className="ml-auto bg-[#EDEBF9] text-[#4F46A0] text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
          6
        </span>
      ),
    },
    {
      id: 'documents',
      label: 'Mes documents',
      icon: <FolderLock className="w-[18px] h-[18px]" />,
    },
    {
      id: 'profil',
      label: role === 'gestionnaire' ? "Fiche de l'entreprise" : 'Profil',
      icon: <UserCheck className="w-[18px] h-[18px]" />,
    },
  ];

  // Pick the nav items based on role & mode
  let activeNavItems = companyNavItems;
  if (role === 'super_admin') {
    activeNavItems = superAdminNavItems;
  } else if (role === 'gestionnaire' && !isGestionnaireInCompanyMode) {
    activeNavItems = gestionnairePortfolioNavItems;
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Main Container */}
      <aside
        id="sidebarMain"
        className={`w-[240px] shrink-0 bg-white border-r border-[#E5E5F0] flex flex-col p-[20px_14px] h-screen z-50 select-none
          fixed inset-y-0 left-0 transition-transform duration-200 ease-in-out
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          md:sticky md:top-0 md:shadow-none
        `}
      >
        {/* Brand */}
        <div className="flex items-center justify-between p-[4px_4px_18px]">
          <div className="flex items-center gap-2">
            <LegalFlowLogo
              size="md"
              showSubtitle={true}
              onClick={() => {
                if (role === 'super_admin') handleSelect('super_admin');
                else if (role === 'gestionnaire') handleSelect('gestionnaire_dashboard');
                else handleSelect('accueil');
              }}
            />
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-[#6B6F85] hover:bg-[#F6F6FB] transition-colors"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Badge Niveau 1 Super Admin */}
        {role === 'super_admin' && (
          <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] text-[#6D28D9] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-black">
              <ShieldAlert className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>SUPER ADMIN HQ</span>
            </div>
            <span className="text-[10px] font-bold bg-[#7C3AED] text-white px-1.5 py-0.2 rounded-md">
              NIV. 1
            </span>
          </div>
        )}

        {/* Bouton de retour en arrière pour le Gestionnaire quand il est dans l'espace d'une entreprise */}
        {role === 'gestionnaire' && isGestionnaireInCompanyMode && (
          <div className="mb-3 space-y-2">
            <button
              id="btnBackToPortfolioSidebar"
              type="button"
              onClick={() => {
                if (onExitCompanyMode) onExitCompanyMode();
                else handleSelect('mes_entreprises');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 bg-[#F6F6FB] hover:bg-[#EDEBF9] text-[#4F46A0] text-xs font-black rounded-xl border border-[#E5E5F0] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Retour à Mes entreprises</span>
            </button>

            {activeCompanyEntity && (
              <div className="p-2.5 rounded-xl bg-[#FAFAFC] border border-[#E5E5F0] text-left">
                <div className="text-[10px] font-bold text-[#6B6F85] uppercase tracking-wider">
                  Dossier Client Actif
                </div>
                <div className="text-xs font-black text-[#171A2E] truncate mt-0.5">
                  {activeCompanyEntity.name}
                </div>
                <div className="text-[10.5px] text-[#4F46A0] font-semibold truncate">
                  {activeCompanyEntity.regimeFiscal || 'Régime standard'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search box (pour les utilisateurs ou admin) */}
        {role !== 'super_admin' && !isGestionnaireInCompanyMode && (
          <div className="flex items-center gap-[8px] bg-[#F6F6FB] border border-[#E5E5F0] rounded-[8px] p-[8px_10px] mb-[12px]">
            <Search className="w-[15px] h-[15px] text-[#6B6F85] shrink-0" />
            <input
              id="globalSearchInput"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Rechercher..."
              className="border-none bg-transparent outline-none text-[13px] w-full text-[#171A2E] placeholder-[#6B6F85]"
            />
          </div>
        )}

        {/* Navigation principale */}
        <nav className="flex flex-col gap-[3px] flex-1 overflow-y-auto pr-1">
          {activeNavItems.map((item) => {
            const isActive = current === item.id;
            const isSuperAdminItem = role === 'super_admin';

            return (
              <button
                key={item.id}
                id={`navBtn-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`flex items-center gap-[10px] p-[9px_10px] rounded-[8px] font-semibold text-[13.5px] text-left transition-colors cursor-pointer ${
                  isActive
                    ? isSuperAdminItem
                      ? 'bg-[#F5F3FF] text-[#6D28D9] font-black shadow-2xs border border-[#DDD6FE]'
                      : 'bg-[#EDEBF9] text-[#3D3680] font-bold shadow-2xs'
                    : 'text-[#20263A] hover:bg-[#F6F6FB]'
                }`}
              >
                <span
                  className={`shrink-0 flex items-center justify-center ${
                    isActive
                      ? isSuperAdminItem
                        ? 'text-[#7C3AED]'
                        : 'text-[#4F46A0]'
                      : 'text-[#6B6F85]'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
                {item.badge}
              </button>
            );
          })}
        </nav>

        {/* Footer user row */}
        <div className="mt-auto pt-[14px] border-t border-[#E5E5F0]">
          {role === 'super_admin' ? (
            <div
              className="flex items-center gap-[9px] p-[6px_8px] rounded-[8px] hover:bg-[#F5F3FF] transition-colors cursor-pointer"
              onClick={() => handleSelect('super_admin')}
            >
              <div className="w-[32px] h-[32px] rounded-full bg-[#7C3AED] text-white shrink-0 flex items-center justify-center font-black text-[12px] shadow-2xs">
                AD
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold text-[#171A2E] truncate">
                  Me. Aminata Diallo
                </div>
                <div className="text-[11px] text-[#7C3AED] font-bold truncate">
                  Équipe Legal Flow
                </div>
              </div>
            </div>
          ) : role === 'gestionnaire' ? (
            <div
              className="flex items-center gap-[9px] p-[6px_8px] rounded-[8px] hover:bg-[#F6F6FB] transition-colors cursor-pointer"
              onClick={() => handleSelect('profil')}
            >
              <div className="w-[32px] h-[32px] rounded-full bg-[#1E2337] text-white shrink-0 flex items-center justify-center font-black text-[12px]">
                CA
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold text-[#171A2E] truncate">
                  Cabinet Audit & Conseils CI
                </div>
                <div className="text-[11px] text-[#6B6F85] font-semibold truncate">
                  Gestionnaire Agréé
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-[9px] p-[6px_8px] rounded-[8px] hover:bg-[#F6F6FB] transition-colors cursor-pointer"
              onClick={() => handleSelect('profil')}
            >
              <div className="w-[32px] h-[32px] rounded-full bg-[#D9DAF0] shrink-0 flex items-center justify-center font-bold text-[12px] text-[#3D3680]">
                AK
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold text-[#171A2E] truncate">{companyName}</div>
                <div className="text-[11px] text-[#6B6F85] truncate">{userRole}</div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
