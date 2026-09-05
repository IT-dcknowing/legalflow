/**
 * PEN-032 — Pré-télécharge les poids Xenova pour un démarrage sans HuggingFace.
 * Usage : bun run download:embedder
 * Les poids atterrissent dans server/models/ (ignoré par git, copié par Docker).
 * Puis EMBEDDER_LOCAL_PATH=./server/models dans .env pour le mode offline.
 */
import fs from 'fs';

const MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const TARGET_DIR = './server/models/paraphrase-multilingual-MiniLM-L12-v2';

async function main(): Promise<void> {
  const { pipeline } = await import('@xenova/transformers');
  console.log(`Téléchargement ${MODEL_ID} → ${TARGET_DIR} ...`);
  await pipeline('feature-extraction', MODEL_ID, { cache_dir: './server/models' } as any);
  const files = fs.existsSync(TARGET_DIR) ? fs.readdirSync(TARGET_DIR) : [];
  console.log(`OK : ${files.length} fichiers dans ${TARGET_DIR}`);
  console.log('Ajoutez EMBEDDER_LOCAL_PATH=./server/models dans .env pour le mode offline.');
}

main().catch((err) => {
  console.error('Échec du téléchargement :', err);
  process.exit(1);
});
