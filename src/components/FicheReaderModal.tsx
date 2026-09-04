import React from 'react';
import { X, BookOpen, Clock, ShieldCheck } from 'lucide-react';
import { FicheGuide } from '../types';

interface FicheReaderModalProps {
  fiche: FicheGuide | null;
  onClose: () => void;
}

export const FicheReaderModal: React.FC<FicheReaderModalProps> = ({ fiche, onClose }) => {
  if (!fiche) return null;

  return (
    <div
      id="ficheReaderOverlay"
      className="fixed inset-0 bg-[#141423]/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] max-w-[620px] w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-[20px_24px] border-b border-[#E5E5F0] bg-[#FAF9FD] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11.5px] font-bold text-[#4F46A0] bg-[#EDEBF9] px-2.5 py-0.5 rounded-full">
                {fiche.badge}
              </span>
              <span className="flex items-center gap-1 text-[11.5px] font-semibold text-[#6B6F85]">
                <Clock className="w-3.5 h-3.5" />
                {fiche.duree}
              </span>
            </div>
            <h3 className="m-0 text-[18px] font-extrabold text-[#171A2E] leading-snug">
              {fiche.titre}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#E5E5F0] flex items-center justify-center hover:bg-white text-[#6B6F85]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-[24px] overflow-y-auto space-y-5 text-[13.5px] text-[#20263A] leading-relaxed">
          <div className="bg-[#F6F6FB] p-3.5 rounded-[10px] border border-[#E5E5F0] font-medium text-[#171A2E]">
            {fiche.resume}
          </div>

          {fiche.sections.map((sec, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="m-0 text-[14px] font-extrabold text-[#171A2E] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#4F46A0]" />
                {sec.titre}
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-[#6B6F85]">
                {sec.contenu.map((item, cIdx) => (
                  <li key={cIdx} className="text-[#20263A]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="pt-3 border-t border-[#E5E5F0] flex items-center gap-2 text-[12px] text-[#6B6F85]">
            <ShieldCheck className="w-4 h-4 text-[#1F9254]" />
            <span>Base légale : {fiche.baseLegale}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-[14px_24px] border-t border-[#E5E5F0] bg-white flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#4F46A0] hover:bg-[#3D3680] text-white border-none rounded-[8px] px-5 py-2 font-bold text-[13px] transition-colors"
          >
            Fermer la fiche
          </button>
        </div>
      </div>
    </div>
  );
};
