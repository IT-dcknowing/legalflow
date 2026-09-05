import React from 'react';
import { ShieldOff, LogOut } from 'lucide-react';
import { LegalFlowLogo } from '../components/LegalFlowLogo';

interface BlockerPageProps {
  onLogout: () => void;
}

/** Compte suspendu : aucune nav, seul Déconnexion. */
export const SuspenduPage: React.FC<BlockerPageProps> = ({ onLogout }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F6FB] p-4">
      <div className="bg-white border border-[#E5E5F0] rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
        <div className="flex justify-center mb-4">
          <LegalFlowLogo size="md" showSubtitle={false} />
        </div>
        <div className="w-12 h-12 rounded-full bg-[#FBEAE5] text-[#C4432B] flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-black text-[#171A2E] m-0">Votre compte a été suspendu</h1>
        <p className="text-sm text-[#555870] mt-3 mb-6">
          Pour comprendre les raisons de cette suspension ou faire une demande de
          réactivation, contactez notre équipe support à support@legalflow.ci.
        </p>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 bg-[#F6F6FB] hover:bg-[#EDEBF9] text-[#20263A] border border-[#E5E5F0] font-bold text-sm px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};
