/**
 * Webhook WhatsApp Business — Legal Flow (Prompts 1 + 2).
 *
 * GET  /webhook : vérification Meta (hub.mode / hub.verify_token / hub.challenge).
 * POST /webhook : valide X-Hub-Signature-256, parse les messages, répond via
 *                 l'IA Legal Flow (processLegalFlowMessage) + API WhatsApp.
 *                 Répond TOUJOURS 200 OK à Meta (sinon retries).
 *
 * Secrets JAMAIS en dur : tout passe par l'environnement (.env local gitignoré,
 * variables déployées via `firebase functions:config` / Secret Manager, voir .env.example).
 */
const functions = require('firebase-functions');
const express = require('express');
const crypto = require('crypto');
// Note : firebase-admin sera initialisé quand on persistera l'historique
// (Firestore, Prompt 2). Pas d'admin.initializeApp() ici : sans credentials,
// il bloque le cold start en appelant le serveur de métadonnées Google.

const app = express();
// Conserve le corps brut pour la vérification HMAC (le JSON parsé ne suffit pas).
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'KeySoc26';
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const META_API_VERSION = process.env.META_API_VERSION || 'v26.0';
// Endpoint optionnel de l'IA Legal Flow (serveur Express /api/chat). Si absent,
// processLegalFlowMessage utilise la réponse de test (Prompt 2, option 3).
const LEGALFLOW_API_URL = process.env.LEGALFLOW_API_URL || '';
const LEGALFLOW_API_TOKEN = process.env.LEGALFLOW_API_TOKEN || '';

if (!process.env.VERIFY_TOKEN) {
  console.warn('[webhook] VERIFY_TOKEN non défini : repli local KeySoc26 (dev uniquement).');
}
if (!WHATSAPP_APP_SECRET) {
  console.warn('[webhook] WHATSAPP_APP_SECRET non défini : signature NON vérifiée (dev uniquement).');
}

/**
 * Vérifie l'en-tête X-Hub-Signature-256 (HMAC-SHA256 du corps brut).
 * Sans secret configuré (dev local) : accepte en loggant un avertissement.
 */
function signatureValide(req) {
  if (!WHATSAPP_APP_SECRET) {
    console.warn('[webhook] signature ignorée : aucun App Secret configuré.');
    return true;
  }
  const sig = req.headers['x-hub-signature-256'] || '';
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', WHATSAPP_APP_SECRET).update(req.rawBody || Buffer.alloc(0)).digest('hex');
  if (!sig || sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// --- Vérification du webhook (GET) ---
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook vérifié avec succès !');
    res.status(200).send(challenge);
  } else {
    console.warn('[webhook] vérification refusée (mode/token invalide).');
    res.sendStatus(403);
  }
});

// --- Traitement du message avec l'IA Legal Flow (Prompt 2) ---
async function processLegalFlowMessage(from, text) {
  const question = (text || '').slice(0, 1000);
  try {
    // Option 1 : interroger l'API Legal Flow déployée (recommandé en prod).
    if (LEGALFLOW_API_URL) {
      const headers = { 'Content-Type': 'application/json' };
      if (LEGALFLOW_API_TOKEN) headers.Authorization = `Bearer ${LEGALFLOW_API_TOKEN}`;
      const r = await fetch(`${LEGALFLOW_API_URL.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: question, dossierContext: 'Question reçue via WhatsApp.' }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data && data.reply) return String(data.reply).slice(0, 4000);
      }
      console.warn(`[webhook] API Legal Flow HTTP ${r.status}, repli local.`);
    }
    // Option 3 : réponse de test (pas d'IA branchée).
    return (
      `🤖 Legal Flow : Merci pour votre question fiscale.\n` +
      `Notre équipe analyse : "${question}".\n` +
      `Pour une réponse complète, contactez-nous au +225 XX XX XX XX.`
    );
  } catch (error) {
    console.error('Erreur IA :', error && error.message ? error.message : error);
    return "⚠️ Désolé, une erreur technique s'est produite. Veuillez réessayer.";
  }
}

// --- Envoyer un message via l'API WhatsApp (Prompt 2) ---
async function sendWhatsAppMessage(to, text) {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.warn('[webhook] envoi ignoré : WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN manquants.');
    return null;
  }
  const url = `https://graph.facebook.com/${META_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: String(text).slice(0, 4000) },
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    console.error(`Erreur envoi WhatsApp HTTP ${r.status} :`, errText);
    return null;
  }
  const data = await r.json().catch(() => ({}));
  console.log('Message envoyé :', JSON.stringify(data));
  return data;
}

// --- Réception des messages (POST) ---
app.post('/webhook', async (req, res) => {
  if (!signatureValide(req)) {
    console.warn('[webhook] signature invalide, requête rejetée.');
    return res.sendStatus(401);
  }
  try {
    const body = req.body || {};
    const value = body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0]
      ? body.entry[0].changes[0].value
      : null;
    const messages = (value && value.messages) || [];
    // Log des statuts (delivered/read) sans traitement.
    if (value && value.statuses) {
      console.log('Statut WhatsApp :', JSON.stringify(value.statuses));
    }
    for (const message of messages) {
      const from = message.from;
      const text = message.text && message.text.body ? message.text.body : '';
      const type = message.type || 'unknown';
      console.log(`Message reçu de ${from} (type=${type}) : ${text}`);
      if (!from) continue;
      if (message.text && text) {
        const reply = await processLegalFlowMessage(from, text);
        await sendWhatsAppMessage(from, reply);
      } else {
        console.log(`[webhook] message non-texte ignoré (type=${type}).`);
      }
    }
  } catch (error) {
    console.error('Erreur traitement webhook :', error && error.message ? error.message : error);
  }
  // Toujours 200 OK à Meta (évite les retries), même en cas d'erreur interne.
  return res.sendStatus(200);
});

// Exposer la fonction (URL : https://[REGION]-legalflowio.cloudfunctions.net/whatsappWebhook/webhook)
exports.whatsappWebhook = functions.https.onRequest(app);
