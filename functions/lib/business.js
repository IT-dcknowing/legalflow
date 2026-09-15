/**
 * Capacités métier Legal Flow exposées à DC INTELLIGENCE (snapshots lecture).
 * Source unique de vérité : mêmes règles que le moteur frontal
 * (TVA 20, ITS/CNPS 15, CMU 1000, FDFP 1,6 %, seuils 50M/150M).
 * Versionné (ENGINE_VERSION) pour détecter toute divergence.
 */
const ENGINE_VERSION = 'legal-rules-2026.1';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function monthlyDeadlines(year, month /* 0-based */) {
  // Échéances mensuelles récurrentes (jours légaux).
  return [
    { id: 'ITS', titre: 'ITS — retenues sur salaires', jour: 15, administration: 'DGI', domaine: 'fiscal' },
    { id: 'CNPS', titre: 'Cotisations CNPS', jour: 15, administration: 'CNPS', domaine: 'social' },
    { id: 'FDFP', titre: 'Contributions FDFP (1,6 %)', jour: 15, administration: 'DGI/FDFP', domaine: 'social' },
    { id: 'TVA', titre: 'TVA 18 % — déclaration mensuelle', jour: 20, administration: 'DGI', domaine: 'fiscal' },
    { id: 'CMU', titre: 'Cotisations CMU (1 000 F/salarié)', jour: 15, administration: 'CNAM', domaine: 'social' },
  ].map((o) => ({ ...o, dateIso: `${year}-${String(month + 1).padStart(2, '0')}-${String(o.jour).padStart(2, '0')}` }));
}

function statusOf(dateIso, ref) {
  const d = startOfDay(new Date(dateIso + 'T00:00:00'));
  const diff = Math.round((d - startOfDay(ref)) / 86400000);
  if (diff < 0) return { statut: 'en_retard', joursRetard: -diff };
  if (diff <= 7) return { statut: 'imminente', joursRestants: diff };
  return { statut: 'a_venir', joursRestants: diff };
}

/**
 * Snapshot des obligations d'une entreprise à une date de référence.
 * Inclut mois précédent (retards éventuels), mois courant et mois prochain.
 */
function obligationsSnapshot(entreprise, refDate) {
  const ref = refDate ? new Date(refDate) : new Date();
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const months = [new Date(y, m - 1, 1), new Date(y, m, 1), new Date(y, m + 1, 1)];
  const obligations = [];
  for (const dt of months) {
    for (const o of monthlyDeadlines(dt.getFullYear(), dt.getMonth())) {
      obligations.push({ ...o, ...statusOf(o.dateIso, ref) });
    }
  }
  return {
    engine: ENGINE_VERSION,
    entreprise_id: entreprise ? entreprise.entreprise_id || entreprise.id || null : null,
    regime_fiscal: entreprise ? entreprise.regime_fiscal || null : null,
    date_reference: ref.toISOString().slice(0, 10),
    obligations,
  };
}

function splitSnapshot(snap) {
  const overdue = snap.obligations.filter((o) => o.statut === 'en_retard');
  const upcoming = snap.obligations
    .filter((o) => o.statut !== 'en_retard')
    .sort((a, b) => (a.dateIso < b.dateIso ? -1 : 1));
  return { overdue, upcoming };
}

function complianceSnapshot(snap) {
  const total = snap.obligations.length;
  const late = snap.obligations.filter((o) => o.statut === 'en_retard').length;
  const score = total === 0 ? 100 : Math.round(((total - late) / total) * 100);
  const next = snap.obligations
    .filter((o) => o.statut !== 'en_retard')
    .sort((a, b) => (a.dateIso < b.dateIso ? -1 : 1))[0] || null;
  return {
    engine: ENGINE_VERSION,
    score_conformite: score,
    en_retard: late,
    total_suivi: total,
    prochaine_echeance: next,
    date_reference: snap.date_reference,
  };
}

/** Pièces manquantes probables (heuristique profil + obligations en retard). */
function missingDocuments(entreprise, snap) {
  const missing = [];
  if (!entreprise) return missing;
  if (!entreprise.rccm) missing.push({ document: 'RCCM', raison: 'immatriculation introuvable au profil' });
  if (!entreprise.profil_complet) {
    if (!entreprise.forme_juridique) missing.push({ document: 'Forme juridique', raison: 'critère RSI manquant' });
    if (entreprise.effectif == null) missing.push({ document: 'Effectif salarié', raison: 'calcul CNPS/CMU/FDFP' });
    if (entreprise.ca_estime == null) missing.push({ document: "Chiffre d'affaires estimé", raison: 'seuils 50M/150M' });
  }
  const late = (snap ? snap.obligations : []).filter((o) => o.statut === 'en_retard');
  for (const o of late.slice(0, 5)) {
    missing.push({ document: `Quittance ${o.id} (${o.dateIso})`, raison: 'échéance en retard' });
  }
  return missing;
}

const DOC_ROUTES = [
  { type: 'facture_fournisseur', vers: 'comptabilite', systeme: 'Compta Flow', indices: ['facture', 'fournisseur', 'invoice', 'montant', 'tva'] },
  { type: 'avis_fiscal', vers: 'legal', systeme: 'Legal Flow', indices: ['impot', 'tva', 'cnps', 'dgi', 'avis', 'mise en demeure', 'quittance', 'attestation'] },
  { type: 'releve_bancaire', vers: 'rapprochement', systeme: 'RECO', indices: ['releve', 'banque', 'solde', 'mouvement'] },
  { type: 'contrat', vers: 'legal', systeme: 'Legal Flow', indices: ['contrat', 'convention', 'embauche'] },
];

/**
 * Intake d'une extraction VLM structurée (DC a déjà lu le visuel).
 * Legal Flow ne fait PAS de vision : il classe et route uniquement.
 */
function classifyIntake(extract) {
  const text = JSON.stringify(extract || {}).toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const route of DOC_ROUTES) {
    let score = 0;
    for (const kw of route.indices) if (text.includes(kw)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = route;
    }
  }
  if (!best || bestScore === 0) {
    return { type: 'inconnu', vers: 'accueil', systeme: 'DC INTELLIGENCE', confiance: 'faible', action_suivante: 'demander_precision_utilisateur' };
  }
  return {
    type: best.type, vers: best.vers, systeme: best.systeme,
    confiance: bestScore >= 3 ? 'haute' : 'moyenne',
    action_suivante:
      best.vers === 'legal'
        ? 'lf_search_docs (base légale) puis wa_prepare_message (accusé)'
        : 'transmettre_extract_systeme_cible',
  };
}

module.exports = {
  ENGINE_VERSION,
  obligationsSnapshot,
  splitSnapshot,
  complianceSnapshot,
  missingDocuments,
  classifyIntake,
};
