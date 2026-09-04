import { CompanyProfile, Obligation, OpportunityItem, FlashVeille } from '../types';

export interface RoutedAiContext {
  intent: 'fiscal' | 'social' | 'douane' | 'audit' | 'optimisation' | 'general';
  contextSlices: string[];
  dossierSummary: string;
}

/**
 * Routeur sémantique d'intention & extracteur contextuel (Frontend)
 * Détecte les intentions de la question et sélectionne les tranches pertinentes du dossier.
 */
export function routeAiContext(
  query: string,
  companyProfile: CompanyProfile,
  obligations: Obligation[],
  opportunities: OpportunityItem[],
  flashs: FlashVeille[]
): RoutedAiContext {
  const lower = query.toLowerCase();
  const contextSlices: string[] = [];
  let intent: RoutedAiContext['intent'] = 'general';

  // 1. Détection sémantique d'intention
  const isFiscal =
    lower.includes('tva') ||
    lower.includes('impot') ||
    lower.includes('impôt') ||
    lower.includes('dgi') ||
    lower.includes('rsi') ||
    lower.includes('rme') ||
    lower.includes('reel') ||
    lower.includes('réel') ||
    lower.includes('its') ||
    lower.includes('bic') ||
    lower.includes('e-impots') ||
    lower.includes('e-impôt') ||
    lower.includes('quittance') ||
    lower.includes('penalite') ||
    lower.includes('pénalité') ||
    lower.includes('chiffre d') ||
    lower.includes('seuil');

  const isSocial =
    lower.includes('cnps') ||
    lower.includes('cmu') ||
    lower.includes('salaire') ||
    lower.includes('paie') ||
    lower.includes('cotisation') ||
    lower.includes('embauche') ||
    lower.includes('disa') ||
    lower.includes('retraite') ||
    lower.includes('accident') ||
    lower.includes('smig') ||
    lower.includes('contrat');

  const isOptimisation =
    lower.includes('cga') ||
    lower.includes('fdfp') ||
    lower.includes('credit') ||
    lower.includes('crédit') ||
    lower.includes('reduction') ||
    lower.includes('réduction') ||
    lower.includes('optimisation') ||
    lower.includes('formation') ||
    lower.includes('economie') ||
    lower.includes('économie');

  const isDouane =
    lower.includes('douane') ||
    lower.includes('import') ||
    lower.includes('export') ||
    lower.includes('bsc') ||
    lower.includes('sydonia') ||
    lower.includes('transit');

  const isAudit =
    lower.includes('audit') ||
    lower.includes('conformite') ||
    lower.includes('conformité') ||
    lower.includes('score') ||
    lower.includes('controle') ||
    lower.includes('contrôle') ||
    lower.includes('risque');

  if (isFiscal) intent = 'fiscal';
  else if (isSocial) intent = 'social';
  else if (isOptimisation) intent = 'optimisation';
  else if (isDouane) intent = 'douane';
  else if (isAudit) intent = 'audit';

  // 2. Sélection des tranches du dossier
  // Tranche Entreprise (toujours incluse en base)
  contextSlices.push(
    `Entreprise: ${companyProfile.raisonSociale} | RCCM: ${companyProfile.rccm} | NCC: ${companyProfile.ncc} | Régime: ${companyProfile.regimeFiscal} | Secteur: ${companyProfile.secteurActivite} | Centre: ${companyProfile.centreImpots}`
  );

  // Tranche Salariés & Masse salariale si pertinent
  if (isSocial || isFiscal || lower.includes('salar') || lower.includes('cout') || lower.includes('coût')) {
    contextSlices.push(
      `Effectif: ${companyProfile.effectifSalaries} salariés déclarés | Affiliés CMU: ${companyProfile.salariesCmuAffilies} | Masse salariale annuelle déclarée: ${companyProfile.masseSalarialeAnnuelle?.toLocaleString('fr-FR')} FCFA`
    );
  }

  // Tranche Chiffre d'Affaires & Seuil RSI
  if (isFiscal || isAudit || lower.includes('seuil') || lower.includes('ca')) {
    const ca = companyProfile.chiffreAffairesEstime || 142_500_000;
    const pct = Math.round((ca / 150_000_000) * 100);
    contextSlices.push(
      `Chiffre d'affaires estimé 2026: ${ca.toLocaleString('fr-FR')} FCFA (${pct}% du plafond RSI de 150M FCFA). Risque de bascule automatique au Réel Normal en cas de dépassement.`
    );
  }

  // Tranche Échéances en retard & imminentes
  const retards = obligations.filter((o) => o.statut === 'en_retard');
  const imminentes = obligations.filter((o) => o.statut === 'imminente');

  if (retards.length > 0) {
    contextSlices.push(
      `Échéances actuellement EN RETARD (${retards.length}): ` +
        retards
          .map(
            (r) =>
              `${r.titre} (${r.administration}, ${r.echeanceLabel}, sanction légale: ${r.penalitesDetail || r.baseLegale})`
          )
          .join(' ; ')
    );
  }

  if (imminentes.length > 0) {
    contextSlices.push(
      `Échéances IMMINENTES: ` +
        imminentes
          .slice(0, 3)
          .map((m) => `${m.titre} (${m.administration}, due le ${m.jour}/${m.mois})`)
          .join(' ; ')
    );
  }

  // Tranche Optimisations / CGA / FDFP
  if (isOptimisation || isFiscal || lower.includes('cga') || lower.includes('fdfp')) {
    const cgaOpt = opportunities.find((o) => o.name.toLowerCase().includes('cga'));
    const fdfpOpt = opportunities.find((o) => o.name.toLowerCase().includes('fdfp'));
    contextSlices.push(
      `Statut CGA: ${companyProfile.adhesionCga ? 'Adhérent actif (' + companyProfile.cgaNom + ')' : 'Non adhérent'} (Abattement fiscal 20-25% sur bénéfice). Dispositif FDFP: éligible au remboursement des plans de formation jusqu'à 0.6% de la masse salariale.`
    );
  }

  // Tranche Veille applicable
  const veillesApplicables = flashs.filter((f) => f.isApplicableDossier).slice(0, 2);
  if (veillesApplicables.length > 0 && (isFiscal || isSocial || isAudit)) {
    contextSlices.push(
      `Veille légale active: ` +
        veillesApplicables.map((v) => `${v.title} (${v.texteRef || 'Annexe Fiscale 2026'})`).join(' ; ')
    );
  }

  const dossierSummary = contextSlices.join('\n');

  return {
    intent,
    contextSlices,
    dossierSummary,
  };
}
