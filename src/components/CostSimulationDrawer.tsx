import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calculator,
  Calendar,
  Bell,
  Check,
  AlertTriangle,
  Scale,
  Sparkles,
} from 'lucide-react';
import { Obligation, CostSimulation, CostSimulationLine } from '../types';

interface CostSimulationDrawerProps {
  isOpen: boolean;
  obligation: Obligation | null;
  onClose: () => void;
  onSaveSimulation: (obligationId: string, simulation: CostSimulation) => void;
  onDeleteSimulation?: (obligationId: string) => void;
}

export const CostSimulationDrawer: React.FC<CostSimulationDrawerProps> = ({
  isOpen,
  obligation,
  onClose,
  onSaveSimulation,
  onDeleteSimulation,
}) => {
  const [lines, setLines] = useState<CostSimulationLine[]>([]);
  const [datePaiementPrevue, setDatePaiementPrevue] = useState<string>('');
  const [rappelActif, setRappelActif] = useState<boolean>(true);

  // Initialisation lors de l'ouverture ou du changement d'obligation
  useEffect(() => {
    if (!obligation) return;

    if (obligation.simulation && obligation.simulation.lines.length > 0) {
      setLines(obligation.simulation.lines);
      setDatePaiementPrevue(obligation.simulation.datePaiementPrevue || '');
      setRappelActif(obligation.simulation.rappelActif ?? true);
    } else {
      // AMENDEMENT #2 §4 : aucun montant pré-calculé. Une ligne « principal » vide
      // à saisir + chips de suggestion (clic = saisie assistée, montants éditables).
      const defaultLines: CostSimulationLine[] = [
        {
          id: 'line-principal',
          label: 'Montant principal',
          montant: 0,
        },
      ];

      setLines(defaultLines);
      // Date suggérée : dans 7 jours ou fin de mois
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setDatePaiementPrevue(nextWeek.toISOString().split('T')[0]);
      setRappelActif(true);
    }
  }, [obligation, isOpen]);

  // Calcul du total cumulé
  const total = useMemo(() => {
    return lines.reduce((acc, line) => acc + (Number(line.montant) || 0), 0);
  }, [lines]);

  if (!isOpen || !obligation) return null;

  // Calcul dynamique de la majoration suggérée (10% du principal SAISI, jamais inventé)
  const principalLine = lines.find((l) => l.label.toLowerCase().includes('principal'));
  const currentPrincipal = principalLine ? principalLine.montant : 0;

  // Suggestions rapides prêtes à l'emploi basées sur les textes de l'obligation
  const suggestions = [
    {
      label: 'Montant principal',
      suggestedMontant: currentPrincipal > 0 ? currentPrincipal : 0,
    },
    {
      label: 'Majoration légale (10 %)',
      suggestedMontant: Math.round(currentPrincipal * 0.1) || 0,
    },
    {
      label: 'Intérêt de retard (1 % / mois)',
      suggestedMontant: Math.round(currentPrincipal * 0.01) || 0,
    },
    {
      label: 'Pénalité pour défaut de déclaration',
      suggestedMontant: 50000,
    },
    {
      label: 'Frais de dossier / téléservice',
      suggestedMontant: 5000,
    },
  ];

  const handleAddLine = (label = '', montant = 0) => {
    const newLine: CostSimulationLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: label || 'Autre frais ou droit',
      montant: montant || 0,
    };
    setLines((prev) => [...prev, newLine]);
  };

  const handleUpdateLine = (id: string, field: 'label' | 'montant', value: string | number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id === id) {
          return {
            ...line,
            [field]: field === 'montant' ? Math.max(0, Number(value) || 0) : value,
          };
        }
        return line;
      })
    );
  };

  const handleRemoveLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSave = () => {
    if (lines.length === 0) {
      alert('Veuillez ajouter au moins une ligne de coût.');
      return;
    }

    const simulation: CostSimulation = {
      lines,
      total,
      datePaiementPrevue: datePaiementPrevue || undefined,
      rappelActif,
      savedAt: new Date().toISOString(),
    };

    onSaveSimulation(obligation.id, simulation);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Voulez-vous supprimer cette simulation de coût ?')) {
      if (onDeleteSimulation) {
        onDeleteSimulation(obligation.id);
      }
      onClose();
    }
  };

  return (
    <div
      id="drawerCostSimulationOverlay"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="drawerCostSimulationPanel"
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header du Drawer */}
        <div className="p-5 sm:p-6 border-b border-[#E2E8F0] bg-[#FAFAFE] flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-[#EDEBF9] text-[#4F46A0] border border-[#D5D1F2]">
              <Calculator className="w-3.5 h-3.5" />
              <span>Simulateur de coût réel</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#1E293B] leading-snug m-0 truncate">
              {obligation.titre}
            </h3>
            <div className="text-xs text-[#64748B] flex flex-wrap items-center gap-2 pt-0.5">
              <span>{obligation.administration}</span>
              <span>•</span>
              <span className="font-semibold text-[#1E293B]">
                Échéance : {obligation.jour} {obligation.mois}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Fermer le simulateur"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Corps du Drawer (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Note sur les sanctions textuelles de l'obligation */}
          {obligation.penalitesDetail && (
            <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl p-3 text-xs text-[#991B1B] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Rappel des sanctions légales applicables :</span>
              </div>
              <p className="text-[11.5px] m-0 leading-relaxed font-medium">
                {obligation.penalitesDetail}
              </p>
            </div>
          )}

          {/* Chips de suggestions pré-remplies */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#4F46A0]" />
              <span>Suggestions rapides à insérer :</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddLine(sug.label, sug.suggestedMontant)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#F8FAFC] hover:bg-[#EDEBF9] text-[#475569] hover:text-[#3D3680] border border-[#E2E8F0] hover:border-[#CBD5E1] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-3 h-3 text-[#4F46A0]" />
                  <span>{sug.label}</span>
                  <span className="text-[#94A3B8] text-[10px]">
                    ({sug.suggestedMontant.toLocaleString('fr-FR')} F)
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Formulaire des lignes dynamiques */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
                Postes de coûts ({lines.length})
              </span>
              <button
                type="button"
                onClick={() => handleAddLine('', 0)}
                className="text-xs font-bold text-[#4F46A0] hover:text-[#3D3680] inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ajouter une ligne</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {lines.map((line, index) => (
                <div
                  key={line.id}
                  className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl transition-all focus-within:border-[#4F46A0] focus-within:bg-white"
                >
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={line.label}
                      onChange={(e) => handleUpdateLine(line.id, 'label', e.target.value)}
                      placeholder="Ex : Montant principal, Majoration 10%..."
                      className="w-full bg-transparent border-none text-xs font-semibold text-[#1E293B] placeholder-[#94A3B8] focus:outline-none"
                    />
                  </div>

                  <div className="w-32 sm:w-36 flex items-center gap-1 shrink-0 bg-white border border-[#CBD5E1] rounded-lg px-2 py-1">
                    <input
                      type="number"
                      value={line.montant === 0 ? '' : line.montant}
                      onChange={(e) => handleUpdateLine(line.id, 'montant', e.target.value)}
                      placeholder="0"
                      className="w-full text-right bg-transparent border-none text-xs font-black text-[#1E293B] focus:outline-none"
                    />
                    <span className="text-[10.5px] font-bold text-[#64748B]">FCFA</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveLine(line.id)}
                    className="w-7 h-7 rounded-lg text-[#94A3B8] hover:text-[#B91C1C] hover:bg-[#FEF2F2] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    title="Supprimer cette ligne"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {lines.length === 0 && (
              <div className="text-center py-6 border border-dashed border-[#CBD5E1] rounded-xl text-xs text-[#64748B] space-y-2">
                <p className="m-0">Aucun poste de coût ajouté.</p>
                <button
                  type="button"
                  onClick={() => handleAddLine('Montant principal', 0)}
                  className="text-xs font-bold text-[#4F46A0] hover:underline"
                >
                  Ajouter le montant principal
                </button>
              </div>
            )}
          </div>

          {/* Date de paiement prévue et Rappel automatique */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1E293B]">
              <Calendar className="w-4 h-4 text-[#4F46A0]" />
              <span>Date de paiement prévue</span>
            </div>

            <div className="space-y-2">
              <input
                id="inputDatePaiementPrevue"
                type="date"
                value={datePaiementPrevue}
                onChange={(e) => setDatePaiementPrevue(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs font-bold text-[#1E293B] focus:outline-none focus:border-[#4F46A0]"
              />

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rappelActif}
                  onChange={(e) => setRappelActif(e.target.checked)}
                  className="w-4 h-4 rounded text-[#4F46A0] focus:ring-[#4F46A0] cursor-pointer"
                />
                <span className="text-xs text-[#475569] font-medium flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#4F46A0]" />
                  <span>Déclencher un rappel automatique avant cette date</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* 3. Footer du Drawer : Total en gros & Boutons d'action */}
        <div className="p-5 sm:p-6 border-t border-[#E2E8F0] bg-white space-y-4">
          {/* Bloc Total mis en évidence (Inter 800) */}
          <div className="bg-[#171A2E] text-white rounded-2xl p-4 flex items-center justify-between gap-4 shadow-md">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                Coût réel total estimé
              </div>
              <div className="text-[11px] text-white/60 mt-0.5">
                {lines.length} poste{lines.length > 1 ? 's' : ''} pris en compte
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#34D399] leading-none">
                {total.toLocaleString('fr-FR')} <span className="text-base font-bold text-white/90">FCFA</span>
              </div>
            </div>
          </div>

          {/* Boutons d'action Enregistrer / Annuler */}
          <div className="flex items-center justify-between gap-3">
            {obligation.simulation ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs font-bold text-[#B91C1C] hover:text-[#991B1B] hover:bg-[#FEF2F2] px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Supprimer la simulation
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-[#64748B] hover:text-[#1E293B] px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E293B] text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                id="btnSaveCostSimulation"
                onClick={handleSave}
                className="bg-[#4F46A0] hover:bg-[#3D3680] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer ce coût</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
