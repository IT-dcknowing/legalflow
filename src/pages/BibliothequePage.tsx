import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Calculator,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  Users,
  Ship,
  FileCheck2,
  Award,
  Briefcase,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Percent,
} from 'lucide-react';
import { FicheGuide } from '../types';

interface BibliothequePageProps {
  fiches: FicheGuide[];
  onOpenFiche: (fiche: FicheGuide) => void;
}

export const BibliothequePage: React.FC<BibliothequePageProps> = ({
  fiches,
  onOpenFiche,
}) => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(true);

  // Simulator state
  const [salaireBrut, setSalaireBrut] = useState<number>(350_000);
  const [nbSalaries, setNbSalaries] = useState<number>(3);

  // Simulator mathematical engine (Côte d'Ivoire 2026 certified rates)
  const simulationResults = useMemo(() => {
    const brutTotal = salaireBrut * nbSalaries;

    // CNPS Cotisations
    // Retraite: Patronale 7.7%, Salariale 6.3% (Plafond CNPS 70_000_000 FCFA/an soit ~5_833_333/mois, ici inférieur)
    const cnpsRetraitePatronale = Math.round(brutTotal * 0.077);
    const cnpsRetraiteSalariale = Math.round(brutTotal * 0.063);

    // Prestations familiales: 5.75%
    const cnpsFamillePatronale = Math.round(brutTotal * 0.0575);

    // Accidents du travail: 4.00% (BTP risque élevé)
    const cnpsAtPatronale = Math.round(brutTotal * 0.04);

    // CMU: 1000 FCFA par salarié dont 500 FCFA part employeur
    const cmuPatronale = 500 * nbSalaries;
    const cmuSalariale = 500 * nbSalaries;

    // FDFP: Formation continue 1.2%, Taxe apprentissage 0.4%
    const fdfpTaxeApprentissage = Math.round(brutTotal * 0.004);
    const fdfpFormationContinue = Math.round(brutTotal * 0.012);

    // Total charges patronales
    const totalChargesPatronales =
      cnpsRetraitePatronale +
      cnpsFamillePatronale +
      cnpsAtPatronale +
      cmuPatronale +
      fdfpTaxeApprentissage +
      fdfpFormationContinue;

    // Coût global employeur
    const coutGlobalEmployeur = brutTotal + totalChargesPatronales;

    // ITS / Retenues fiscales salariales estimées (~6.5%)
    const itsSalarial = Math.round(brutTotal * 0.065);

    // Total retenues salariales
    const totalRetenuesSalariales = cnpsRetraiteSalariale + cmuSalariale + itsSalarial;

    // Salaire net total et par salarié
    const netTotal = brutTotal - totalRetenuesSalariales;
    const netParSalarie = Math.round(netTotal / nbSalaries);

    // Droits formation continue récupérables par an (1.2% annuel)
    const droitsFdfpAnnuel = Math.round(brutTotal * 0.012 * 12);

    return {
      brutTotal,
      cnpsRetraitePatronale,
      cnpsFamillePatronale,
      cnpsAtPatronale,
      cmuPatronale,
      fdfpTaxeApprentissage,
      fdfpFormationContinue,
      totalChargesPatronales,
      coutGlobalEmployeur,
      netTotal,
      netParSalarie,
      droitsFdfpAnnuel,
    };
  }, [salaireBrut, nbSalaries]);

  // Fiches filtering
  const filteredFiches = fiches.filter((f) => {
    const matchFilter =
      activeFilter === 'Tous' || f.category.toLowerCase() === activeFilter.toLowerCase();
    const matchSearch =
      f.titre.toLowerCase().includes(search.toLowerCase()) ||
      f.resume.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // 7 Parcours thématiques opérationnels
  const parcoursVie = [
    {
      id: 'p-succursale',
      title: '1. Ouverture d’un établissement secondaire',
      icon: Building,
      summary: 'Inscription modificative RCCM sous 30 jours, rattachement au CDI territorial et déclaration CNPS des locaux.',
      stepsCount: 5,
      ficheRef: fiches[0] || fiches[1],
    },
    {
      id: 'p-embauche',
      title: '2. Première embauche & déclaration CNPS',
      icon: Users,
      summary: 'Contrat de travail écrit, immatriculation salariée sous 8 jours, adhésion CMU obligatoire et visite médicale.',
      stepsCount: 6,
      ficheRef: fiches[1] || fiches[0],
    },
    {
      id: 'p-douanes',
      title: '3. Importation et dédouanement (Sydonia & BSC)',
      icon: Ship,
      summary: 'Levée du Bordereau de Suivi des Cargaisons (BSC), déclaration Sydonia World et paiement du TEC UEMOA.',
      stepsCount: 7,
      ficheRef: fiches[3] || fiches[0],
    },
    {
      id: 'p-controle',
      title: '4. Préparation à un contrôle fiscal ou social (DGI / CNPS)',
      icon: ShieldCheck,
      summary: 'Constitution du classeur de contrôle, rapprochement CA bancaire / TVA et vérification des bulletins de paie.',
      stepsCount: 8,
      ficheRef: fiches[0],
    },
    {
      id: 'p-marche',
      title: '5. Soumission à un marché public (Dossier de régularité)',
      icon: Briefcase,
      summary: 'Attestation de Régularité Fiscale (ARF), Quitus CNPS et attestation CMU de non-redevance indispensables.',
      stepsCount: 5,
      ficheRef: fiches[2] || fiches[0],
    },
    {
      id: 'p-cga',
      title: '6. Adhésion à un Centre de Gestion Agréé (CGA)',
      icon: Award,
      summary: 'Procédure pour débloquer l’abattement d’impôt de 20% sur les bénéfices et la dispense de majoration.',
      stepsCount: 4,
      ficheRef: fiches[2] || fiches[0],
    },
    {
      id: 'p-fdfp',
      title: '7. Récupération des budgets de formation continue (FDFP)',
      icon: GraduationCap,
      summary: 'Plan de formation annuel, soumission des factures certifiées et remboursement direct sur cotisation 1.2%.',
      stepsCount: 5,
      ficheRef: fiches[1] || fiches[0],
    },
  ];

  return (
    <div id="pageBibliotheque" className="space-y-7">
      {/* 1. Section « Recommandé pour vous » (Fiches contextualisées) */}
      <div id="sectionRecommande" className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#4F46A0]" />
          <h2 className="text-sm sm:text-base font-black text-[#171A2E] uppercase tracking-wider m-0">
            Recommandé pour vous (Points d'attention de votre dossier)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {fiches.slice(0, 3).map((fiche, idx) => (
            <div
              key={fiche.id}
              className="bg-white border border-[#E5E5F0] rounded-2xl p-5 flex flex-col justify-between hover:border-[#C7C4E8] hover:shadow-xs transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#4F46A0] bg-[#EDEBF9] px-2 py-0.5 rounded-full">
                    {idx === 0
                      ? 'Lié à votre seuil de CA (95%)'
                      : idx === 1
                      ? 'Lié à votre plan d’embauche'
                      : 'Lié à vos chantiers BTP'}
                  </span>
                  <span className="text-[11px] text-[#6B6F85] font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {fiche.duree}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#171A2E] leading-snug m-0">
                  {fiche.titre}
                </h3>

                <p className="text-xs text-[#6B6F85] line-clamp-2 m-0 leading-relaxed">
                  {fiche.resume}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-[#F0F0F5]">
                <button
                  onClick={() => onOpenFiche(fiche)}
                  className="w-full bg-[#F6F6FB] hover:bg-[#EDEBF9] text-[#3D3680] text-xs font-bold py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Consulter la fiche certifiée</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Simulateur intégré de calculs réglementaires (Coût d'embauche et charges) */}
      <div
        id="sectionSimulateur"
        className="bg-white border border-[#E5E5F0] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F0F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#171A2E] m-0">
                Simulateur Réglementaire : Coût d'Embauche &amp; Charges Patronales
              </h3>
              <div className="text-xs text-[#6B6F85] mt-0.5">
                Barème officiel Côte d'Ivoire (CNPS 16.45% + 4% AT, CMU, FDFP 1.6%)
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
            className="text-xs font-bold text-[#4F46A0] hover:text-[#3D3680] flex items-center gap-1 self-start sm:self-center cursor-pointer"
          >
            <span>{isSimulatorOpen ? 'Masquer le simulateur' : 'Afficher le simulateur'}</span>
            {isSimulatorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isSimulatorOpen && (
          <div className="space-y-6 animate-fadeIn">
            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-[#F9F9FD] p-4 rounded-xl border border-[#E5E5F0]">
              {/* Salaire Brut Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#171A2E]">Salaire brut mensuel par salarié :</span>
                  <span className="text-sm font-black text-[#4F46A0]">
                    {salaireBrut.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <input
                  type="range"
                  min={75_000}
                  max={2_000_000}
                  step={25_000}
                  value={salaireBrut}
                  onChange={(e) => setSalaireBrut(Number(e.target.value))}
                  className="w-full accent-[#4F46A0] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#6B6F85]">
                  <span>SMIG légal (75 000 FCFA)</span>
                  <span>Moyen cadre (1 000 000 FCFA)</span>
                  <span>Plafond (2 000 000 FCFA)</span>
                </div>
              </div>

              {/* Nombre de salariés */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#171A2E]">Effectif concerné par la simulation :</span>
                  <span className="text-sm font-black text-[#4F46A0]">
                    {nbSalaries} salarié{nbSalaries > 1 ? 's' : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={nbSalaries}
                  onChange={(e) => setNbSalaries(Number(e.target.value))}
                  className="w-full accent-[#4F46A0] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#6B6F85]">
                  <span>1 travailleur</span>
                  <span>10 travailleurs</span>
                  <span>50 travailleurs</span>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-[#E5E5F0] space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B6F85]">
                  Masse salariale brute
                </div>
                <div className="text-base font-black text-[#171A2E]">
                  {simulationResults.brutTotal.toLocaleString('fr-FR')} FCFA
                </div>
                <div className="text-[11px] text-[#6B6F85]">Pour {nbSalaries} salariés</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-[#E5E5F0] space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#C4432B]">
                  Charges patronales (22.05%)
                </div>
                <div className="text-base font-black text-[#C4432B]">
                  +{simulationResults.totalChargesPatronales.toLocaleString('fr-FR')} FCFA
                </div>
                <div className="text-[11px] text-[#6B6F85]">CNPS + CMU + FDFP</div>
              </div>

              <div className="bg-[#EDEBF9] p-3.5 rounded-xl border border-[#C7C4E8] space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#3D3680]">
                  Coût total employeur
                </div>
                <div className="text-base font-black text-[#3D3680]">
                  {simulationResults.coutGlobalEmployeur.toLocaleString('fr-FR')} FCFA
                </div>
                <div className="text-[11px] text-[#4F46A0] font-semibold">Par mois tout compris</div>
              </div>

              <div className="bg-[#E7F6EE] p-3.5 rounded-xl border border-[#A5E3BE] space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#1F9254]">
                  Salaire net estimé
                </div>
                <div className="text-base font-black text-[#1F9254]">
                  {simulationResults.netParSalarie.toLocaleString('fr-FR')} FCFA
                </div>
                <div className="text-[11px] text-[#1F9254] font-semibold">Net perçu / travailleur</div>
              </div>
            </div>

            {/* Regulatory Breakdown Details */}
            <div className="p-4 bg-[#F0F0F5]/70 rounded-xl text-xs space-y-2">
              <div className="font-bold text-[#171A2E]">
                Détail des taux obligatoires appliqués (Barème BTP Côte d’Ivoire) :
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#555870]">
                <div>• Retraite CNPS : 7.7% part patronale (6.3% salariale)</div>
                <div>• Allocations familiales : 5.75% part patronale</div>
                <div>• Risque BTP (AT/MP) : 4.00% part patronale</div>
                <div>• CMU obligatoire : 1 000 F / mois (500 F employeur)</div>
                <div>• FDFP Formation : 1.2% de la masse salariale</div>
                <div>• FDFP Apprentissage : 0.4% de la masse salariale</div>
                <div>• Reste fiscal récupérable :{' '}
                  <strong className="text-[#1F9254]">
                    {simulationResults.droitsFdfpAnnuel.toLocaleString('fr-FR')} FCFA/an
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Section « Parcours par événement de vie de l'entreprise » */}
      <div id="sectionParcoursVie" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-[#171A2E] uppercase tracking-wider m-0">
              Parcours par Événement de Vie de l'Entreprise
            </h2>
            <div className="text-xs text-[#6B6F85] mt-0.5">
              7 parcours thématiques structurés étape par étape avec formulaires et démarches
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parcoursVie.map((parcours) => {
            const Icon = parcours.icon;
            return (
              <div
                key={parcours.id}
                onClick={() => onOpenFiche(parcours.ficheRef)}
                className="bg-white border border-[#E5E5F0] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#4F46A0] hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center group-hover:bg-[#4F46A0] group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-[#6B6F85] bg-[#F0F0F5] px-2 py-0.5 rounded-full">
                      {parcours.stepsCount} étapes certifiées
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#171A2E] group-hover:text-[#4F46A0] transition-colors leading-snug m-0">
                    {parcours.title}
                  </h3>

                  <p className="text-xs text-[#555870] leading-relaxed line-clamp-3 m-0">
                    {parcours.summary}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-[#F0F0F5] flex items-center justify-between text-xs font-bold text-[#4F46A0]">
                  <span>Lancer la procédure pas-à-pas</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Répertoire complet des fiches & moteur de recherche */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm sm:text-base font-black text-[#171A2E] uppercase tracking-wider m-0">
            Toutes les Fiches Pratiques &amp; Guides Réglementaires ({filteredFiches.length})
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#6B6F85] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une fiche ou procédure..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5E5F0] rounded-xl text-xs text-[#171A2E] focus:outline-none focus:border-[#4F46A0]"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 flex-wrap">
          {['Tous', 'Fiscal', 'Social', 'Commerce', 'Douanes'].map((cat) => {
            const isActive = activeFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#3D3680] text-white border-[#3D3680]'
                    : 'bg-white border-[#E5E5F0] text-[#555870] hover:bg-[#F6F6FB]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Fiches List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredFiches.map((fiche) => (
            <div
              key={fiche.id}
              className="flex items-center justify-between bg-white border border-[#E5E5F0] rounded-xl p-4 hover:border-[#C7C4E8] transition-all shadow-xs"
            >
              <div className="space-y-1 min-w-0 pr-3">
                <div className="font-bold text-xs sm:text-sm text-[#171A2E] truncate">
                  {fiche.titre}
                </div>
                <div className="text-[11px] text-[#6B6F85] flex items-center gap-2">
                  <span className="font-semibold text-[#4F46A0]">{fiche.category}</span>
                  <span>•</span>
                  <span>{fiche.duree}</span>
                  <span>•</span>
                  <span>{fiche.articlesRefs || 'CGI & Décrets'}</span>
                </div>
              </div>

              <button
                onClick={() => onOpenFiche(fiche)}
                className="bg-[#F9F9FD] hover:bg-[#EDEBF9] text-[#3D3680] border border-[#E5E5F0] rounded-xl px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
              >
                Ouvrir la fiche
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
