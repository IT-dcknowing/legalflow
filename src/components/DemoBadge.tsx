import React from 'react';
import { FlaskConical } from 'lucide-react';

/**
 * Badge « Données de démonstration » (revue conformité : les pages
 * Opportunités / Veille / Bibliothèque affichent un contenu statique
 * non connecté à une base temps réel — l'utilisateur doit le savoir
 * avant toute décision).
 */
export const DemoBadge: React.FC<{ label?: string }> = ({
  label = 'Données de démonstration — ne pas utiliser pour décider',
}) => (
  <span
    title={label}
    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#B06000] bg-[#FEF3D6] border border-[#FAD98D] px-2 py-0.5 rounded-full"
  >
    <FlaskConical className="w-3 h-3" />
    <span>Démo</span>
  </span>
);
