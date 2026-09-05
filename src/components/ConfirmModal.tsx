import React, { useState } from 'react';
import { Obligation } from '../types';

interface ConfirmModalProps {
  isOpen: boolean;
  obligation: Obligation | null;
  onClose: () => void;
  onConfirm: (obligationId: string, quittanceRef: string, date: string, fileName?: string, file?: File | null) => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  obligation,
  onClose,
  onConfirm,
}) => {
  const [quittanceRef, setQuittanceRef] = useState('');
  const [declarationDate, setDeclarationDate] = useState(new Date().toISOString().split('T')[0]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);

  if (!isOpen || !obligation) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
      setFileObj(e.target.files[0]);
    }
  };

  const handleSubmit = (withRef = true) => {
    onConfirm(
      obligation.id,
      withRef && quittanceRef ? quittanceRef : `QUITTANCE-${Date.now().toString().slice(-6)}`,
      declarationDate,
      fileName || undefined,
      fileObj
    );
    setQuittanceRef('');
    setFileName(null);
    setFileObj(null);
    onClose();
  };

  return (
    <div
      id="modalOverlay"
      className="fixed inset-0 bg-[#141423]/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[14px] p-[24px] w-full max-w-[400px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="m-0 mb-[4px] text-[16px] font-extrabold text-[#171A2E]">
          Confirmer la déclaration
        </h4>
        <div className="text-[12.5px] text-[#6B6F85] mb-[16px]">
          {obligation.titre} — Ces informations sont facultatives.
        </div>

        <div className="mb-[12px]">
          <label className="text-[12px] font-bold text-[#20263A] mb-[5px] block">
            Référence / numéro de quittance
          </label>
          <input
            id="modalQuittanceInput"
            type="text"
            value={quittanceRef}
            onChange={(e) => setQuittanceRef(e.target.value)}
            placeholder="Ex : 20260912-DGI-004521"
            className="w-full border border-[#E5E5F0] rounded-[8px] p-[9px_10px] text-[13px] outline-none focus:border-[#4F46A0] transition-colors"
          />
        </div>

        <div className="mb-[14px]">
          <label className="text-[12px] font-bold text-[#20263A] mb-[5px] block">
            Date de la déclaration
          </label>
          <input
            id="modalDateInput"
            type="date"
            value={declarationDate}
            onChange={(e) => setDeclarationDate(e.target.value)}
            className="w-full border border-[#E5E5F0] rounded-[8px] p-[9px_10px] text-[13px] outline-none focus:border-[#4F46A0] transition-colors"
          />
        </div>

        <label className="cursor-pointer block mb-[16px]">
          <div className="w-full border-[1.5px] border-dashed border-[#E5E5F0] hover:border-[#4F46A0] rounded-[8px] p-[11px] text-[12.5px] font-bold text-[#6B6F85] text-center bg-transparent transition-colors">
            {fileName ? `✓ ${fileName}` : '+ Joindre un justificatif (PDF, photo)'}
          </div>
          <input type="file" onChange={handleFileChange} className="hidden" />
        </label>

        <div className="flex flex-col gap-[8px]">
          <button
            id="modalConfirmBtn"
            onClick={() => handleSubmit(true)}
            className="w-full bg-[#4F46A0] hover:bg-[#3D3680] text-white border-none rounded-[8px] p-[10px_16px] font-bold text-[13px] transition-colors"
          >
            Confirmer
          </button>
          <button
            id="modalConfirmQuickBtn"
            onClick={() => handleSubmit(false)}
            className="w-full bg-transparent border border-[#E5E5F0] hover:bg-[#F6F6FB] rounded-[8px] p-[9px_16px] font-bold text-[13px] text-[#20263A] transition-colors"
          >
            Confirmer sans justificatif
          </button>
          <button
            id="modalCancelBtn"
            onClick={onClose}
            className="bg-transparent border-none text-[#3D3680] font-bold text-[12.5px] p-2 hover:underline text-center"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};
