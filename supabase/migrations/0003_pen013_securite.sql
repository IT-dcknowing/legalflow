-- 0003 — PEN-013 : verrou anti auto-promotion + statuts + contacts.
-- Appliqué via MCP le 2026-09-05 (migration pen013_securite_profils_journal
-- + lock_role_statut_trigger).
--
-- Leçon apprise (vérifiée par tests API) : un WITH CHECK qui compare NEW à
-- get_my_role()/get_my_statut() ne bloque RIEN, car la fonction lit la ligne
-- en cours de modification (NEW = NEW, toujours vrai). Le verrou est donc
-- porté par un TRIGGER BEFORE UPDATE (OLD/NEW explicites) :
--   - modification role/statut sur sa propre ligne via l'API : TOUJOURS refusée
--     (y compris pour super_admin ; passer par SQL direct opérateur) ;
--   - modification par super_admin sur la ligne d'un AUTRE : autorisée ;
--   - SQL direct sans JWT (dashboard/service_role, auth.uid() NULL) : autorisé.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'actif'
  CHECK (statut IN ('actif','en_attente','suspendu'));

ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS nom_gestionnaire text;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS num_agrement text;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS type_cabinet text;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS email_contact text;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS date_activation timestamptz;

ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS email_contact text;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS telephone text;

CREATE OR REPLACE FUNCTION get_my_statut() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS
$$ SELECT statut FROM profiles WHERE id = auth.uid() $$;

-- INSERT self uniquement, jamais super_admin, statut imposé par rôle.
DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (
  id = auth.uid()
  AND role != 'super_admin'
  AND ((role = 'entreprise' AND statut = 'actif')
    OR (role = 'gestionnaire' AND statut = 'en_attente')));

-- UPDATE self (lignes autres que role/statut) ; le trigger verrouille role/statut.
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- UPDATE admin : super_admin mute role + statut des autres.
DROP POLICY IF EXISTS profiles_update_admin ON profiles;
CREATE POLICY profiles_update_admin ON profiles FOR UPDATE
  USING (get_my_role() = 'super_admin') WITH CHECK (true);

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
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_lock_role_statut ON profiles;
CREATE TRIGGER trg_lock_role_statut BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION forbid_role_statut_escalation();
