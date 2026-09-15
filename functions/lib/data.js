/**
 * Accès contrôlé aux données Legal Flow pour les outils MCP/DC.
 * RÈGLE ABSOLUE : aucune base (Firestore/Supabase) n'est exposée au LLM.
 * Tout passe par ces fonctions typées, journalisées, sans jamais renvoyer
 * de credential. Lecture via SUPABASE_SERVICE_ROLE_KEY (serveur uniquement).
 * Sans la clé : dégradation explicite { backend: 'not_configured' }.
 */
const supabaseUrl = () => (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function backendStatus() {
  if (!supabaseUrl() || !serviceKey()) return 'not_configured';
  return 'ok';
}

async function rest(table, query) {
  if (backendStatus() !== 'ok') {
    const err = new Error('backend_not_configured');
    err.code = 'BACKEND_NOT_CONFIGURED';
    throw err;
  }
  const key = serviceKey();
  const r = await fetch(`${supabaseUrl()}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: 'Bearer ' + key },
  });
  if (!r.ok) {
    const err = new Error('supabase_http_' + r.status);
    err.code = 'SUPABASE_HTTP_' + r.status;
    throw err;
  }
  return r.json();
}

const PROFILE_COLS = 'id,role,nom_complet,email,cabinet_id,entreprise_id,statut,whatsapp_number,whatsapp_optin_at,created_at';
const ENTREPRISE_COLS = 'id,raison_sociale,rccm,forme_juridique,secteur,regime_fiscal,effectif,ca_estime,profil_complet,email_contact,telephone,noms_salaries,masse_salariale,created_at';

async function findProfilesByPhone(phone) {
  return rest('profiles', `select=${PROFILE_COLS}&whatsapp_number=eq.${encodeURIComponent(phone)}`);
}

async function getEntreprise(id) {
  const rows = await rest('entreprises', `select=${ENTREPRISE_COLS}&id=eq.${id}`);
  return rows[0] || null;
}

async function getEntreprisesByCabinet(cabinetId) {
  const links = await rest('cabinet_entreprises', `select=entreprise_id&cabinet_id=eq.${cabinetId}`);
  const out = [];
  for (const l of links.slice(0, 50)) {
    const e = await getEntreprise(l.entreprise_id);
    if (e) out.push(e);
  }
  return out;
}

async function listStoragePaths(bucket, prefix) {
  if (backendStatus() !== 'ok') {
    const err = new Error('backend_not_configured');
    err.code = 'BACKEND_NOT_CONFIGURED';
    throw err;
  }
  const key = serviceKey();
  const r = await fetch(`${supabaseUrl()}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix: prefix || '', limit: 100 }),
  });
  if (!r.ok) {
    const err = new Error('storage_http_' + r.status);
    err.code = 'STORAGE_HTTP_' + r.status;
    throw err;
  }
  return r.json();
}

module.exports = {
  backendStatus,
  rest,
  findProfilesByPhone,
  getEntreprise,
  getEntreprisesByCabinet,
  listStoragePaths,
};
