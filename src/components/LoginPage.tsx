import React, { useState } from 'react';
import { Lock, Mail, LogIn } from 'lucide-react';
import { LegalFlowLogo } from './LegalFlowLogo';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
}

/**
 * Page de connexion unique (tous niveaux).
 * Pas d'inscription publique : les comptes sont créés par invitation
 * (Niv. 1 → Niv. 2 → Niv. 3). Le rôle est lu en base après login.
 */
export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Saisissez votre email et votre mot de passe.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const err = await onLogin(email.trim(), password);
      if (err) setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F6FB] p-4">
      <div className="w-full max-w-[400px] space-y-5">
        <div className="flex justify-center">
          <LegalFlowLogo size="md" showSubtitle />
        </div>

        <div className="bg-white border border-[#E5E5F0] rounded-2xl p-6 sm:p-7 shadow-sm">
          <h1 className="text-lg font-black text-[#171A2E] m-0">Connexion</h1>
          <p className="text-xs text-[#6B6F85] mt-1 mb-5">
            Accédez à votre espace selon votre niveau (Console HQ, Portefeuille ou Entreprise).
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-[#20263A] mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#4F46A0]" />
                <span>Email professionnel</span>
              </label>
              <input
                id="loginEmail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#E5E5F0] rounded-xl px-3.5 py-2.5 text-sm text-[#171A2E] placeholder-[#8C90A4] focus:outline-none focus:border-[#4F46A0] transition-colors"
              />
            </div>

            {error && (
              <div
                id="loginError"
                className="text-xs font-bold text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2.5"
              >
                {error}
              </div>
            )}

            <button
              id="btnLogin"
              type="submit"
              disabled={loading}
              className="w-full bg-[#4F46A0] hover:bg-[#3D3680] disabled:opacity-60 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Connexion…' : 'Se connecter'}</span>
            </button>
          </form>

          <p className="text-[11px] text-[#8C90A4] mt-4 mb-0 text-center">
            Pas de compte ? Les accès sont créés par invitation par votre cabinet ou Legal Flow HQ.
          </p>
        </div>
      </div>
    </div>
  );
};
