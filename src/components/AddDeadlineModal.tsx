import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AddDeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (deadline: {
    titre: string;
    domaine: 'fiscal' | 'social' | 'douanes' | 'commerce' | 'administratif';
    dateIso: string;
    montant: string;
    moisGroupe: string;
  }) => void;
}

export const AddDeadlineModal: React.FC<AddDeadlineModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [titre, setTitre] = useState('');
  const [domaine, setDomaine] = useState<'fiscal' | 'social' | 'douanes' | 'commerce' | 'administratif'>('fiscal');
  const [dateIso, setDateIso] = useState('');
  const [montant, setMontant] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim() || !dateIso) return;

    const d = new Date(dateIso);
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const moisGroupe = `${months[d.getMonth()]} ${d.getFullYear()}`;

    onAdd({
      titre: titre.trim(),
      domaine,
      dateIso,
      montant: montant.trim() ? `${montant} FCFA` : 'Non renseigné',
      moisGroupe,
    });

    setTitre('');
    setDateIso('');
    setMontant('');
    onClose();
  };

  return (
    <div
      id="addDeadlineOverlay"
      className="fixed inset-0 bg-[#141423]/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[14px] p-[24px] w-full max-w-[420px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="m-0 text-[16px] font-extrabold text-[#171A2E]">
            Ajouter une échéance personnalisée
          </h4>
          <button onClick={onClose} className="text-[#6B6F85] hover:text-[#171A2E]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-[12px] font-bold text-[#20263A] mb-1 block">
              Intitulé de l'obligation / taxe
            </label>
            <input
              id="newObligTitle"
              type="text"
              required
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Taxe d'apprentissage, Dépôt d'agrément..."
              className="w-full border border-[#E5E5F0] rounded-[8px] p-[9px_10px] text-[13px] outline-none focus:border-[#4F46A0]"
            />
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#20263A] mb-1 block">
              Domaine de conformité
            </label>
            <select
              id="newObligDomaine"
              value={domaine}
              onChange={(e) => setDomaine(e.target.value as any)}
              className="w-full border border-[#E5E5F0] rounded-[8px] p-[9px_10px] text-[13px] outline-none focus:border-[#4F46A0] bg-white"
            >
              <option value="fiscal">Fiscalité (DGI)</option>
              <option value="social">Social (CNPS / CMU)</option>
              <option value="douanes">Douanes</option>
              <option value="commerce">Commerce / Métrologie</option>
              <option value="administratif">Administratif / Greffe</option>
            </select>
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#20263A] mb-1 block">
              Date d'échéance légale
            </label>
            <input
              id="newObligDate"
              type="date"
              required
              value={dateIso}
              onChange={(e) => setDateIso(e.target.value)}
              className="w-full border border-[#E5E5F0] rounded-[8px] p-[9px_10px] text-[13px] outline-none focus:border-[#4F46A0]"
            />
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#20263A] mb-1 block">
              Montant estimé (FCFA, facultatif)
            </label>
            <input
              id="newObligAmount"
              type="text"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="Ex : 150 000"
              className="w-full border border-[#E5E5F0] rounded-[8px] p-[9px_10px] text-[13px] outline-none focus:border-[#4F46A0]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              id="btnSaveNewDeadline"
              className="flex-1 bg-[#4F46A0] hover:bg-[#3D3680] text-white border-none rounded-[8px] p-[10px_16px] font-bold text-[13px] transition-colors"
            >
              Ajouter à l'échéancier
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-[#E5E5F0] hover:bg-[#F6F6FB] rounded-[8px] p-[10px_16px] font-bold text-[13px] text-[#20263A]"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
