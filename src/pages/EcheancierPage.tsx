import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Plus,
  History,
} from 'lucide-react';
import { Obligation, CostSimulation } from '../types';
import { ObligationCard } from '../components/ObligationCard';
// PEN-027 : drawer lourd en chunk séparé (code splitting).
const CostSimulationDrawer = React.lazy(() =>
  import('../components/CostSimulationDrawer').then((m) => ({ default: m.CostSimulationDrawer }))
);
import { groupObligations } from '../services/echeancier';

interface EcheancierPageProps {
  obligations: Obligation[];
  dateReference: Date;
  onOpenConfirmModal: (ob: Obligation) => void;
  onOpenAddDeadlineModal: () => void;
  onOpenFiche?: (ficheId: string) => void;
  onSaveSimulation?: (obligationId: string, simulation: CostSimulation) => void;
  onDeleteSimulation?: (obligationId: string) => void;
}

export const EcheancierPage: React.FC<EcheancierPageProps> = ({
  obligations,
  dateReference,
  onOpenConfirmModal,
  onOpenAddDeadlineModal,
  onOpenFiche,
  onSaveSimulation,
  onDeleteSimulation,
}) => {
  const [selectedAdmin, setSelectedAdmin] = useState<string>('Toutes');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // AMENDEMENT #2 §2 : vue active (3 blocs) vs historique des quittances pointées.
  const [vue, setVue] = useState<'actif' | 'historique'>('actif');

  // État du Drawer de simulation de coût réel
  const [simulatingObligation, setSimulatingObligation] = useState<Obligation | null>(null);
  const [isSimulatorDrawerOpen, setIsSimulatorDrawerOpen] = useState<boolean>(false);

  // Administration list defined in specification
  const adminCategories = [
    { id: 'Toutes', label: 'Toutes' },
    { id: 'DGI', label: 'DGI (Impôts)' },
    { id: 'CNPS', label: 'CNPS (Sécurité Sociale)' },
    { id: 'CMU', label: 'CMU (Couverture Maladie)' },
    { id: 'Inspection du Travail', label: 'Inspection du Travail' },
    { id: 'Commerce', label: 'Commerce & Métrologie' },
    { id: 'Greffe', label: 'Greffe / RCCM' },
    { id: 'Douanes', label: 'Douanes (DGD)' },
    { id: 'Environnement', label: 'Environnement' },
    { id: 'ARTCI', label: 'ARTCI (Données)' },
  ];

  // Calculate counts per administration
  const countsByAdmin = useMemo(() => {
    const counts: Record<string, number> = { Toutes: obligations.length };
    adminCategories.forEach((admin) => {
      if (admin.id === 'Toutes') return;
      counts[admin.id] = obligations.filter((ob) => {
        const obAdmin = ob.administration || '';
        return (
          obAdmin.toLowerCase().includes(admin.id.toLowerCase()) ||
          (admin.id === 'Commerce' && ob.domaine === 'commerce') ||
          (admin.id === 'Douanes' && ob.domaine === 'douanes') ||
          (admin.id === 'Greffe' && ob.domaine === 'administratif')
        );
      }).length;
    });
    return counts;
  }, [obligations]);

  // Filter obligations based on admin and search text
  const filteredObligations = useMemo(() => {
    return obligations.filter((ob) => {
      // Admin filter
      if (selectedAdmin !== 'Toutes') {
        const obAdmin = ob.administration || '';
        const matchAdmin =
          obAdmin.toLowerCase().includes(selectedAdmin.toLowerCase()) ||
          (selectedAdmin === 'Commerce' && ob.domaine === 'commerce') ||
          (selectedAdmin === 'Douanes' && ob.domaine === 'douanes') ||
          (selectedAdmin === 'Greffe' && ob.domaine === 'administratif');
        if (!matchAdmin) return false;
      }

      // Search filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = ob.titre.toLowerCase().includes(q);
        const matchDesc = (ob.description || '').toLowerCase().includes(q);
        const matchBase = (ob.baseLegale || '').toLowerCase().includes(q);
        const matchAdmin = (ob.administration || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchBase && !matchAdmin) {
          return false;
        }
      }

      return true;
    });
  }, [obligations, selectedAdmin, searchQuery]);

  // Groupes roulants depuis dateReference — UN SEUL algorithme partagé avec le dashboard.
  // Aucun mois codé en dur : les libellés sont calculés (En retard / Mois en cours / Mois prochain).
  const groupes = useMemo(
    () => groupObligations(filteredObligations, dateReference),
    [filteredObligations, dateReference]
  );

  const blocks =
    vue === 'actif'
      ? [
          { key: 'retard', label: `En retard (${groupes.enRetard.length})`, items: groupes.enRetard },
          { key: 'encours', label: `${groupes.moisEnCoursLabel} (${groupes.moisEnCours.length})`, items: groupes.moisEnCours },
          { key: 'prochain', label: `${groupes.moisProchainLabel} (${groupes.moisProchain.length})`, items: groupes.moisProchain },
        ]
      : [
          { key: 'historique', label: `Historique (${groupes.historique.length})`, items: groupes.historique },
        ];

  const handleOpenSimulator = (ob: Obligation) => {
    setSimulatingObligation(ob);
    setIsSimulatorDrawerOpen(true);
  };

  const handleSaveSim = (obligationId: string, simulation: CostSimulation) => {
    if (onSaveSimulation) {
      onSaveSimulation(obligationId, simulation);
    }
    // Met à jour l'obligation actuellement en cours de simulation si c'est la même
    if (simulatingObligation && simulatingObligation.id === obligationId) {
      setSimulatingObligation((prev) => (prev ? { ...prev, simulation } : null));
    }
  };

  const handleDeleteSim = (obligationId: string) => {
    if (onDeleteSimulation) {
      onDeleteSimulation(obligationId);
    }
    if (simulatingObligation && simulatingObligation.id === obligationId) {
      setSimulatingObligation((prev) => (prev ? { ...prev, simulation: undefined } : null));
    }
  };

  return (
    <div id="pageEcheancier" className="space-y-6">
      {/* 1. Barre d'outils et métriques */}
      <div className="bg-white border border-[#E5E5F0] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#171A2E] m-0">
              Calendrier Fiscal &amp; Social Certifié
            </h2>
            <div className="text-xs text-[#6B6F85] mt-0.5">
              <span className="font-bold text-[#4F46A0]">
                {filteredObligations.length} obligation{filteredObligations.length > 1 ? 's' : ''} trouvée{filteredObligations.length > 1 ? 's' : ''}
              </span>{' '}
              sur votre périmètre d'activité BTP en Côte d'Ivoire.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btnAddDeadline"
              onClick={onOpenAddDeadlineModal}
              className="bg-[#4F46A0] hover:bg-[#3D3680] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Ajouter une échéance</span>
            </button>
          </div>
        </div>

        {/* Search input & Quick indicator */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6B6F85] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="searchObligationInput"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par libellé, CGI, CNPS, plateforme e-impôts..."
              className="w-full pl-10 pr-4 py-2 bg-[#F9F9FD] border border-[#E5E5F0] rounded-xl text-xs text-[#171A2E] placeholder-[#8C90A4] focus:outline-none focus:border-[#4F46A0] transition-colors"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-[#6B6F85] hover:text-[#171A2E] px-2 py-1 self-center cursor-pointer"
            >
              Effacer recherche
            </button>
          )}
        </div>

        {/* Administrations Filter Chips */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-bold text-[#6B6F85] uppercase tracking-wider">
            Filtrer par organisme récepteur :
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {adminCategories.map((admin) => {
              const isActive = selectedAdmin === admin.id;
              const count = countsByAdmin[admin.id] || 0;
              return (
                <button
                  key={admin.id}
                  onClick={() => setSelectedAdmin(admin.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-[#3D3680] text-white shadow-xs'
                      : 'bg-[#F9F9FD] text-[#555870] hover:bg-[#EDEBF9] hover:text-[#3D3680] border border-[#E5E5F0]'
                  }`}
                >
                  <span>{admin.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#E5E5F0] text-[#6B6F85]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Sélecteur de vue Active / Historique (soldés par quittance pointée) */}
      <div className="flex items-center gap-2">
        <div className="inline-flex bg-[#F1F5F9] rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setVue('actif')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              vue === 'actif' ? 'bg-white text-[#3D3680] shadow-xs' : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Actif
          </button>
          <button
            type="button"
            onClick={() => setVue('historique')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              vue === 'historique' ? 'bg-white text-[#3D3680] shadow-xs' : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historique ({groupes.historique.length})</span>
          </button>
        </div>
      </div>

      {/* 3. Blocs roulants : En retard (triés par jours) / Mois en cours / Mois prochain */}
      {filteredObligations.length === 0 ? (
        <div className="bg-white border border-[#E5E5F0] rounded-2xl p-10 text-center space-y-2">
          <Calendar className="w-10 h-10 text-[#8C90A4] mx-auto" />
          <div className="text-sm font-bold text-[#171A2E]">
            Aucune obligation ne correspond à vos filtres
          </div>
          <p className="text-xs text-[#6B6F85] max-w-sm mx-auto">
            Modifiez votre sélection d'organisme ou effacez les termes de votre recherche textuelle.
          </p>
          <button
            onClick={() => {
              setSelectedAdmin('Toutes');
              setSearchQuery('');
            }}
            className="mt-2 text-xs font-bold text-[#4F46A0] hover:underline cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        blocks.map((block) => {
          return (
            <div key={block.key} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="text-xs font-black uppercase tracking-wider text-[#3D3680] flex items-center gap-2">
                  {block.key === 'historique' ? (
                    <History className="w-3.5 h-3.5 text-[#4F46A0]" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5 text-[#4F46A0]" />
                  )}
                  <span>{block.label}</span>
                </div>
                <span className="text-[11px] font-semibold text-[#6B6F85]">
                  {block.items.length} obligation{block.items.length > 1 ? 's' : ''}
                </span>
              </div>

              {block.items.length === 0 ? (
                <div className="bg-white border border-dashed border-[#CBD5E1] rounded-2xl p-6 text-center text-xs text-[#64748B]">
                  {block.key === 'retard'
                    ? 'Aucune échéance en retard. Toutes les obligations échues sont couvertes par quittance.'
                    : block.key === 'historique'
                    ? 'Aucune quittance pointée pour le moment. Les éléments soldés apparaîtront ici.'
                    : 'Aucune échéance sur ce mois.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {block.items.map((ob) => (
                    <ObligationCard
                      key={ob.id}
                      obligation={ob}
                      dateReference={dateReference}
                      onOpenConfirmModal={onOpenConfirmModal}
                      onOpenSimulator={handleOpenSimulator}
                      onOpenFiche={onOpenFiche}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* 4. Drawer latéral de Simulation de coût réel */}
      <React.Suspense fallback={null}>
        <CostSimulationDrawer
          isOpen={isSimulatorDrawerOpen}
          obligation={simulatingObligation}
          onClose={() => {
            setIsSimulatorDrawerOpen(false);
            setSimulatingObligation(null);
          }}
          onSaveSimulation={handleSaveSim}
          onDeleteSimulation={handleDeleteSim}
        />
      </React.Suspense>
    </div>
  );
};
