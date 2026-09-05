-- 0006 — PEN-029 (adapté) : index sur les requêtes RLS récurrentes.
-- Appliqué via MCP le 2026-09-05 (migration pen029_performance_indexes).
-- Les tables documents/gestion_entreprise/notifications n'existent PAS en
-- production (schéma legacy jamais appliqué) : leurs index sont sans objet.
-- Les FK existantes sont déjà ON DELETE CASCADE / SET NULL par conception.
CREATE INDEX IF NOT EXISTS idx_chatbot_user_updated
  ON chatbot_conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_user_created
  ON journal_evenements (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entite
  ON journal_evenements (entite_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cabinet_entreprises_cabinet
  ON cabinet_entreprises (cabinet_id);
