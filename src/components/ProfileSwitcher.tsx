import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { mockUsers } from '../data/rolesData';
import type { AppUser, UserRole } from '../types';

interface ProfileSwitcherProps {
  currentRole: UserRole;
  currentUser?: AppUser;
  onSelectProfile: (userKey: string) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin HQ',
  gestionnaire: 'Gestionnaire',
  utilisateur: 'Utilisateur',
};

const ROLE_STYLES: Record<UserRole, string> = {
  super_admin: 'bg-[#F3EFFF] text-[#7C3AED] border-[#DDD0FA]',
  gestionnaire: 'bg-[#EDEBF9] text-[#3D3680] border-[#C7C4E8]',
  utilisateur: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
};

/**
 * Sélecteur de profils DÉMO (auth en pause) : bascule l'état affiché
 * (rôle + entreprise + dashboard) sans authentification. Profils issus de
 * mockUsers (rolesData.ts) : super_admin, gestionnaire, utilisateur_complet,
 * utilisateur_incomplet. Reconstruction propre dans l'état actuel du produit
 * (remplace l'ancien RoleSwitcher supprimé en PEN-010).
 */
export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
  currentRole,
  currentUser,
  onSelectProfile,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const entries = Object.entries(mockUsers);
  const activeKey =
    entries.find(([, u]) => u.id === currentUser?.id && u.role === currentRole)?.[0] || '';

  return (
    <div className="relative" ref={ref}>
      <button
        id="btnProfileSwitcher"
        onClick={() => setOpen((prev) => !prev)}
        title="Basculer de profil démo (sans authentification)"
        className={`hidden md:flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border whitespace-nowrap cursor-pointer ${ROLE_STYLES[currentRole]}`}
      >
        <span className="max-w-[140px] truncate">{currentUser?.fullName || 'Profil démo'}</span>
        <span aria-hidden>·</span>
        <span>{ROLE_LABELS[currentRole]}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute top-[42px] right-0 w-[280px] bg-white border border-[#E5E5F0] rounded-xl shadow-xl z-30 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-[#E5E5F0] text-[11px] font-bold text-[#8C90A4] uppercase tracking-wider">
            Voir comme (démo, sans login)
          </div>
          <div className="max-h-[300px] overflow-y-auto py-1">
            {entries.map(([key, user]) => {
              const isActive = key === activeKey;
              return (
                <button
                  key={key}
                  onClick={() => {
                    onSelectProfile(key);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[#F6F6FB] transition-colors cursor-pointer ${
                    isActive ? 'bg-[#F6F6FB]' : ''
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 border ${ROLE_STYLES[user.role]}`}
                  >
                    {user.fullName
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-[#171A2E] truncate">
                      {user.fullName}
                    </span>
                    <span className="block text-[11px] text-[#6B6F85] truncate">
                      {ROLE_LABELS[user.role]} · {user.email}
                    </span>
                  </span>
                  {isActive && <Check className="w-4 h-4 text-[#4F46A0] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
