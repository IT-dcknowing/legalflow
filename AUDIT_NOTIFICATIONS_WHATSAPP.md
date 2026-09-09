# 🎯 RAPPORT D'AUDIT TECHNIQUE : MODULE DE NOTIFICATIONS & INTÉGRATION WHATSAPP — LEGAL FLOW CI

**Date d'audit :** Mars 2026
**Périmètre :** Cloud Function WhatsApp Business (`functions/index.js`, `functions/package.json`), Services Frontend & Notifications (`src/services/notifications.ts`, `src/App.tsx`), Modèle de données Supabase (`supabase/migrations/0008_ux_notifications_veille.sql`) et Intégration Meta Graph API.
**Auteur :** Auditeur Senior / SRE / Cybersecurity & Software Architect

---

## 📊 SYNTHÈSE EXÉCUTIVE & SCORE DE MATURITÉ

L'évaluation ciblée de la pile de notifications et de l'intégration WhatsApp de Legal Flow CI révèle un **système fonctionnel sur le plan fonctionnel/métier** (gestion du conversationnel RAG ivoirien, opt-in mobile, notifications in-app), mais présentant des **vulnérabilités de sécurité, des risques de défaillance silencieuse et des faiblesses d'architecture sévères**.

### Score de maturité du module : **38 / 100** (Statut : 🔴 **Action requise sous 14 jours**)

| Axe d'Évaluation | Score | Statut | Risque Majeur |
| :--- | :---: | :---: | :--- |
| **1. Dépendances & API WhatsApp** | 45/100 | 🟧 Moyen | Version API Meta en dur non-standard (`v26.0`), absence d'un SDK typé |
| **2. Webhooks, Idempotence & Retries** | 25/100 | 🟥 Critique | Absence totale d'idempotence (`wamid`), pas de retry/queue, bypass de signature HMAC en dev |
| **3. Observabilité & Défaillances Silencieuses** | 20/100 | 🟥 Critique | Échecs d'envoi WhatsApp masqués, logs bruts sans Sentry/Alertes, masquage des erreurs DB |
| **4. Tokens & Clés API** | 40/100 | 🟧 Moyen | Valeur de fallback `KeySoc26` en dur, token d'accès statique sans rotation automatisée |
| **5. Architecture & Découplage Providers** | 35/100 | 🟧 Moyen | Couplage fort Meta/Cloud Functions, absence d'interface `NotificationProvider` |
| **6. Qualité de Code, Tests & Rate Limits** | 30/100 | 🟥 Critique | Monolithe unifichier de +1170 lignes, zéro test d'échec réseau, absence de rate-limiting sortant |

---

## 🔍 ANALYSE DÉTAILLÉE PAR AXE

### 1. Dépendances liées à l'API WhatsApp (Business API & Libs)

#### Constats :
1. **Version d'API Graph Meta non-standard / obsolète (`v26.0`)** :
   - Dans `functions/index.js` (ligne 29) :
     ```javascript
     const META_API_VERSION = process.env.META_API_VERSION || 'v26.0';
     ```
   - Meta Graph API suit un cycle de versionnage semestriel (ex: `v18.0`, `v19.0`, `v20.0`...). Les versions majeures sont dépréciées après 2 ans. Indiquer `v26.0` en dur dans un fallback risque de provoquer une erreur HTTP 400/404 lorsque l'API Graph Meta valide le numéro de version.
2. **Absence de SDK typé ou maintenu** :
   - L'application effectue des requêtes `fetch` brutes non typées vers `https://graph.facebook.com/...` sans validation des schémas de réponse de Meta.
   - Les dépendances dans `functions/package.json` sont minimales :
     ```json
     "dependencies": {
       "express": "^4.21.2",
       "firebase-admin": "^12.7.0",
       "firebase-functions": "^5.1.1"
     }
     ```
   - Aucun SDK officiel (`@facebook/graph-sdk`) ni client communautaire éprouvé (ex: `whatsapp-cloud-api`, `@whiskeysockets/baileys` ou `@twilio/sdk` si migration) n'est utilisé pour encapsuler la gestion des payloads WhatsApp.

---

### 2. Gestion des Webhooks Entrants/Sortants (Retry, Idempotence & Signature HMAC)

#### Constats :
1. **Absence totale d'Idempotence sur les Webhooks entrants (Doublons WhatsApp)** :
   - Quand Meta envoie un webhook (dans `POST /webhook`, `functions/index.js` lignes 1125-1160), le serveur traite le message de façon **synchrone** pendant le cycle de requête HTTP.
   - Si le réseau ralentit ou si la réponse LLM prend plus de 3 secondes, Meta réexpédie le webhook (`retry`). Sans stockage ni vérification de l'identifiant unique du message Meta (`message.id` / `wamid`), Legal Flow traite le même message 2 ou 3 fois, générant **des doublons de réponses IA** facturés et perturbants pour l'utilisateur.
2. **Traitement synchrone bloquant sans File d'Attente (Queue)** :
   - Le webhook exécute la chaîne RAG + appel LLM OpenRouter (`processLegalFlowMessage`) en ligne avant de répondre 200 OK à Meta. Si OpenRouter prend 15 secondes, la Cloud Function risque le timeout (60s par défaut) ou la fermeture de connexion HTTP par Meta.
3. **Faille de bypass sur la Vérification de Signature HMAC SHA-256** :
   - Dans `functions/index.js` (lignes 47-51, 57-69) :
     ```javascript
     function signatureValide(req) {
       if (!WHATSAPP_APP_SECRET) {
         console.warn('[webhook] signature ignorée : aucun App Secret configuré.');
         return true; // ⚠️ TOUT LE MONDE PEUT INJECTER DES FAUX WEBHOOKS
       }
       ...
     }
     ```
   - Si la variable `WHATSAPP_APP_SECRET` manque ou n'est pas chargée en environnement, **la vérification de signature renvoie `true` par défaut**, exposant l'endpoint `/webhook` à des injections de faux messages sans authentification.
4. **Appels sortants (`sendWhatsAppMessage`) sans politique de Retry / Backoff** :
   - En cas d'erreur réseau éphémère ou d'erreur serveur Meta (500/503/429), `sendWhatsAppMessage` se contente de logger l'erreur et retourne `null` (lignes 1066-1069) sans aucune tentative de réessai (*exponential backoff*). Le message est définitivement perdu.

---

### 3. Points de Défaillance Silencieuse (Silent Failures & Observabilité)

#### Constats :
1. **Masquage complet des erreurs d'envoi WhatsApp** :
   - Dans `functions/index.js` (lignes 1045-1070) :
     ```javascript
     if (!r.ok) {
       const errText = await r.text().catch(() => '');
       console.error(`Erreur envoi WhatsApp HTTP ${r.status} :`, errText);
       return null;
     }
     ```
   - La fonction retourne `null`. L'appelant (`processLegalFlowMessage` ou `POST /optin`) ne lève aucune exception et l'utilisateur final ou l'administrateur n'est pas alerté (pas d'intégration Sentry, ni de métrique Prometheus/Cloud Monitoring).
2. **Gestion aveugle des statuts d'accusé de réception (`value.statuses`)** :
   - L'API Meta envoie des événements de statut (`sent`, `delivered`, `read`, `failed`).
   - Ligne 1139 : `console.log('Statut WhatsApp :', JSON.stringify(value.statuses));`.
   - Si un message WhatsApp échoue à être délivré (ex: numéro bloqué, numéro invalide, quota Meta dépassé), l'événement `failed` est simplement imprimé dans les logs `stdout` de Firebase sans aucune mise à jour en base de données ni alerte de non-distribution.
3. **Repli local silencieux dans le Frontend** :
   - Dans `src/services/notifications.ts` (ex: `fetchNotifications`, `getPreferences`, `getWhatsappState`), toutes les requêtes Supabase sont enveloppées dans des blocs `try/catch` vides :
     ```typescript
     } catch {
       /* repli local */
     }
     ```
   - Si la base de données Supabase subit une panne de permissions RLS ou une indisponibilité réseau, le frontend repasse silencieusement sur `localStorage` ou sur des données fictives (`mockGlobalNotifications`) sans en informer l'utilisateur.

---

### 4. Gestion des Tokens & Clés API WhatsApp (Stockage, Rotation, Exposition)

#### Constats :
1. **Secrets avec valeurs de fallback par défaut en dur** :
   - Dans `functions/index.js` (ligne 31) :
     ```javascript
     const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'KeySoc26';
     ```
   - En cas d'oubli de configuration de variable d'environnement lors du déploiement, le serveur retombe sur le token prédictible `'KeySoc26'`.
2. **Jeton d'accès Meta (System User Token) statique** :
   - `WHATSAPP_ACCESS_TOKEN` est un jeton d'accès permanent configuré dans les secrets Firebase.
   - Il n'y a aucun mécanisme de contrôle de validité/expiration, ni d'intégration avec un KMS (Key Management Service) ou Secret Manager pour effectuer une rotation automatisée des clés.
3. **Risque de fuite historisée** :
   - Mention expresse dans `ETAT_PROJET.txt` (ligne 205) : *"clés ayant transité en clair (token WhatsApp, clé Zen) ; recréer/nettoyer origin"*. Cela confirme que par le passé, des tokens d'accès WhatsApp ont été engagés dans l'historique Git ou des fichiers de dev.

---

### 5. Couplage Fort du Service de Notification & Difficulté de Changement de Provider

#### Constats :
1. **Verrouillage sur l'infrastructure Meta / Cloud Functions** :
   - Le frontend (`src/App.tsx`, ligne 648) appelle directement l'URL spécifique Cloud Functions :
     ```typescript
     const WHATSAPP_FUNCTIONS_BASE = 'https://us-central1-legalflowio.cloudfunctions.net/whatsappWebhook';
     ```
   - Le frontend est intimement couplé à la structure d'URL de Firebase Cloud Functions et à l'implémentation spécifique de WhatsApp.
2. **Absence d'abstraction "Notification Multi-Canal"** :
   - Le service `src/services/notifications.ts` gère principalement les notifications In-App Supabase et l'état local d'opt-in WhatsApp.
   - Il n'existe pas d'interface générique `NotificationAdapter` / `NotificationService` capable de router un message selon la préférence de l'utilisateur (ex: In-App, WhatsApp, SMS via Twilio/Orange, Email via Resend).
   - Basculer de WhatsApp Cloud API vers un agrégateur SMS local (Orange CI, MTN CI, Wave, Twilio) nécessiterait de réécrire la logique métier disséminée dans `functions/index.js` et `src/App.tsx`.

---

### 6. Qualité de Code, Coverage & Gestion des Rate Limits

#### Constats :
1. **Monolithe unifichier de +1170 lignes (`functions/index.js`)** :
   - `functions/index.js` accumule la configuration Express, la vérification HMAC, les corpus juridiques locaux, le moteur de recherche RAG, la mémoire de session conversationnelle, les prompts LLM, les appels OpenRouter, la validation de numéro ivoirien et la gestion du webhook Meta.
   - Ce manque de modularité empêche d'effectuer des tests unitaires ciblés sur le webhook ou le formateur de messages.
2. **Duplication de logique métier** :
   - Les fonctions de validation et de normalisation du numéro ivoirien (`normalizeIvorianPhone`, `isValidIvorianPhone`) sont dupliquées à la fois dans `src/services/notifications.ts` (lignes 13-20) et dans `functions/index.js` (lignes 1088-1093).
3. **Absence de gestion des Rate Limits WhatsApp (Meta Cloud API Limits)** :
   - Meta impose des limites de débit strictes (ex: Tier 1K = 1 000 destinataires uniques / 24h, débit maximal de 80 à 100 messages/sec selon l'abonnement).
   - L'endpoint `/notify` (lignes 1109-1122) permet de diffuser des messages de masse sans aucun régulateur de débit (*rate limiter / token bucket*), ce qui risque de provoquer un blocage du numéro de téléphone par Meta (error 131030 / 131048 / 131056).
4. **Absence de Suite de Tests Automatisés sur les Cas d'Échec Réseau** :
   - Aucun test unitaire ou d'intégration ne couvre `functions/index.js`. Les scénarios comme le rejet d'une signature HMAC invalide, la gestion d'un timeout HTTP d'OpenRouter, l'échec de distribution WhatsApp ou la gestion d'une charge de webhooks simultanés ne sont pas testés.

---

## 🎯 MATRICE DES RISQUES PRIORISÉE

```
+-----------------------------------------------------------------------------------+
| CRITICITÉ | PROBLÈME AUDITÉ                                      | IMPACT POTENTIEL|
+-----------+------------------------------------------------------+-----------------+
| 🔴 CRITIQUE| Défaut d'idempotence sur webhooks (`wamid`)           | Doublons de     |
|           | -> Traitement synchrone sans file d'attente          | réponses IA &   |
|           |                                                      | surcoûts        |
+-----------+------------------------------------------------------+-----------------+
| 🔴 CRITIQUE| Bypass possible de la signature HMAC (`WHATSAPP_SECRET`| Injection de    |
|           | manquant = signature valide par défaut)               | faux webhooks   |
+-----------+------------------------------------------------------+-----------------+
| 🔴 CRITIQUE| Erreurs d'envoi WhatsApp masquées silencieusement     | Non-délivrance  |
|           | (`console.error` sans alerte/Sentry/DB update)       | d'urgences      |
+-----------+------------------------------------------------------+-----------------+
| 🟧 ÉLEVÉ  | Monolithe `functions/index.js` (+1170 lignes) sans  | Dette technique,|
|           | tests unitaires d'échec réseau                      | instabilité     |
+-----------+------------------------------------------------------+-----------------+
| 🟧 ÉLEVÉ  | Version API Meta en dur `v26.0` & Secrets en dur     | Casse API Meta,|
|           | (`KeySoc26` fallback)                                | fuite de token  |
+-----------+------------------------------------------------------+-----------------+
| 🟡 MOYEN  | Absence d'interface d'abstraction Provider           | Impossibilité de|
|           | (Couplage direct Meta / Cloud Functions)             | changer de canal|
+-----------+------------------------------------------------------+-----------------+
```

---

## 🛠️ RECOMMANDATIONS CONCRÈTES & PLAN D'ACTION

### 1. Architecture Cible & Abstraction Multi-Providers (Découplage)

Créer une couche d'abstraction unifiée des canaux de notification :

```
                        +-----------------------------------+
                        |   Notification Dispatcher Engine  |
                        +-----------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
+---------------+                 +---------------+                 +---------------+
|  WhatsApp     |                 |  SMS Provider |                 | In-App / Push |
|  Adapter      |                 |  (Orange/MTN) |                 |  (Supabase)   |
+---------------+                 +---------------+                 +---------------+
```

- **Interface TypeScript cible (`src/services/notifications/types.ts`)** :
  ```typescript
  export interface NotificationPayload {
    recipient: string; // Téléphone ou User ID
    title?: string;
    body: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    metadata?: Record<string, unknown>;
  }

  export interface NotificationProvider {
    name: string;
    send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }>;
  }
  ```

---

### 2. Sécurisation & Rigueur sur les Webhooks WhatsApp

1. **Exiger la vérification de signature HMAC** :
   ```javascript
   function signatureValide(req) {
     if (!WHATSAPP_APP_SECRET) {
       console.error('[CRITICAL] WHATSAPP_APP_SECRET non configuré. Webhook bloqué.');
       return false; // 🔒 Refuser par défaut en production !
     }
     // Vérification timingSafeEqual...
   }
   ```
2. **Implémenter l'Idempotence avec Redis ou Firestore** :
   - Avant de traiter un message, vérifier si `wamid` (`message.id`) a déjà été enregistré.
   - Renvoyer immédiatement `200 OK` à Meta dès la vérification de signature, puis traiter le message en tâche de fond (Cloud Tasks / PubSub / Redis Queue).

---

### 3. Observabilité & Traitement des Échecs (Sentry + Callbacks)

1. **Capture des erreurs avec Sentry / Cloud Logging** :
   - Remplacer les simples `console.error` par des appels `Sentry.captureException(err)` ou une alerte structurée dans Cloud Monitoring.
2. **Prise en compte des événements `statuses` (Accusés de Réception)** :
   - Mettre à jour une table `whatsapp_logs` dans Supabase avec les états : `queued`, `sent`, `delivered`, `read`, `failed`.
   - En cas de statut `failed` (ex: code d'erreur Meta 131026 - num pas sur WhatsApp), basculer automatiquement la préférence utilisateur vers le SMS classique ou la notification In-App.

---

### 4. Gestion des Secrets & Versionnement API

1. **Suppression des Fallbacks en Dur** :
   - Supprimer le jeton par défaut `'KeySoc26'`. Le serveur doit lever un arrêt critique au démarrage (*fast-fail*) si `VERIFY_TOKEN` ou `WHATSAPP_APP_SECRET` est absent.
2. **Utilisation d'une version stable de Meta Graph API** :
   - Définir `META_API_VERSION = process.env.META_API_VERSION || 'v21.0'`.
3. **Stockage via Secret Manager** :
   - Migrer les secrets vers GCP Secret Manager (`firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN`).

---

### 5. Qualité de Code, Modularisation & Testabilité

1. **Refactorisation du Monolithe `functions/index.js`** :
   - Découper en plusieurs modules :
     - `functions/config.js` : Validation stricte des variables d'environnement.
     - `functions/middleware/verifySignature.js` : Sécurité HMAC.
     - `functions/services/whatsappService.js` : Envoi HTTP & retries.
     - `functions/services/ragEngine.js` : Logique conversationnelle.
2. **Ajout d'une Suite de Tests Automatisés (Vitest / Bun)** :
   - Écrire des tests unitaires pour la validation des signatures HMAC, la normalisation des numéros (+225), et le simulateur de reponses d'échec réseau (HTTP 429 / 500 Meta API).

---

## 📈 FEUILLE DE ROUTE DE REMÉDIATION PRIORISÉE

- [ ] **Semaine 1 (Urgent / Sécurité)** :
  - Corriger la vérification HMAC pour refuser les requêtes si `WHATSAPP_APP_SECRET` est absent.
  - Supprimer le fallback secret `'KeySoc26'`.
  - Fixer la version d'API Meta à `v21.0`.
  - Ajouter l'enregistrement de l'identifiant `wamid` pour supprimer les doublons de réponses IA.
- [ ] **Semaine 2 (Résilience & Observabilité)** :
  - Implémenter l'envoi asynchrone / file d'attente pour répondre `200 OK` sous 1s à Meta.
  - Tracker les accusés d'échec (`failed` status) dans Supabase.
  - Connecter Sentry sur les erreurs d'envoi WhatsApp.
- [ ] **Semaine 3 (Refactorisation & Architecture)** :
  - Découper `functions/index.js` en modules distincts.
  - Créer l'interface générique `NotificationProvider` dans le frontend.
  - Rédiger les tests unitaires couvrant les cas d'échec réseau de l'API Meta.
