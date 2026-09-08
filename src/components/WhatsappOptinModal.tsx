import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { isValidIvorianPhone, normalizeIvorianPhone, formatIvorianPhone } from '../services/notifications';

// Pop-up opt-in WhatsApp (CDC §1) — jamais affiché en pleine action,
// uniquement monté par App sur les pages de consultation après 30 s.
interface WhatsappOptinModalProps {
  onOptin: (phone: string) => void;
  onDismiss: () => void;
}

export const WhatsappOptinModal: React.FC<WhatsappOptinModalProps> = ({ onOptin, onDismiss }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = () => {
    const normalized = normalizeIvorianPhone(phone);
    if (!isValidIvorianPhone(normalized)) {
      setError('Numéro invalide. Format attendu : +225 07 00 00 00 00.');
      return;
    }
    setError(null);
    setSending(true);
    onOptin(normalized);
  };

  return (
    <div
      id="whatsappOptinOverlay"
      className="fixed inset-0 bg-[#141423]/50 flex items-center justify-center z-[90] p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-2xl space-y-4 relative">
        <button
          onClick={onDismiss}
          aria-label="Fermer"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-[#6B6F85] hover:bg-[#F6F6FB] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#E7F6EE] flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-[#1F9254]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#171A2E] m-0">Alertes WhatsApp</h3>
            <p className="text-[11px] text-[#6B6F85] m-0">Échéances J-1, retards et urgences</p>
          </div>
        </div>

        <p className="text-xs text-[#555870] leading-relaxed m-0">
          Recevez vos rappels d&apos;échéances et alertes urgentes directement sur WhatsApp
          (8h – 18h GMT). Votre numéro reste privé et modifiable à tout moment dans Paramètres.
        </p>

        <div className="space-y-1.5">
          <label htmlFor="whatsappPhoneInput" className="text-[11px] font-bold text-[#555870] uppercase tracking-wider">
            Numéro WhatsApp (Côte d&apos;Ivoire)
          </label>
          <input
            id="whatsappPhoneInput"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+225 07 00 00 00 00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => phone && setPhone(formatIvorianPhone(phone))}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="w-full px-3.5 py-2.5 bg-[#F9F9FD] border border-[#E5E5F0] rounded-xl text-sm text-[#171A2E] placeholder-[#8C90A4] focus:outline-none focus:border-[#1F9254] transition-colors"
          />
          {error && <p className="text-[11px] font-bold text-[#C4432B] m-0">{error}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-[#6B6F85] hover:bg-[#F6F6FB] transition-colors cursor-pointer"
          >
            Plus tard
          </button>
          <button
            onClick={submit}
            disabled={sending}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-black bg-[#1F9254] hover:bg-[#187A45] disabled:opacity-60 text-white transition-colors cursor-pointer"
          >
            {sending ? 'Activation…' : 'Activer les alertes'}
          </button>
        </div>
      </div>
    </div>
  );
};
