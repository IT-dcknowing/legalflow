import React, { useState } from 'react';
import { Bell, MessageCircle, Lock, CheckCircle2 } from 'lucide-react';
import type { NotificationPreferences } from '../types';
import { formatIvorianPhone } from '../services/notifications';

// Paramètres : WhatsApp + préférences de notifications (CDC §1, §2.3).
interface ParametresPageProps {
  whatsappNumber: string | null;
  whatsappOptinAt: string | null;
  whatsappMuted: boolean;
  onOpenWhatsappOptin: () => void;
  onWhatsappOptout: () => void;
  prefs: NotificationPreferences;
  onSavePrefs: (p: NotificationPreferences) => void;
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  locked,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  label: string;
  hint: string;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-[#F0F0F5] last:border-0">
      <div>
        <div className="text-xs font-bold text-[#171A2E] flex items-center gap-1.5">
          {label}
          {locked && <Lock className="w-3 h-3 text-[#8C90A4]" />}
        </div>
        <div className="text-[11px] text-[#6B6F85] mt-0.5">{hint}</div>
      </div>
      <button
        role="switch"
        aria-checked={locked ? true : checked}
        aria-label={label}
        disabled={locked}
        onClick={() => onChange && onChange(!checked)}
        className={`w-10 h-[22px] rounded-full p-[3px] transition-colors shrink-0 ${
          locked || checked ? 'bg-[#4F46A0]' : 'bg-[#E5E5F0]'
        } ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
            locked || checked ? 'translate-x-[18px]' : ''
          }`}
        />
      </button>
    </div>
  );
}

export const ParametresPage: React.FC<ParametresPageProps> = ({
  whatsappNumber,
  whatsappOptinAt,
  whatsappMuted,
  onOpenWhatsappOptin,
  onWhatsappOptout,
  prefs,
  onSavePrefs,
}) => {
  const [draft, setDraft] = useState<NotificationPreferences>(prefs);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => setDraft(prefs), [prefs]);

  const save = () => {
    onSavePrefs(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div id="pageParametres" className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-base sm:text-lg font-black text-[#171A2E] m-0">Paramètres</h2>
        <p className="text-xs text-[#6B6F85] mt-0.5 m-0">
          Alertes WhatsApp et préférences de notifications.
        </p>
      </div>

      {/* WhatsApp */}
      <section className="bg-white border border-[#E5E5F0] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E7F6EE] flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4 text-[#1F9254]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#171A2E] m-0">Alertes WhatsApp</h3>
            <p className="text-[11px] text-[#6B6F85] m-0">J-1, retards et urgences (8h – 18h GMT)</p>
          </div>
        </div>

        {whatsappNumber ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F9F9FD] border border-[#E5E5F0] rounded-xl px-4 py-3">
            <div>
              <div className="text-sm font-black text-[#171A2E]">{formatIvorianPhone(whatsappNumber)}</div>
              {whatsappOptinAt && (
                <div className="text-[11px] text-[#6B6F85]">
                  Activé le {new Date(whatsappOptinAt).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenWhatsappOptin}
                className="text-xs font-bold text-[#4F46A0] hover:underline cursor-pointer"
              >
                Modifier
              </button>
              <button
                onClick={onWhatsappOptout}
                className="text-xs font-bold text-[#C4432B] hover:underline cursor-pointer"
              >
                Désactiver
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-[#555870] m-0">
              {whatsappMuted
                ? 'Vous avez fermé le rappel à plusieurs reprises. Réactivez les alertes quand vous voulez :'
                : 'Activez les rappels pour ne jamais rater une échéance :'}
            </p>
            <button
              onClick={onOpenWhatsappOptin}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-[#1F9254] hover:bg-[#187A45] text-white transition-colors cursor-pointer"
            >
              Activer les alertes WhatsApp
            </button>
          </div>
        )}
      </section>

      {/* Préférences */}
      <section className="bg-white border border-[#E5E5F0] rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#EDEBF9] flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-[#4F46A0]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#171A2E] m-0">Notifications</h3>
            <p className="text-[11px] text-[#6B6F85] m-0">Alertes critiques toujours actives</p>
          </div>
        </div>

        <Toggle
          checked
          locked
          label="Échéances, retards et alertes de contrôle"
          hint="Critiques — non désactivables, toujours affichées dans l'app."
        />
        <Toggle
          checked={draft.veille}
          onChange={(v) => setDraft({ ...draft, veille: v })}
          label="Notes de veille"
          hint="Résumés quotidiens des nouveautés réglementaires."
        />
        <Toggle
          checked={draft.opportunites}
          onChange={(v) => setDraft({ ...draft, opportunites: v })}
          label="Opportunités (CGA, FDFP)"
          hint="Gains et optimisations détectés sur votre dossier."
        />
        <Toggle
          checked={draft.maj_app}
          onChange={(v) => setDraft({ ...draft, maj_app: v })}
          label="Mises à jour de l'application"
          hint="Nouvelles fonctionnalités Legal Flow."
        />

        <div className="pt-3 flex items-center gap-2">
          <button
            onClick={save}
            className="px-4 py-2.5 rounded-xl text-xs font-black bg-[#4F46A0] hover:bg-[#3D3680] text-white transition-colors cursor-pointer"
          >
            Enregistrer
          </button>
          {saved && (
            <span className="text-xs font-bold text-[#1F9254] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Préférences enregistrées
            </span>
          )}
        </div>
      </section>
    </div>
  );
};
