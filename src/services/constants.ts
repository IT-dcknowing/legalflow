/** Constantes métier centralisées (PEN-028 COD-003) : plus de magic numbers. */

// Échéances mensuelles DGI/CNPS
export const DEFAULT_TAX_DUE_DAY = 15;
export const TVA_DUE_DAY = 20;
export const IRVM_DUE_DAY = 31;
export const CMU_DUE_DAY = 10;

// Seuils d'effectif Code du Travail (délégués > 10, CHSCT > 50)
export const EFFECTIF_DELEGUES_SEUIL = 11;
export const EFFECTIF_CHSCT_SEUIL = 51;

// RAG / embeddings
export const EMBEDDING_DIM = 384;

// Score de conformité : pénalité par retard, pondérée (facteur max 2)
export const SCORE_PENALITE_BASE = 8;
export const SCORE_PENALITE_MAX_FACTEUR = 2;

// Simulateur / RAG
export const RAG_DEFAULT_LIMIT = 6;
export const CHAT_MAX_TOKENS = 1500;
export const CHAT_TEMPERATURE = 0.3;
