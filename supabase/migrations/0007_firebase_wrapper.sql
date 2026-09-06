-- 0007 — Wrapper Firebase Auth (lecture seule) via supabase/wrappers.
-- Appliqué via MCP le 2026-09-06 (migration firebase_auth_wrapper).
-- Le handler firebase_fdw_handler est fourni par l'extension wrappers.
-- BLOQUÉ à l'usage : la lecture exige sa_key_id (clé service Firebase dans
-- Vault). Voir kanban PEN-037 pour la procédure côté consoles.
CREATE SCHEMA IF NOT EXISTS firebase;

DO $$ BEGIN
  CREATE FOREIGN DATA WRAPPER firebase_wrapper
    HANDLER extensions.firebase_fdw_handler
    VALIDATOR extensions.firebase_fdw_validator;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE SERVER firebase_auth_server
    FOREIGN DATA WRAPPER firebase_wrapper
    OPTIONS (project_id 'legalflowio');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP FOREIGN TABLE IF EXISTS firebase.users;
CREATE FOREIGN TABLE firebase.users (
  uid TEXT,
  email TEXT,
  created_at TIMESTAMP,
  attrs JSONB
)
SERVER firebase_auth_server
OPTIONS (object 'Users');
