/**
 * Tests du contrat DC INTELLIGENCE ↔ Legal Flow (backend métier).
 * Natif node:test : `node --test __tests__/dc-contract.test.js` depuis functions/.
 * Aucun réseau : logique pure + dégradation explicite sans clé service_role.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const business = require('../lib/business');
const tasks = require('../lib/tasks');
const identity = require('../lib/identity');
const data = require('../lib/data');

describe('moteur snapshot métier (legal-rules-2026.1)', () => {
  const ent = { entreprise_id: 'e1', regime_fiscal: 'RSI' };
  const snap = business.obligationsSnapshot(ent, '2026-09-15');

  it('15 obligations (3 mois x 5), version taguée', () => {
    assert.equal(snap.engine, 'legal-rules-2026.1');
    assert.equal(snap.obligations.length, 15);
  });
  it('TVA 20/09 imminente (J+5), ITS 15/09 imminente (J0), août en retard', () => {
    const tva = snap.obligations.find((o) => o.id === 'TVA' && o.dateIso === '2026-09-20');
    assert.equal(tva.statut, 'imminente');
    assert.equal(tva.joursRestants, 5);
    const its = snap.obligations.find((o) => o.id === 'ITS' && o.dateIso === '2026-09-15');
    assert.equal(its.statut, 'imminente');
    const late = snap.obligations.filter((o) => o.statut === 'en_retard');
    assert.equal(late.length, 5);
  });
  it('conformité 67 (5 retards / 15)', () => {
    const c = business.complianceSnapshot(snap);
    assert.equal(c.score_conformite, 67);
    assert.equal(c.en_retard, 5);
    assert.equal(c.prochaine_echeance.dateIso, '2026-09-15');
  });
  it('pièces manquantes : RCCM + critères + quittances des retards', () => {
    const missing = business.missingDocuments({ rccm: null, profil_complet: false }, snap);
    assert.ok(missing.some((m) => m.document === 'RCCM'));
    assert.ok(missing.some((m) => /Quittance ITS/.test(m.document)));
  });
});

describe('intake documentaire VLM (classification sans vision)', () => {
  it('facture → comptabilité', () => {
    const v = business.classifyIntake({ type: 'invoice', text: 'facture fournisseur montant 500000 TVA' });
    assert.equal(v.vers, 'comptabilite');
    assert.equal(v.systeme, 'Compta Flow');
  });
  it('avis fiscal → legal', () => {
    const v = business.classifyIntake({ type: 'doc', text: "avis d'impot mise en demeure" });
    assert.equal(v.vers, 'legal');
    assert.equal(v.systeme, 'Legal Flow');
  });
  it('vide → inconnu, jamais de devinette', () => {
    const v = business.classifyIntake({});
    assert.equal(v.type, 'inconnu');
    assert.equal(v.action_suivante, 'demander_precision_utilisateur');
  });
});

describe('enveloppe tâche uniforme', () => {
  function fakeDb() {
    const store = new Map();
    let n = 0;
    const doc = (id) => ({
      get: async () => ({ exists: store.has(id), data: () => store.get(id) }),
      update: async (patch) => store.set(id, { ...store.get(id), ...patch }),
    });
    return {
      collection: () => ({
        add: async (d) => {
          const id = 't' + ++n;
          store.set(id, d);
          return { id, ...doc(id) };
        },
        doc,
      }),
    };
  }
  it('inline → done avec résultat', async () => {
    const db = fakeDb();
    const out = await tasks.createTask(db, 3000, 'demo', { a: 1 }, async () => ({ ok: true }));
    assert.equal(out.status, 'done');
    assert.deepEqual(out.result, { ok: true });
    const back = await tasks.getTaskResult(db, 3000, out.taskId);
    assert.equal(back.status, 'done');
  });
  it('inconnue → unknown', async () => {
    const back = await tasks.getTaskResult(fakeDb(), 3000, 'nope');
    assert.equal(back.status, 'unknown');
  });
});

describe('identité : jamais de devinette', () => {
  it('sans clé service : dégradation explicite, selected null', async () => {
    assert.equal(data.backendStatus(), 'not_configured');
    const id = await identity.resolveIdentity('+2250700000000');
    assert.equal(id.backend, 'not_configured');
    assert.equal(id.selected, null);
    assert.equal(id.multiple, false);
  });
  it('multi-entreprises : liste + instruction de demander', async () => {
    const origFind = data.findProfilesByPhone;
    const origGet = data.getEntreprise;
    const origCab = data.getEntreprisesByCabinet;
    data.findProfilesByPhone = async () => [
      { id: 'u1', role: 'gestionnaire', nom_complet: 'X', entreprise_id: null, cabinet_id: 'c1', statut: 'actif' },
    ];
    data.getEntreprisesByCabinet = async () => [
      { id: 'e1', raison_sociale: 'A' },
      { id: 'e2', raison_sociale: 'B' },
    ];
    data.getEntreprise = async () => null;
    // Forcer le statut backend pour ce test
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
    let id;
    try {
      // Recharger avec env présent : backendStatus lit process.env à chaque appel
      id = await identity.resolveIdentity('+2250700000000');
    } finally {
      data.findProfilesByPhone = origFind;
      data.getEntreprise = origGet;
      data.getEntreprisesByCabinet = origCab;
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
    assert.equal(id.multiple, true);
    assert.equal(id.selected, null);
    assert.equal(id.companies.length, 2);
    assert.match(id.instruction, /demandez explicitement/i);
  });
});
