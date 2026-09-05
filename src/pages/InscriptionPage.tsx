import React, { useState } from 'react';
import { Building2, Briefcase, ArrowLeft } from 'lucide-react';
import type { PageId } from '../types';
import { LegalFlowLogo } from '../components/LegalFlowLogo';
import {
  signupAccount,
  createEntrepriseProfile,
  createCabinetProfile,
  savePendingInscription,
} from '../services/inscriptionService';

interface InscriptionPageProps {
  onNavigate: (page: PageId) => void;
  onComplete: () => void;
}

type SignupType = 'entreprise' | 'cabinet';

const inputCls =
  'w-full border border-[#E5E5F0] rounded-xl px-3.5 py-2.5 text-sm text-[#171A2E] placeholder-[#8C90A4] focus:outline-none focus:border-[#4F46A0] transition-colors';
const labelCls = 'text-xs font-bold text-[#20263A] mb-1.5 block';

function validEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

export const InscriptionPage: React.FC<InscriptionPageProps> = ({ onNavigate, onComplete }) => {
  const [kind, setKind] = useState<SignupType>('entreprise');
  const [raisonSociale, setRaisonSociale] = useState('');
  const [nomGestionnaire, setNomGestionnaire] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ville, setVille] = useState('');
  const [numAgrement, setNumAgrement] = useState('');
  const [typeCabinet, setTypeCabinet] = useState('Comptable');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!raisonSociale.trim()) {
      setError(kind === 'entreprise' ? 'Indiquez la raison sociale.' : 'Indiquez la raison sociale du cabinet.');
      return;
    }
    if (kind === 'cabinet' && !nomGestionnaire.trim()) {
      setError('Indiquez le nom du gestionnaire.');
      return;
    }
    if (!validEmail(email)) {
      setError('Email invalide.');
      return;
    }
    if (password.length < 6) {
      setError('Mot de passe : 6 caractères minimum.');
      return;
    }
    if (password !== confirm) {
      setError('La confirmation ne correspond pas au mot de passe.');
      return;
    }
    setLoading(true);
    try {
      const fullName = kind === 'entreprise' ? raisonSociale.trim() : nomGestionnaire.trim();
      const signed = await signupAccount(email.trim(), password, fullName);
      if (signed.error || !signed.userId) {
        setError(signed.error || 'Inscription impossible. Réessayez.');
        return;
      }
      if (signed.hasSession) {
        const res =
          kind === 'entreprise'
            ? await createEntrepriseProfile(signed.userId, {
                raisonSociale: raisonSociale.trim(),
                email: email.trim(),
              })
            : await createCabinetProfile(signed.userId, {
                raisonSociale: raisonSociale.trim(),
                nomGestionnaire: nomGestionnaire.trim(),
                email: email.trim(),
                ville: ville.trim(),
                numAgrement: numAgrement.trim(),
                typeCabinet,
              });
        if (!res.ok) {
          setError(res.error || 'Finalisation impossible. Réessayez.');
          return;
        }
        onComplete();
        return;
      }
      // Pas de session immédiate (email à confirmer) : finalisation à la 1re connexion.
      // PEN-029 : payload minimal en localStorage (jamais de mot de passe ni téléphone).
      if (kind === 'entreprise') {
        savePendingInscription({
          kind,
          userId: signed.userId,
          at: Date.now(),
          fields: { raisonSociale: raisonSociale.trim(), email: email.trim() },
        });
      } else {
        savePendingInscription({
          kind,
          userId: signed.userId,
          at: Date.now(),
          fields: {
            raisonSociale: raisonSociale.trim(),
            nomGestionnaire: nomGestionnaire.trim(),
            email: email.trim(),
          },
        });
      }
      setSuccess(
        'Compte créé. Confirmez votre email puis connectez-vous — votre espace sera finalisé automatiquement.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F6FB] p-4">
      <div className="w-full max-w-[440px] space-y-5">
        <div className="flex justify-center">
          <LegalFlowLogo size="md" showSubtitle />
        </div>

        <div className="bg-white border border-[#E5E5F0] rounded-2xl p-6 sm:p-7 shadow-sm">
          <h1 className="text-lg font-black text-[#171A2E] m-0">Créer mon compte</h1>
          <p className="text-xs text-[#6B6F85] mt-1 mb-5">
            {kind === 'entreprise'
              ? 'Votre entreprise est activée immédiatement.'
              : 'Votre cabinet sera examiné par Legal Flow HQ sous 24 à 48 h.'}
          </p>

          <div className="grid grid-cols-2 gap-2 bg-[#F1F5F9] rounded-xl p-1 mb-5">
            <button
              type="button"
              onClick={() => setKind('entreprise')}
              className={`flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                kind === 'entreprise' ? 'bg-white text-[#3D3680] shadow-xs' : 'text-[#64748B]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Une entreprise</span>
            </button>
            <button
              type="button"
              onClick={() => setKind('cabinet')}
              className={`flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                kind === 'cabinet' ? 'bg-white text-[#3D3680] shadow-xs' : 'text-[#64748B]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Un cabinet</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className={labelCls}>
                {kind === 'entreprise' ? 'Raison sociale' : 'Raison sociale du cabinet'}
              </label>
              <input
                type="text"
                value={raisonSociale}
                onChange={(e) => setRaisonSociale(e.target.value)}
                placeholder={kind === 'entreprise' ? 'Ex : Établissements Koffi BTP SARL' : 'Ex : Cabinet Audit & Conseils CI'}
                className={inputCls}
              />
            </div>

            {kind === 'cabinet' && (
              <>
                <div>
                  <label className={labelCls}>Nom du gestionnaire</label>
                  <input
                    type="text"
                    value={nomGestionnaire}
                    onChange={(e) => setNomGestionnaire(e.target.value)}
                    placeholder="Ex : Awa Koné"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Ville</label>
                    <input
                      type="text"
                      value={ville}
                      onChange={(e) => setVille(e.target.value)}
                      placeholder="Abidjan"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>N° d’agrément</label>
                    <input
                      type="text"
                      value={numAgrement}
                      onChange={(e) => setNumAgrement(e.target.value)}
                      placeholder="Optionnel"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Type de cabinet</label>
                  <select value={typeCabinet} onChange={(e) => setTypeCabinet(e.target.value)} className={inputCls}>
                    <option>Comptable</option>
                    <option>Juridique</option>
                    <option>Audit</option>
                    <option>Conseil</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className={labelCls}>Email professionnel</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.ci"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Mot de passe (min 6)</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Confirmation</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••"
                  className={inputCls}
                />
              </div>
            </div>

            {error && (
              <div className="text-xs font-bold text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2.5">
                {error}
              </div>
            )}
            {success && (
              <div className="text-xs font-bold text-[#1F9254] bg-[#E7F6EE] border border-[#A7F3D0] rounded-xl px-3 py-2.5">
                {success}
              </div>
            )}

            <button
              id="btnSignup"
              type="submit"
              disabled={loading}
              className="w-full bg-[#4F46A0] hover:bg-[#3D3680] disabled:opacity-60 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>

          <button
            onClick={() => onNavigate('login')}
            className="mt-4 w-full text-xs font-bold text-[#4F46A0] hover:underline cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Déjà un compte ? Se connecter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
