-- 0002 — Correctif anti-récursion RLS sur profiles_select.
-- Appliqué via MCP le 2026-09-05 (migration fix_rls_recursion_profiles).
-- Problème : la sous-requête directe sur profiles dans sa propre policy
-- provoquait « infinite recursion detected in policy for relation profiles »
-- (HTTP 500 sur toutes les requêtes authentifiées).
-- Correctif : helper SECURITY DEFINER get_my_cabinet_id() (contourne RLS).

CREATE OR REPLACE FUNCTION get_my_cabinet_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS
$$ SELECT cabinet_id FROM profiles WHERE id = auth.uid() $$;

DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid()
  OR get_my_role() = 'super_admin'
  OR (get_my_role() = 'gestionnaire' AND cabinet_id = get_my_cabinet_id()));
