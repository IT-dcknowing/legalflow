import React from 'react';
import { Megaphone, X } from 'lucide-react';
import type { MaintenanceBannerState } from '../types';
import { dismissBanner, isBannerDismissed } from '../services/notifications';

// Bandeau fin dismissable piloté par le super admin (CDC §6.4).
export const MaintenanceBanner: React.FC<{ banner: MaintenanceBannerState }> = ({ banner }) => {
  const [hidden, setHidden] = React.useState(() => isBannerDismissed(banner.message));

  if (!banner.active || !banner.message || hidden) return null;

  return (
    <div
      id="maintenanceBanner"
      className="bg-[#3D3680] text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2"
    >
      <Megaphone className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{banner.message}</span>
      <button
        onClick={() => {
          dismissBanner(banner.message);
          setHidden(true);
        }}
        aria-label="Masquer le bandeau"
        className="ml-2 p-1 rounded-md hover:bg-white/15 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
