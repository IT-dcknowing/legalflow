import React, { useState, useRef, useEffect } from 'react';
import { UserRole, AppUser } from '../types';
import { mockUsers } from '../data/rolesData';
import { ShieldAlert, Briefcase, User, ChevronDown, Check, Info } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: UserRole;
  currentUser: AppUser;
  isProfileIncomplete: boolean;
  onSelectRoleProfile: (role: UserRole, userKey: string) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentRole,
  currentUser,
  isProfileIncomplete,
  onSelectRoleProfile,
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

  const rolesConfig = [
    {
      key: 'super_admin',
      role: 'super_admin' as UserRole,
      label: 'Niveau 1 : Super Admin',
      sublabel: 'Équipe Legal Flow (Accès total)',
      user: mockUsers.super_admin,
      badgeColor: 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]',
      dotColor: 'bg-[#7C3AED]',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-[#7C3AED]" />,
      desc: 'Tour de contrôle : Dashboard global, 142 entreprises, pipeline J0-J5, diffusion notifications, audits transversaux.',
    },
    {
      key: 'gestionnaire',
      role: 'gestionnaire' as UserRole,
      label: 'Niveau 2 : Gestionnaire',
      sublabel: 'Cabinet Comptable / Multi-entreprises',
      user: mockUsers.gestionnaire,
      badgeColor: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
      dotColor: 'bg-[#D97706]',
      icon: <Briefcase className="w-3.5 h-3.5 text-[#D97706]" />,
      desc: 'Gère plusieurs entreprises, switch instantané, création complète, complète les profils incomplets.',
    },
    {
      key: 'utilisateur_incomplet',
      role: 'utilisateur' as UserRole,
      label: 'Niveau 3 : Utilisateur (Incomplet)',
      sublabel: "Atelier N'Guessan (Mode 'TOUT')",
      user: mockUsers.utilisateur_incomplet,
      badgeColor: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]',
      dotColor: 'bg-[#F59E0B]',
      icon: <User className="w-3.5 h-3.5 text-[#D97706]" />,
      desc: "Accès total mais badge 'Profil incomplet' visible et données filtrées sur générique 'TOUT'.",
    },
    {
      key: 'utilisateur_complet',
      role: 'utilisateur' as UserRole,
      label: 'Niveau 3 : Utilisateur (Complet)',
      sublabel: 'Établissements Koffi BTP (Personnalisé)',
      user: mockUsers.utilisateur_complet,
      badgeColor: 'bg-[#F0FDF4] text-[#15803D] border-[#86EFAC]',
      dotColor: 'bg-[#16A34A]',
      icon: <User className="w-3.5 h-3.5 text-[#16A34A]" />,
      desc: 'Profil 100% complété : obligations précises, opportunités chiffrées et IA contextualisée.',
    },
  ];

  const currentConfig =
    currentRole === 'super_admin'
      ? rolesConfig[0]
      : currentRole === 'gestionnaire'
      ? rolesConfig[1]
      : isProfileIncomplete
      ? rolesConfig[2]
      : rolesConfig[3];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        id="btnRoleSwitcher"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer ${currentConfig.badgeColor}`}
        title="Changer de niveau d'habilitation pour tester"
      >
        <span className={`w-2 h-2 rounded-full ${currentConfig.dotColor} shrink-0 animate-pulse`} />
        <span className="truncate max-w-[130px] sm:max-w-[180px]">
          {currentRole === 'super_admin'
            ? 'Super Admin (Niv. 1)'
            : currentRole === 'gestionnaire'
            ? 'Gestionnaire (Niv. 2)'
            : isProfileIncomplete
            ? 'Utilisateur - Incomplet (Niv. 3)'
            : 'Utilisateur - Conforme (Niv. 3)'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
      </button>

      {isOpen && (
        <div
          id="roleDropdownMenu"
          className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-xl shadow-xl border border-[#E2E8F0] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-[#1E293B]"
        >
          <div className="p-2.5 border-b border-[#F1F5F9] mb-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#1E293B] uppercase tracking-wider">
              <Info className="w-3.5 h-3.5 text-[#4F46A0]" />
              <span>Simulateur d'Habilitations (3 Niveaux)</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
              Basculez instantanément pour tester les règles d'accès, le badge de profil incomplet, le switch multi-entreprises et la console Super Admin.
            </p>
          </div>

          <div className="space-y-1">
            {rolesConfig.map((item) => {
              const isSelected =
                (item.key === 'super_admin' && currentRole === 'super_admin') ||
                (item.key === 'gestionnaire' && currentRole === 'gestionnaire') ||
                (item.key === 'utilisateur_incomplet' && currentRole === 'utilisateur' && isProfileIncomplete) ||
                (item.key === 'utilisateur_complet' && currentRole === 'utilisateur' && !isProfileIncomplete);

              return (
                <button
                  key={item.key}
                  id={`btnSelectRole-${item.key}`}
                  onClick={() => {
                    onSelectRoleProfile(item.role, item.key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#F8FAFC] border-[#4F46A0] ring-1 ring-[#4F46A0]/20'
                      : 'border-transparent hover:bg-[#F8FAFC] hover:border-[#E2E8F0]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      {item.icon}
                      <span className="text-xs font-bold text-[#1E293B]">{item.label}</span>
                    </div>
                    <div className="text-[11px] font-medium text-[#475569]">{item.sublabel}</div>
                    <div className="text-[10.5px] text-[#64748B] leading-normal">{item.desc}</div>
                  </div>

                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-[#4F46A0] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
