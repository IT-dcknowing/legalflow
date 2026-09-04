import React from 'react';
import { FileText, Calendar, Radio, ChevronRight, Star, AlertCircle, ArrowUpRight } from 'lucide-react';
import { PageId } from '../types';

interface AccueilPageProps {
  onNavigate: (page: PageId) => void;
}

export const AccueilPage: React.FC<AccueilPageProps> = ({ onNavigate }) => {
  return (
    <div id="pageAccueil" className="space-y-6 md:space-y-8">
      {/* Hero Portal with responsive padding & clear, visible title */}
      <div className="relative rounded-2xl p-6 sm:p-8 md:p-10 text-white overflow-hidden shadow-lg bg-[radial-gradient(120%_180%_at_15%_-20%,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0)_45%),linear-gradient(135deg,#332C6B_0%,#4F46A0_50%,#7C72BA_100%)]">
        {/* Decorative background geometry */}
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-25 hidden sm:block" aria-hidden="true">
          <span className="absolute w-72 h-72 -left-36 -top-36 border border-white rounded-full" />
          <span className="absolute w-48 h-48 -left-24 -top-24 border border-white rounded-full" />
          <span className="absolute w-28 h-28 -left-14 -top-14 bg-white/20 border border-white rounded-full" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3">
            <span>Portail Entreprise</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Côte d'Ivoire (DGI / CNPS / CMU)</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white m-0 mb-2 leading-tight tracking-tight">
            Bienvenue sur Legal Flow
          </h2>

          <p className="text-sm sm:text-base text-white/90 m-0 leading-relaxed font-normal">
            Centralisez vos impôts et taxes, anticipez vos échéances avec précision et sécurisez votre entreprise face aux contrôles.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              id="btnHeroOpenDashboard"
              onClick={() => onNavigate('dashboard')}
              className="bg-white text-[#3D3680] hover:bg-white/95 border-none rounded-xl px-5 py-2.5 font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
            >
              <span>Ouvrir mon tableau de bord</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              id="btnHeroTour"
              onClick={() => onNavigate('echeancier')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-xl px-5 py-2.5 font-bold text-sm transition-all cursor-pointer"
            >
              Consulter l’échéancier fiscal
            </button>
          </div>
        </div>
      </div>

      {/* Section : Vos outils */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold pl-3 border-l-4 border-[#4F46A0] text-[#171A2E] m-0">
            Vos outils
          </h3>
          <button
            onClick={() => onNavigate('dashboard')}
            className="bg-transparent border-none text-[#3D3680] font-bold text-xs sm:text-sm flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Voir tout</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Dashboard de conformité */}
          <div className="bg-white border border-[#E5E5F0] rounded-xl p-5 flex flex-col justify-between hover:border-[#4F46A0]/40 transition-all hover:shadow-xs group">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <Star className="w-4 h-4 text-[#C9CADA]" />
              </div>
              <div className="font-extrabold text-sm sm:text-base text-[#171A2E] mb-1.5">
                Tableau de bord
              </div>
              <p className="text-xs sm:text-sm text-[#6B6F85] mb-4 min-h-[36px] leading-relaxed">
                Suivez votre indice global de conformité, vos sous-scores sectoriels et vos plans d'action.
              </p>
            </div>
            <button
              id="toolOpenDashboard"
              onClick={() => onNavigate('dashboard')}
              className="w-full bg-[#F6F6FB] hover:bg-[#EDEBF9] hover:text-[#4F46A0] border border-[#E5E5F0] rounded-lg py-2 font-bold text-xs sm:text-sm text-[#20263A] transition-colors cursor-pointer"
            >
              Ouvrir
            </button>
          </div>

          {/* Card 2: Échéancier */}
          <div className="bg-white border border-[#E5E5F0] rounded-xl p-5 flex flex-col justify-between hover:border-[#4F46A0]/40 transition-all hover:shadow-xs group">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <Star className="w-4 h-4 text-[#C9CADA]" />
              </div>
              <div className="font-extrabold text-sm sm:text-base text-[#171A2E] mb-1.5 flex items-center gap-2">
                <span>Échéancier</span>
                <span className="bg-[#C4432B]/10 text-[#C4432B] text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  Retards
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#6B6F85] mb-4 min-h-[36px] leading-relaxed">
                Vos prochaines échéances fiscales et sociales, avec alertes majorations et pénalités.
              </p>
            </div>
            <button
              id="toolOpenEcheancier"
              onClick={() => onNavigate('echeancier')}
              className="w-full bg-[#F6F6FB] hover:bg-[#EDEBF9] hover:text-[#4F46A0] border border-[#E5E5F0] rounded-lg py-2 font-bold text-xs sm:text-sm text-[#20263A] transition-colors cursor-pointer"
            >
              Ouvrir
            </button>
          </div>

          {/* Card 3: Veille & Flashs */}
          <div className="bg-white border border-[#E5E5F0] rounded-xl p-5 flex flex-col justify-between hover:border-[#4F46A0]/40 transition-all hover:shadow-xs group">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Radio className="w-5 h-5" />
                </div>
                <Star className="w-4 h-4 text-[#C9CADA]" />
              </div>
              <div className="font-extrabold text-sm sm:text-base text-[#171A2E] mb-1.5 flex items-center gap-2">
                <span>Veille &amp; Flashs</span>
                <span className="bg-[#EDEBF9] text-[#4F46A0] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  6 nouveautés
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#6B6F85] mb-4 min-h-[36px] leading-relaxed">
                Facture normalisée FNE, barème AIR, réaménagement de seuils et circulaires douanes.
              </p>
            </div>
            <button
              id="toolOpenVeille"
              onClick={() => onNavigate('veille')}
              className="w-full bg-[#F6F6FB] hover:bg-[#EDEBF9] hover:text-[#4F46A0] border border-[#E5E5F0] rounded-lg py-2 font-bold text-xs sm:text-sm text-[#20263A] transition-colors cursor-pointer"
            >
              Ouvrir
            </button>
          </div>
        </div>
      </div>

      {/* Two-column section: Documents récents & Échéances à venir */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents récents */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-extrabold pl-3 border-l-4 border-[#4F46A0] text-[#171A2E] m-0">
              Documents récents
            </h3>
            <button
              onClick={() => onNavigate('documents')}
              className="bg-transparent border-none text-[#3D3680] font-bold text-xs sm:text-sm flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Voir tout</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white border border-[#E5E5F0] rounded-xl px-4 py-2 divide-y divide-[#E5E5F0] shadow-xs">
            <div className="flex items-center gap-3 py-3.5 hover:bg-[#FDFDFF] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-[#171A2E] truncate">
                  Déclaration TVA — Août 2026.pdf
                </div>
                <div className="text-xs text-[#6B6F85] mt-0.5">
                  Modifié il y a 2 jours · 640 Ko
                </div>
              </div>
              <button
                onClick={() => onNavigate('documents')}
                className="text-xs font-bold text-[#4F46A0] hover:underline shrink-0"
              >
                Ouvrir
              </button>
            </div>

            <div className="flex items-center gap-3 py-3.5 hover:bg-[#FDFDFF] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-[#171A2E] truncate">
                  Registre fiscal — BTP Koffi.xlsx
                </div>
                <div className="text-xs text-[#6B6F85] mt-0.5">
                  Modifié il y a 5 jours · 210 Ko
                </div>
              </div>
              <button
                onClick={() => onNavigate('documents')}
                className="text-xs font-bold text-[#4F46A0] hover:underline shrink-0"
              >
                Ouvrir
              </button>
            </div>

            <div className="flex items-center gap-3 py-3.5 hover:bg-[#FDFDFF] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-[#171A2E] truncate">
                  Attestation de régularité fiscale.pdf
                </div>
                <div className="text-xs text-[#6B6F85] mt-0.5">
                  Modifié il y a 1 semaine · 180 Ko
                </div>
              </div>
              <button
                onClick={() => onNavigate('documents')}
                className="text-xs font-bold text-[#4F46A0] hover:underline shrink-0"
              >
                Ouvrir
              </button>
            </div>
          </div>
        </div>

        {/* Échéances à venir */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-extrabold pl-3 border-l-4 border-[#4F46A0] text-[#171A2E] m-0">
              Échéances à venir
            </h3>
            <button
              onClick={() => onNavigate('echeancier')}
              className="bg-transparent border-none text-[#3D3680] font-bold text-xs sm:text-sm flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Voir tout</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white border border-[#E5E5F0] rounded-xl px-4 py-2 divide-y divide-[#E5E5F0] shadow-xs">
            {/* Row 1 */}
            <div className="flex items-center gap-3 py-3.5 hover:bg-[#FDFDFF] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#FBEAE5] text-[#C4432B] flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-[#171A2E] truncate">
                  IRVM sur dividendes
                </div>
                <div className="text-xs text-[#C4432B] font-bold mt-0.5">
                  En retard · 90 000 FCFA
                </div>
              </div>
              <div className="text-center shrink-0 bg-[#F6F6FB] px-2.5 py-1 rounded-lg border border-[#E5E5F0]">
                <span className="block text-sm font-black leading-none text-[#171A2E]">31</span>
                <span className="block text-[9px] text-[#6B6F85] font-bold tracking-wider mt-0.5">AOÛT</span>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex items-center gap-3 py-3.5 hover:bg-[#FDFDFF] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-[#171A2E] truncate">
                  TVA (Déclaration mensuelle)
                </div>
                <div className="text-xs text-[#6B6F85] mt-0.5">
                  Estimation : 480 000 FCFA
                </div>
              </div>
              <div className="text-center shrink-0 bg-[#F6F6FB] px-2.5 py-1 rounded-lg border border-[#E5E5F0]">
                <span className="block text-sm font-black leading-none text-[#171A2E]">15</span>
                <span className="block text-[9px] text-[#6B6F85] font-bold tracking-wider mt-0.5">SEPT</span>
              </div>
            </div>

            {/* Row 3 */}
            <div className="flex items-center gap-3 py-3.5 hover:bg-[#FDFDFF] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-[#171A2E] truncate">
                  Cotisation CNPS & CMU
                </div>
                <div className="text-xs text-[#6B6F85] mt-0.5">
                  Estimation : 275 000 FCFA
                </div>
              </div>
              <div className="text-center shrink-0 bg-[#F6F6FB] px-2.5 py-1 rounded-lg border border-[#E5E5F0]">
                <span className="block text-sm font-black leading-none text-[#171A2E]">20</span>
                <span className="block text-[9px] text-[#6B6F85] font-bold tracking-wider mt-0.5">SEPT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
