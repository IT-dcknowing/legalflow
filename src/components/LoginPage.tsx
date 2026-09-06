import React, { useState } from 'react';
import { Lock, Mail, LogIn } from 'lucide-react';
import { LegalFlowLogo } from './LegalFlowLogo';
import { GoogleIcon } from './GoogleIcon';

interface LoginPageProps {
  onLogin: () => void;
  onResetPassword: () => void;
  onGoogleSignIn: () => void;
  onGoSignup: () => void;
}

/**
 * Page de connexion — VISUELLE UNIQUEMENT (auth en pause).
 * Aucune validation, aucun appel : chaque action redirige vers l'app.
 */
export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onResetPassword,
  onGoogleSignIn,
  onGoSignup,
}) => {
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F6FB] p-4">
      <div className="w-full max-w-[400px] space-y-5">
        <div className="flex justify-center">
          <LegalFlowLogo size="md" showSubtitle />
        </div>

        <div className="bg-white border border-[#E5E5F0] rounded-2xl p-6 sm:p-7 shadow-sm">
          <h1 className="text-lg font-black text-[#171A2E] m-0">
            {resetMode ? 'Mot de passe oublié' : 'Connexion'}
          </h1>
          <p className="text-xs text-[#6B6F85] mt-1 mb-5">
            {resetMode
              ? 'Saisissez votre email pour recevoir un lien de réinitialisation.'
              : 'Accédez à votre espace selon votre niveau (Console HQ, Portefeuille ou Entreprise).'}
          </p>

          {resetMode ? (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#20263A] mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#4F46A0]" />
                  <span>Email professionnel</span>
                </label>
                <input
                  id="loginEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@entreprise.ci"
                  className="w-full border border-[#E5E5F0] rounded-xl px-3.5 py-2.5 text-sm text-[#171A2E] placeholder-[#8C90A4] focus:outline-none focus:border-[#4F46A0] transition-colors"
                />
              </div>

              {resetSent && (
                <div className="text-xs font-bold text-[#1F9254] bg-[#E7F6EE] border border-[#A5E3BE] rounded-xl px-3 py-2.5">
                  Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.
                </div>
              )}

              <button
                id="btnResetPassword"
                type="button"
                onClick={() => {
                  onResetPassword();
                  setResetSent(true);
                }}
                className="w-full bg-[#4F46A0] hover:bg-[#3D3680] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Envoyer le lien
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setResetSent(false);
                }}
                className="w-full text-xs font-bold text-[#4F46A0] hover:underline cursor-pointer"
              >
                ← Retour à la connexion
              </button>
            </div>
          ) : (
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-[#20263A] mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#4F46A0]" />
                <span>Email professionnel</span>
              </label>
              <input
                id="loginEmail"
                type="email"
                autoComplete="email"
                placeholder="vous@entreprise.ci"
                className="w-full border border-[#E5E5F0] rounded-xl px-3.5 py-2.5 text-sm text-[#171A2E] placeholder-[#8C90A4] focus:outline-none focus:border-[#4F46A0] transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#20263A] mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#4F46A0]" />
                <span>Mot de passe</span>
              </label>
              <input
                id="loginPassword"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full border border-[#E5E5F0] rounded-xl px-3.5 py-2.5 text-sm text-[#171A2E] placeholder-[#8C90A4] focus:outline-none focus:border-[#4F46A0] transition-colors"
              />
            </div>

            <button
              id="btnLogin"
              type="button"
              onClick={onLogin}
              className="w-full bg-[#4F46A0] hover:bg-[#3D3680] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Se connecter</span>
            </button>
            <button
              type="button"
              onClick={() => setResetMode(true)}
              className="w-full text-xs font-bold text-[#4F46A0] hover:underline cursor-pointer"
            >
              Mot de passe oublié ?
            </button>
          </div>
          )}

          {!resetMode && (
            <>
              <div className="flex items-center gap-3 my-1">
                <span className="flex-1 h-px bg-[#E5E5F0]" />
                <span className="text-[11px] font-bold text-[#8C90A4]">ou</span>
                <span className="flex-1 h-px bg-[#E5E5F0]" />
              </div>
              <button
                id="btnGoogleSignIn"
                type="button"
                onClick={onGoogleSignIn}
                className="w-full bg-white hover:bg-[#F6F6FB] text-[#20263A] border border-[#E5E5F0] font-bold text-sm px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <GoogleIcon />
                <span>Continuer avec Google</span>
              </button>
            </>
          )}

          <p className="text-[11px] text-[#8C90A4] mt-4 mb-0 text-center">
            Pas encore de compte ?{' '}
            <button
              type="button"
              onClick={onGoSignup}
              className="text-[#4F46A0] font-bold hover:underline cursor-pointer"
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
