import React from 'react';
import {
  CalendarCheck,
  Receipt,
  Radar,
  Gauge,
  Building2,
  Sparkles,
  ArrowRight,
  Check,
  ShieldCheck,
  Briefcase,
  Factory,
} from 'lucide-react';
import type { PageId } from '../types';
import { LegalFlowLogo } from '../components/LegalFlowLogo';

interface LandingPageProps {
  onNavigate: (page: PageId) => void;
}

const PERSONAS = [
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: 'Super Admin HQ',
    points: ['Pilotage global de la conformité', 'Validation des cabinets partenaires', 'Veille réglementaire centralisée'],
  },
  {
    icon: <Briefcase className="w-6 h-6" />,
    title: 'Gestionnaire de cabinet',
    points: ['Portefeuille multi-entreprises', 'Suivi des échéances clients', 'Dossiers et quittances centralisés'],
  },
  {
    icon: <Factory className="w-6 h-6" />,
    title: 'Entreprise',
    points: ['Tableau de bord de conformité', 'Alertes avant chaque échéance', 'Assistant fiscal intelligent'],
  },
];

const FEATURES = [
  {
    icon: <CalendarCheck className="w-5 h-5" />,
    title: 'Échéances intelligentes',
    desc: 'TVA, ITS, CNPS, CMU : chaque échéance calculée et suivie pour vous.',
  },
  {
    icon: <Receipt className="w-5 h-5" />,
    title: 'Bulletins de paie CNPS/CMU',
    desc: 'Cotisations Retraite, Famille, AT/MP et CMU suivies au taux en vigueur.',
  },
  {
    icon: <Radar className="w-5 h-5" />,
    title: 'Veille réglementaire',
    desc: 'CGI, Annexe fiscale, CNPS : les textes qui vous concernent, signalés.',
  },
  {
    icon: <Gauge className="w-5 h-5" />,
    title: 'Score de conformité',
    desc: 'Un indice clair de votre santé déclarative, entreprise par entreprise.',
  },
  {
    icon: <Building2 className="w-5 h-5" />,
    title: 'Multi-entreprise',
    desc: 'Cabinets : pilotez tous vos dossiers clients depuis un seul portefeuille.',
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Assistant IA juridique',
    desc: 'Des réponses sourcées sur le droit fiscal et social ivoirien.',
  },
];

const PLANS = [
  {
    name: 'Gratuit',
    price: '0 FCFA',
    period: 'pour découvrir',
    features: ['1 entreprise', 'Échéancier de base', 'Alertes email'],
    cta: 'Commencer',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '9 900 FCFA',
    period: '/mois',
    features: ['1 entreprise', 'Assistant IA illimité', 'Quittances & preuves', 'Score de conformité', 'Veille réglementaire'],
    cta: 'Choisir Pro',
    highlight: true,
  },
  {
    name: 'Cabinet',
    price: 'Sur devis',
    period: 'portefeuille illimité',
    features: ['Entreprises illimitées', 'Validation HQ', 'Journal d’audit complet', 'Support dédié'],
    cta: 'Contacter',
    highlight: false,
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div id="pageLanding" className="min-h-screen bg-white text-[#171A2E]">
      {/* Barre minimale (pas de navigation applicative) */}
      <div className="border-b border-[#E5E5F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <LegalFlowLogo size="md" showSubtitle={false} />
          <button
            onClick={() => onNavigate('login')}
            className="text-xs font-bold text-[#4F46A0] hover:underline cursor-pointer"
          >
            Se connecter
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EDEBF9] text-[#4F46A0] text-xs font-bold mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C4432B]" />
          <span>Conformité fiscale & sociale · Côte d’Ivoire</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight m-0">
          Ne ratez plus aucune
          <br />
          échéance fiscale en Côte d’Ivoire
        </h1>
        <p className="text-sm sm:text-lg text-[#555870] mt-4 max-w-2xl mx-auto">
          TVA, ITS, CN, IGR, CNPS, CMU — calculés et suivis pour vous.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
          <button
            id="btnLandingSignup"
            onClick={() => onNavigate('inscription')}
            className="bg-[#4F46A0] hover:bg-[#3D3680] text-white font-bold text-sm px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Créer mon compte</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            id="btnLandingLogin"
            onClick={() => onNavigate('login')}
            className="bg-white hover:bg-[#F6F6FB] text-[#20263A] border border-[#E5E5F0] font-bold text-sm px-6 py-3 rounded-xl transition-colors cursor-pointer"
          >
            Se connecter
          </button>
        </div>
      </div>

      {/* Personas */}
      <div className="bg-[#F9F9FD] border-y border-[#E5E5F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-xl sm:text-2xl font-black text-center m-0">Pour chaque acteur</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-7">
            {PERSONAS.map((p) => (
              <div key={p.title} className="bg-white border border-[#E5E5F0] rounded-xl p-5">
                <div className="w-11 h-11 rounded-xl bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center mb-3">
                  {p.icon}
                </div>
                <div className="font-extrabold text-sm mb-2">{p.title}</div>
                <ul className="text-xs text-[#555870] space-y-1.5 pl-4 list-disc m-0">
                  {p.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-xl sm:text-2xl font-black text-center m-0">Tout pour rester conforme</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-7">
          {FEATURES.map((f) => (
            <div key={f.title} className="border border-[#E5E5F0] rounded-xl p-5 hover:border-[#4F46A0]/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <div className="font-extrabold text-sm mb-1.5">{f.title}</div>
              <p className="text-xs text-[#555870] m-0 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-[#F9F9FD] border-y border-[#E5E5F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-xl sm:text-2xl font-black text-center m-0">Des tarifs simples</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-7 items-stretch">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-xl p-6 flex flex-col ${
                  plan.highlight
                    ? 'border-2 border-[#4F46A0] shadow-lg relative'
                    : 'border border-[#E5E5F0]'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C4432B] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Populaire
                  </span>
                )}
                <div className="font-extrabold text-sm">{plan.name}</div>
                <div className="mt-2 mb-1">
                  <span className="text-2xl font-black">{plan.price}</span>{' '}
                  <span className="text-xs text-[#6B6F85]">{plan.period}</span>
                </div>
                <ul className="text-xs text-[#555870] space-y-2 my-4 pl-0 list-none">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#1F9254] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onNavigate('inscription')}
                  className={`mt-auto w-full font-bold text-sm py-2.5 rounded-xl transition-colors cursor-pointer ${
                    plan.highlight
                      ? 'bg-[#4F46A0] hover:bg-[#3D3680] text-white'
                      : 'bg-[#F6F6FB] hover:bg-[#EDEBF9] text-[#20263A] border border-[#E5E5F0]'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <LegalFlowLogo size="sm" showSubtitle={false} />
        <div className="flex items-center gap-5 text-xs font-bold text-[#6B6F85]">
          <span className="hover:text-[#20263A] cursor-pointer">À propos</span>
          <span className="hover:text-[#20263A] cursor-pointer">Contact</span>
          <span className="hover:text-[#20263A] cursor-pointer">CGU</span>
          <span className="hover:text-[#20263A] cursor-pointer">Confidentialité</span>
        </div>
        <div className="text-[11px] text-[#8C90A4]">© 2026 Legal Flow</div>
      </div>
    </div>
  );
};
