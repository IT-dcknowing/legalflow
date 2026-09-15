/**
 * Résolution d'identité : WhatsApp phone → DC contact → Legal Flow user(s) →
 * entreprise(s). Ne devine JAMAIS : multi-entreprises ⇒ DC doit demander.
 */
const data = require('./data');

function publicProfile(p) {
  return {
    user_id: p.id,
    role: p.role,
    nom: p.nom_complet || null,
    entreprise_id: p.entreprise_id || null,
    cabinet_id: p.cabinet_id || null,
    statut: p.statut || null,
    whatsapp_optin: !!p.whatsapp_optin_at,
  };
}

function publicEntreprise(e) {
  if (!e) return null;
  return {
    entreprise_id: e.id,
    raison_sociale: e.raison_sociale,
    rccm: e.rccm || null,
    forme_juridique: e.forme_juridique || null,
    secteur: e.secteur || null,
    regime_fiscal: e.regime_fiscal || null,
    effectif: e.effectif ?? null,
    ca_estime: e.ca_estime ?? null,
    profil_complet: !!e.profil_complet,
  };
}

/**
 * Résout un numéro en contexte d'identité. Retourne TOUJOURS la liste des
 * entreprises candidates + multiple:true si >1. selected reste null :
 * c'est DC qui fait choisir l'utilisateur.
 */
async function resolveIdentity(phone) {
  if (data.backendStatus() !== 'ok') {
    return { backend: 'not_configured', phone, profiles: [], companies: [], multiple: false, selected: null };
  }
  const profiles = await data.findProfilesByPhone(phone);
  const companies = [];
  const seen = new Set();
  for (const p of profiles) {
    if (p.entreprise_id && !seen.has(p.entreprise_id)) {
      seen.add(p.entreprise_id);
      const e = await data.getEntreprise(p.entreprise_id);
      if (e) companies.push({ ...publicEntreprise(e), via: 'profil_direct' });
    }
    if (p.role === 'gestionnaire' && p.cabinet_id) {
      const managed = await data.getEntreprisesByCabinet(p.cabinet_id);
      for (const e of managed) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          companies.push({ ...publicEntreprise(e), via: 'cabinet' });
        }
      }
    }
  }
  // Repli : numéro présent sur la fiche entreprise elle-même.
  if (companies.length === 0) {
    try {
      const rows = await data.rest(
        'entreprises',
        `select=${'id,raison_sociale,rccm,forme_juridique,secteur,regime_fiscal,effectif,ca_estime,profil_complet'}&telephone=eq.${encodeURIComponent(phone)}`
      );
      for (const e of rows) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          companies.push({ ...publicEntreprise(e), via: 'fiche_entreprise' });
        }
      }
    } catch {
      /* table/colonne absente : on ignore ce repli */
    }
  }
  return {
    backend: 'ok',
    phone,
    profiles: profiles.map(publicProfile),
    companies,
    multiple: companies.length > 1,
    selected: null,
    instruction:
      companies.length > 1
        ? 'Plusieurs entreprises trouvées : demandez explicitement à l’utilisateur laquelle utiliser. Ne jamais choisir à sa place.'
        : companies.length === 1
        ? 'Entreprise unique : vous pouvez l’utiliser comme contexte.'
        : 'Aucune entreprise liée : proposez la création / le rattachement du dossier.',
  };
}

module.exports = { resolveIdentity, publicProfile, publicEntreprise };
