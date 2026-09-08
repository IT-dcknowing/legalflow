import React, { useState, useRef, useEffect } from 'react';
import { Bell, MessageSquare, Menu, LogOut, MessageCircle } from 'lucide-react';
import { PageId, UserRole, AppUser } from '../types';
import { LegalFlowLogo } from './LegalFlowLogo';
import { ProfileSwitcher } from './ProfileSwitcher';
import {
  formatDateReferenceShort,
  getDateReferenceOverrideIso,
  setDateReferenceOverride,
  toIsoDate,
} from '../services/dateReference';

interface TopbarProps {
  pageTitle: string;
  dateReference: Date;
  onQaDateChange?: () => void;
  onLogout?: () => void;
  onOpenAssistant: () => void;
  onNavigateToVeille: () => void;
  onToggleMobileMenu?: () => void;
  unreadCount?: number;
  currentRole?: UserRole;
  currentUser?: AppUser;
  onSelectProfile?: (userKey: string) => void;
  /** CDC §1 : rappel discret après 3 fermetures du pop-up sans opt-in. */
  whatsappMuted?: boolean;
  onOpenParametres?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  pageTitle,
  dateReference,
  onQaDateChange,
  onLogout,
  onOpenAssistant,
  onNavigateToVeille,
  onToggleMobileMenu,
  unreadCount = 3,
  currentRole = 'utilisateur',
  currentUser,
  onSelectProfile,
  whatsappMuted = false,
  onOpenParametres,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  // Outil QA invisible : forçage de l'horloge uniquement avec ?qa=1 dans l'URL.
  const [qaVisible] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('qa')
  );
  const [qaValue, setQaValue] = useState(
    () => getDateReferenceOverrideIso() || toIsoDate(dateReference)
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      id="topbarMain"
      className="flex items-center justify-between p-[12px_16px] md:p-[16px_28px] border-b border-[#E5E5F0] bg-white sticky top-0 z-20"
    >
      <div className="flex items-center gap-2.5 md:gap-3">
        {/* Mobile Hamburger menu */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 -ml-1 text-[#20263A] hover:bg-[#F6F6FB] rounded-lg transition-colors"
            aria-label="Ouvrir le menu de navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {/* Mobile brand logo */}
        <div className="md:hidden">
          <LegalFlowLogo size="sm" showSubtitle={false} />
        </div>
        <h1 id="pageTitle" className="text-[17px] md:text-[18px] m-0 font-extrabold text-[#171A2E] tracking-tight">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 relative" ref={notifRef}>
        {/* Sélecteur de profils démo (auth en pause) */}
        {onSelectProfile && (
          <ProfileSwitcher
            currentRole={currentRole}
            currentUser={currentUser}
            onSelectProfile={onSelectProfile}
          />
        )}

        {/* Notification Bell button */}
        <button
          id="notifBtn"
          onClick={() => setNotifOpen(!notifOpen)}
          aria-label="Notifications"
          className="relative w-[36px] h-[36px] rounded-[8px] border border-[#E5E5F0] bg-white flex items-center justify-center hover:bg-[#F6F6FB] transition-colors cursor-pointer"
        >
          <Bell className="w-[17px] h-[17px] text-[#20263A]" />
          {unreadCount > 0 && (
            <span
              id="notifBadge"
              className="absolute -top-[4px] -right-[4px] bg-[#C4432B] text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-[3px]"
            >
              {unreadCount}
            </span>
          )}
        </button>

        {/* Rappel discret WhatsApp (CDC §1 : après 3 fermetures sans opt-in) */}
        {whatsappMuted && onOpenParametres && (
          <button
            id="whatsappReminderBtn"
            onClick={onOpenParametres}
            title="Activer les alertes WhatsApp"
            aria-label="Activer les alertes WhatsApp"
            className="relative w-[36px] h-[36px] rounded-[8px] border border-[#E5E5F0] bg-white flex items-center justify-center hover:bg-[#F6F6FB] transition-colors cursor-pointer"
          >
            <MessageCircle className="w-[17px] h-[17px] text-[#1F9254]" />
            <span className="absolute top-[7px] right-[7px] w-2 h-2 rounded-full bg-[#1F9254]" />
          </button>
        )}

        {/* Notification Dropdown Panel */}
        {notifOpen && (
          <div
            id="notifPanel"
            className="absolute top-[50px] right-0 w-[320px] bg-white border border-[#E5E5F0] rounded-[12px] shadow-xl z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <div className="p-[13px_15px] border-b border-[#E5E5F0] font-extrabold text-[13px] text-[#171A2E] flex items-center justify-between">
              <span>Veille réglementaire</span>
              <span className="text-[11px] font-semibold text-[#6B6F85]">Côte d'Ivoire</span>
            </div>
            <div className="divide-y divide-[#E5E5F0] max-h-[300px] overflow-y-auto">
              <div
                className="p-[12px_15px] hover:bg-[#F6F6FB] cursor-pointer transition-colors"
                onClick={() => {
                  setNotifOpen(false);
                  onNavigateToVeille();
                }}
              >
                <div className="font-bold text-[12.5px] text-[#171A2E]">
                  Nouveau barème CNPS AT/MP
                </div>
                <div className="text-[11.5px] text-[#6B6F85] mt-[2px]">
                  Entrée en vigueur le 01/10/2026 — vous concerne en tant qu'employeur
                </div>
              </div>
              <div
                className="p-[12px_15px] hover:bg-[#F6F6FB] cursor-pointer transition-colors"
                onClick={() => {
                  setNotifOpen(false);
                  onNavigateToVeille();
                }}
              >
                <div className="font-bold text-[12.5px] text-[#171A2E]">
                  Révision du seuil RME
                </div>
                <div className="text-[11.5px] text-[#6B6F85] mt-[2px]">
                  Publié le 28/08/2026 — impact à vérifier sur votre régime
                </div>
              </div>
              <div
                className="p-[12px_15px] hover:bg-[#F6F6FB] cursor-pointer transition-colors"
                onClick={() => {
                  setNotifOpen(false);
                  onNavigateToVeille();
                }}
              >
                <div className="font-bold text-[12.5px] text-[#171A2E]">
                  Nouvelle procédure FNE
                </div>
                <div className="text-[11.5px] text-[#6B6F85] mt-[2px]">
                  Facturation normalisée électronique — mise à jour du guide
                </div>
              </div>
            </div>
            <div className="p-[8px_15px] bg-[#F6F6FB] border-t border-[#E5E5F0] text-center">
              <button
                id="btnAllVeille"
                onClick={() => {
                  setNotifOpen(false);
                  onNavigateToVeille();
                }}
                className="text-[12px] font-bold text-[#4F46A0] hover:underline"
              >
                Consulter tous les flashs de veille →
              </button>
            </div>
          </div>
        )}

        {/* Assistant Button */}
        <button
          id="assistOpenBtn"
          onClick={onOpenAssistant}
          className="flex items-center gap-[7px] border border-[#E5E5F0] bg-white rounded-[8px] p-[8px_12px] font-bold text-[13px] text-[#20263A] hover:bg-[#F6F6FB] transition-colors"
        >
          <MessageSquare className="w-[16px] h-[16px] text-[#4F46A0]" />
          <span>LEGAL FLOW AI</span>
        </button>

        {/* Horloge unique — AMENDEMENT #2 §1 : TRÈS petit, en haut à droite, tous écrans */}
        <div className="hidden sm:flex flex-col items-end leading-none mr-0.5" title="Date de référence du logiciel (horloge unique)">
          <span id="dateReferenceBadge" className="text-[10px] font-semibold text-[#8C90A4] whitespace-nowrap">
            {formatDateReferenceShort(dateReference)}
          </span>
          {qaVisible && (
            <span className="mt-1 flex items-center gap-1">
              <input
                type="date"
                value={qaValue}
                onChange={(e) => {
                  setQaValue(e.target.value);
                  setDateReferenceOverride(e.target.value || null);
                  onQaDateChange?.();
                }}
                className="text-[10px] border border-[#E5E5F0] rounded px-1 py-0.5 text-[#20263A]"
                title="QA : forcer dateReference"
              />
              <button
                type="button"
                onClick={() => {
                  setDateReferenceOverride(null);
                  setQaValue(toIsoDate(new Date()));
                  onQaDateChange?.();
                }}
                className="text-[10px] font-bold text-[#4F46A0] hover:underline"
                title="QA : retour au système réel"
              >
                Réel
              </button>
            </span>
          )}
        </div>

        {/* Déconnexion (session réelle) */}
        {onLogout && (
          <button
            id="btnLogout"
            onClick={onLogout}
            aria-label="Déconnexion"
            title="Déconnexion"
            className="w-[36px] h-[36px] rounded-[8px] border border-[#E5E5F0] bg-white flex items-center justify-center hover:bg-[#F6F6FB] transition-colors cursor-pointer"
          >
            <LogOut className="w-[17px] h-[17px] text-[#20263A]" />
          </button>
        )}

        {/* User avatar */}
        <div className="w-[30px] h-[30px] rounded-full bg-[#D9DAF0] flex items-center justify-center font-bold text-[12px] text-[#3D3680]">
          AK
        </div>
      </div>
    </div>
  );
};
