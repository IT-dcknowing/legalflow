-- 0001 — Connexion & utilisateurs réels : enum, tables, RLS, bucket preuves.
-- Appliqué via MCP le 2026-09-05 (migration create_auth_connexion_utilisateurs).
-- Note : l'INSERT du bucket a été exécuté séparément (DML) :
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('preuves','preuves', false) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin','gestionnaire','entreprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cabinets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raison_sociale text NOT NULL, ville text, agrement text,
  created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS entreprises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raison_sociale text NOT NULL, rccm text, forme_juridique text,
  secteur text, regime_fiscal text, effectif int, ca_estime numeric,
  profil_complet boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS cabinet_entreprises (
  cabinet_id uuid NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  entreprise_id uuid NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  PRIMARY KEY (cabinet_id, entreprise_id));

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'entreprise',
  nom_complet text, email text,
  cabinet_id uuid REFERENCES cabinets(id) ON DELETE SET NULL,
  entreprise_id uuid REFERENCES entreprises(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titre text,
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS journal_evenements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entite_type text,
  entite_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now());

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabinet_entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_evenements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_my_role() RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER AS
$$ SELECT role FROM profiles WHERE id = auth.uid() $$;

DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid()
  OR get_my_role() = 'super_admin'
  OR (get_my_role() = 'gestionnaire' AND cabinet_id =
      (SELECT cabinet_id FROM profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS entreprises_select ON entreprises;
CREATE POLICY entreprises_select ON entreprises FOR SELECT USING (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'entreprise' AND id =
      (SELECT entreprise_id FROM profiles WHERE id = auth.uid()))
  OR (get_my_role() = 'gestionnaire' AND id IN (
      SELECT ce.entreprise_id FROM cabinet_entreprises ce
      WHERE ce.cabinet_id = (SELECT cabinet_id FROM profiles WHERE id = auth.uid()))));

DROP POLICY IF EXISTS entreprises_insert ON entreprises;
CREATE POLICY entreprises_insert ON entreprises FOR INSERT WITH CHECK (
  get_my_role() = 'super_admin' OR get_my_role() = 'gestionnaire');

DROP POLICY IF EXISTS entreprises_update ON entreprises;
CREATE POLICY entreprises_update ON entreprises FOR UPDATE USING (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'entreprise' AND id =
      (SELECT entreprise_id FROM profiles WHERE id = auth.uid()))
  OR (get_my_role() = 'gestionnaire' AND id IN (
      SELECT ce.entreprise_id FROM cabinet_entreprises ce
      WHERE ce.cabinet_id = (SELECT cabinet_id FROM profiles WHERE id = auth.uid()))));

DROP POLICY IF EXISTS cabinet_entreprises_all ON cabinet_entreprises;
CREATE POLICY cabinet_entreprises_all ON cabinet_entreprises FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS cabinet_entreprises_lecture_cabinet ON cabinet_entreprises;
CREATE POLICY cabinet_entreprises_lecture_cabinet ON cabinet_entreprises FOR SELECT USING (
  get_my_role() = 'gestionnaire' AND cabinet_id =
      (SELECT cabinet_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS chat_own ON chatbot_conversations;
CREATE POLICY chat_own ON chatbot_conversations FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS journal_select ON journal_evenements;
CREATE POLICY journal_select ON journal_evenements FOR SELECT USING (
  user_id = auth.uid()
  OR get_my_role() = 'super_admin'
  OR (get_my_role() = 'gestionnaire' AND entite_id IN (
      SELECT ce.entreprise_id FROM cabinet_entreprises ce
      WHERE ce.cabinet_id = (SELECT cabinet_id FROM profiles WHERE id = auth.uid()))));

DROP POLICY IF EXISTS journal_insert ON journal_evenements;
CREATE POLICY journal_insert ON journal_evenements FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS preuves_insert ON storage.objects;
CREATE POLICY preuves_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'preuves' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS preuves_select ON storage.objects;
CREATE POLICY preuves_select ON storage.objects FOR SELECT
  USING (bucket_id = 'preuves' AND auth.role() = 'authenticated');
