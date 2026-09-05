/**
 * Converters entity ↔ profile centralisés (PEN-027 COD-002).
 * Source unique : plus de duplication dans App.tsx.
 */
import type { CompanyEntity, CompanyProfile } from '../types';
import type { DbEntreprise } from '../services/supabaseClient';
import { initialCompanyProfile } from '../data/mockData';

export function entityToProfile(ent: CompanyEntity): CompanyProfile {
  return {
    ...initialCompanyProfile,
    id: ent.id,
    nom: ent.name,
    raisonSociale: ent.raisonSociale || ent.name,
    formeJuridique: ent.formeJuridique,
    secteurActivite: ent.secteurActivite,
    secteur: ent.secteurActivite,
    regimeFiscal: ent.regimeFiscal,
    chiffreAffairesEstime: ent.caEstime,
    effectif: `${ent.effectif || 0} salariés`,
    effectifSalaries: ent.effectif || 0,
    adhesionCga: ent.adhesionCga,
    adherentCGA: ent.adhesionCga ? 'Oui — CGA Agréé' : 'Non',
    rccm: ent.numeroRccm || '',
    numeroCnps: ent.numeroCnps || '',
    numeroCC: ent.numeroCc || '',
    ncc: ent.numeroCc || '',
    centreImpots: ent.centreImpots || 'CDI Plateau',
    profilComplet: ent.profilComplet,
  };
}

export function dbEntrepriseToEntity(r: DbEntreprise): CompanyEntity {
  return {
    id: r.id,
    name: r.raison_sociale,
    raisonSociale: r.raison_sociale,
    formeJuridique: r.forme_juridique || '',
    secteurActivite: r.secteur || '',
    regimeFiscal: r.regime_fiscal || '',
    caEstime: Number(r.ca_estime) || 0,
    effectif: r.effectif || 0,
    adhesionCga: false,
    cgaNom: '',
    numeroCnps: '',
    numeroRccm: r.rccm || '',
    numeroCc: '',
    secteurGeographique: '',
    profilComplet: r.profil_complet,
    createdBy: '',
    createdAt: '',
    centreImpots: 'CDI —',
  };
}
