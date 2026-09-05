-- 0004 — PEN-016 (prérequis) : inserts inscription + verrou re-link.
-- Appliqué via MCP le 2026-09-05 (migration pen016_inscription_policies).
-- Ordre d'inscription : signUp → INSERT profiles (profiles_insert) →
-- INSERT entreprises/cabinets → UPDATE profiles (premier lien).
-- Le trigger n'autorise la mutation entreprise_id/cabinet_id que si l'ancienne
-- valeur est NULL (premier lien), ou super_admin, ou SQL direct opérateur.

DROP POLICY IF EXISTS entreprises_insert_inscription ON entreprises;
CREATE POLICY entreprises_insert_inscription ON entreprises FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS cabinets_insert_inscription ON cabinets;
CREATE POLICY cabinets_insert_inscription ON cabinets FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION forbid_role_statut_escalation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role OR OLD.statut IS DISTINCT FROM NEW.statut THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF OLD.id = auth.uid() THEN
      RAISE EXCEPTION 'Modification du role/statut interdite sur votre propre profil';
    END IF;
    IF get_my_role() != 'super_admin' THEN
      RAISE EXCEPTION 'Seul super_admin peut modifier role/statut';
    END IF;
  END IF;
  IF OLD.entreprise_id IS DISTINCT FROM NEW.entreprise_id
     OR OLD.cabinet_id IS DISTINCT FROM NEW.cabinet_id THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF OLD.id = auth.uid()
       AND OLD.entreprise_id IS NULL AND OLD.cabinet_id IS NULL THEN
      RETURN NEW;
    END IF;
    IF get_my_role() = 'super_admin' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Rattachement entreprise/cabinet non modifiable';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_lock_role_statut ON profiles;
CREATE TRIGGER trg_lock_role_statut BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION forbid_role_statut_escalation();
