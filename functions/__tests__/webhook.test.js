/**
 * Tests du webhook WhatsApp (audit : nominaux + échecs réseau/sécurité).
 * Natif node:test — aucune dépendance : depuis functions/,
 *   node --test __tests__/webhook.test.js
 * N'appelle ni Meta ni OpenRouter (logique pure + mémoire volatile).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// Secrets de test AVANT le require (lus au chargement du module).
process.env.WHATSAPP_APP_SECRET = 'secret-de-test-audit';
process.env.VERIFY_TOKEN = 'verify-test';

const t = require('../index.js').__test__;

function fakeReq(sig, body) {
  return { headers: { 'x-hub-signature-256': sig }, rawBody: Buffer.from(body) };
}

describe('signature HMAC', () => {
  const body = '{"object":"whatsapp_business_account"}';
  const good = 'sha256=' + crypto.createHmac('sha256', 'secret-de-test-audit').update(body).digest('hex');

  it('accepte une signature valide', () => {
    assert.equal(t.signatureValide(fakeReq(good, body)), true);
  });
  it('rejette une signature fausse', () => {
    const bad = 'sha256=' + crypto.createHmac('sha256', 'mauvais-secret').update(body).digest('hex');
    assert.equal(t.signatureValide(fakeReq(bad, body)), false);
  });
  it('rejette une signature absente', () => {
    assert.equal(t.signatureValide(fakeReq('', body)), false);
  });
});

describe('validation ivoirienne', () => {
  it('accepte +225 01/05/07', () => {
    assert.equal(t.isValidIvorianPhone('+2250701020304'), true);
    assert.equal(t.isValidIvorianPhone('+225 05 44 55 66 77'), true);
    assert.equal(t.isValidIvorianPhone('+2250144445566'), true);
  });
  it('rejette le reste', () => {
    assert.equal(t.isValidIvorianPhone('+2250901020304'), false);
    assert.equal(t.isValidIvorianPhone('0701020304'), false);
    assert.equal(t.isValidIvorianPhone(''), false);
  });
});

describe('idempotence wamid (anti-doublons Meta)', () => {
  it('un wamid marqué processing puis done n\'est plus retraité', async () => {
    const id = 'wamid.TEST.' + Date.now();
    assert.equal(await t.processedRecord(id), null);
    await t.markProcessed(id, { state: 'processing', from: '2250700000000' });
    const rec = await t.processedRecord(id);
    assert.ok(rec && rec.state === 'processing');
    await t.markProcessed(id, { state: 'done', from: '2250700000000' });
    const done = await t.processedRecord(id);
    assert.ok(done && done.state === 'done');
  });
});

describe('désambiguïsation IMF (scénario audit)', () => {
  it('tour 1 : intent échéance + sujet IMF, jamais ITS', () => {
    const s = t.blankConversationState();
    const upd = t.updateConversationState(s, "À quel moment on paie l'IMF ?");
    assert.equal(upd.intent.id, 'PAYMENT_DEADLINE');
    assert.equal(s.topic, 'Impôt minimum forfaitaire');
    assert.equal(t.needsClarification(upd, "À quel moment on paie l'IMF ?"), false);
  });
  it('tour 2 : correction conservée, priorité très élevée', () => {
    const s = t.blankConversationState();
    t.updateConversationState(s, "À quel moment on paie l'IMF ?");
    const upd = t.updateConversationState(s, "Je parle de l'impôt minimum forfaitaire");
    assert.equal(upd.isCorrection, true);
    assert.equal(s.conversation_stage, 'clarified');
    assert.equal(s.user_intent, 'PAYMENT_DEADLINE');
    assert.equal(s.corrections.at(-1).priority, 'tres_elevee');
    assert.match(t.buildConversationContext(s), /INTERDIT/);
  });
  it('acronyme nu : clarification, pas d\'invention', () => {
    const s = t.blankConversationState();
    const upd = t.updateConversationState(s, 'IMF ?');
    assert.equal(t.needsClarification(upd, 'IMF ?'), true);
    assert.match(t.buildClarificationReply(upd), /Impôt minimum forfaitaire/);
  });
  it('corpus : IMF devant, repli sans article inventé', () => {
    const docs = t.searchLocalCorpus('IMF impôt minimum forfaitaire', 3);
    assert.equal(docs[0].id, 'cgi-imf-forfaitaire');
    const fb = t.buildDeterministicExpertResponse('IMF ?', docs, '');
    const arts = fb.match(/Article \d+/g) || [];
    assert.ok(arts.every((a) => a === 'Article 115'), 'seul Article 115 (ITS réel) cité : ' + arts.join(','));
  });
});
