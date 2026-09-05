<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/97c7b6a6-4858-41f7-bb93-6a7bb93928ce

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `bun install` (ou `npm install`)
2. Copier `.env.example` vers `.env` et renseigner les clés (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`).
3. Run the app:
   `bun run dev` (ou `npm run dev`) → http://localhost:3000

## Embedder offline (optionnel, PEN-032)

Par défaut les poids Xenova sont téléchargés depuis HuggingFace au premier appel.
Pour un démarrage sans réseau externe :

1. `bun run download:embedder` (~30 Mo dans `server/models/`, ignoré par git)
2. Ajouter `EMBEDDER_LOCAL_PATH=./server/models` dans `.env`
3. En Docker : `COPY server/models ./server/models`
