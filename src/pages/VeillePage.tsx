import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Building2,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  CheckSquare,
} from 'lucide-react';
import { PageId, FlashVeille } from '../types';
import { initialFlashs } from '../data/mockData';

interface VeillePageProps {
  onNavigate?: (page: PageId) => void;
  flashs?: FlashVeille[];
}

export const VeillePage: React.FC<VeillePageProps> = ({
  onNavigate,
  flashs = initialFlashs,
}) => {
  const [scopeFilter, setScopeFilter] = useState<'dossier' | 'all'>('dossier');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const filterTabs = [
    { id: 'all', label: 'Toutes les sources' },
    { id: 'Annexe Fiscale 2026', label: 'Annexe Fiscale 2026' },
    { id: 'DGI & Fiscalité', label: 'DGI & Fiscalité' },
    { id: 'CNPS & Social', label: 'CNPS & Social' },
    { id: 'Commerce & Prix', label: 'Commerce & Prix' },
    { id: 'Douanes & Import', label: 'Douanes & Import' },
  ];

  // Filter flashs
  const filteredFlashs = useMemo(() => {
    return flashs.filter((item) => {
      // Scope filter: if 'dossier', only items applicable to dossier
      if (scopeFilter === 'dossier' && !item.isApplicableDossier) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all') {
        const matchCat =
          item.category === selectedCategory ||
          item.badgeNeutral === selectedCategory ||
          item.eyebrow.toLowerCase().includes(selectedCategory.toLowerCase());
        if (!matchCat) return false;
      }
      return true;
    });
  }, [flashs, scopeFilter, selectedCategory]);

  const toggleExpand = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  return (
    <div id="pageVeille" className="space-y-6">
      {/* 1. Header with Scope Toggle (Ciblage Dossier vs Tout le recueil) */}
      <div className="bg-white border border-[#E5E5F0] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#4F46A0]" />
            <h2 className="text-base font-black text-[#171A2E] m-0">
              Veille Réglementaire &amp; Textes Officiels
            </h2>
          </div>
          <p className="text-xs text-[#6B6F85] m-0">
            Journal Officiel, Annexe Fiscale 2026, décrets d'application et circulaires DGI / CNPS analysés.
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="bg-[#F0F0F5] p-1 rounded-xl flex items-center shrink-0 self-start md:self-center">
          <button
            onClick={() => setScopeFilter('dossier')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              scopeFilter === 'dossier'
                ? 'bg-white text-[#3D3680] shadow-xs'
                : 'text-[#6B6F85] hover:text-[#171A2E]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#4F46A0]" />
            <span>Ciblé sur mon dossier (BTP / RSI)</span>
          </button>
          <button
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              scopeFilter === 'all'
                ? 'bg-white text-[#3D3680] shadow-xs'
                : 'text-[#6B6F85] hover:text-[#171A2E]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#4F46A0]" />
            <span>Tout le recueil ({flashs.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[#E5E5F0]">
        {filterTabs.map((tab) => {
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#3D3680] text-white shadow-xs'
                  : 'bg-white text-[#555870] hover:text-[#171A2E] hover:bg-[#F6F6FB] border border-[#E5E5F0]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredFlashs.map((flash) => {
          const isExpanded = expandedCardId === flash.id;
          return (
            <div
              key={flash.id}
              id={`cardFlash-${flash.id}`}
              className="bg-white border border-[#E5E5F0] rounded-2xl p-5 flex flex-col justify-between hover:border-[#C7C4E8] transition-all shadow-xs"
            >
              <div className="space-y-3">
                {/* Header with Source and Status Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold tracking-wider text-[#6B6F85] uppercase">
                    {flash.eyebrow}
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {flash.badgeNeutral && (
                      <span className="bg-[#F0F0F5] text-[#555870] text-[11px] font-bold px-2 py-0.5 rounded-md">
                        {flash.badgeNeutral}
                      </span>
                    )}
                    {flash.dateEffet && (
                      <span className="bg-[#EDEBF9] text-[#4F46A0] text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {flash.dateEffet}
                      </span>
                    )}
                    {flash.badges?.map((b, idx) => (
                      <span
                        key={idx}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          b.type === 'fait'
                            ? 'bg-[#E7F6EE] text-[#1F9254]'
                            : b.type === 'imminent'
                            ? 'bg-[#FEF3D6] text-[#B06000]'
                            : 'bg-[#FBEAE5] text-[#C4432B]'
                        }`}
                      >
                        {b.type === 'fait' && <CheckCircle2 className="w-3 h-3" />}
                        {b.type === 'imminent' && <AlertTriangle className="w-3 h-3" />}
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-[#171A2E] leading-snug m-0">
                  {flash.title}
                </h3>

                {/* Main Abstract */}
                <p className="text-xs text-[#555870] leading-relaxed m-0">
                  {flash.desc}
                </p>

                {/* Collapsible Accordion "Détail & Impact" */}
                <div className="border-t border-[#F0F0F5] pt-2.5">
                  <button
                    onClick={() => toggleExpand(flash.id)}
                    className="flex items-center justify-between w-full text-xs font-bold text-[#4F46A0] hover:text-[#3D3680] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Analyse d'impact détaillée pour votre dossier</span>
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-3.5 bg-[#F9F9FD] rounded-xl text-xs border border-[#E5E5F0] space-y-3 animate-fadeIn">
                      <div className="space-y-1">
                        <div className="font-bold text-[#171A2E]">
                          Impact direct sur votre activité :
                        </div>
                        <p className="text-[#555870] m-0 leading-relaxed">
                          {flash.impactConcret ||
                            "Cette disposition s'applique immédiatement à vos déclarations en Côte d'Ivoire. Le défaut d'alignement peut entraîner le rejet de quittance ou l'application de pénalités d'assiette."}
                        </p>
                      </div>

                      {flash.checklistItems && flash.checklistItems.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-[#E5E5F0]">
                          <div className="font-bold text-[#171A2E] flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5 text-[#4F46A0]" />
                            <span>Checklist de mise en conformité :</span>
                          </div>
                          <ul className="space-y-1 pl-1 m-0 list-none">
                            {flash.checklistItems.map((item, i) => (
                              <li key={i} className="flex items-center gap-2 text-[#555870]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4F46A0]" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#E5E5F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6B6F85]">
                        <span>Texte de référence : <strong>{flash.texteRef || flash.eyebrow}</strong></span>
                        <span className="text-[#1F9254] font-semibold">Validé conformité UEMOA</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Link / Button if present */}
              {flash.actionText && (
                <div className="pt-3 mt-3 border-t border-[#F0F0F5]">
                  <button
                    onClick={() => {
                      if (flash.actionPage && onNavigate) {
                        onNavigate(flash.actionPage);
                      }
                    }}
                    className="w-full bg-[#F6F6FB] hover:bg-[#EDEBF9] text-[#3D3680] text-xs font-bold py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{flash.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
