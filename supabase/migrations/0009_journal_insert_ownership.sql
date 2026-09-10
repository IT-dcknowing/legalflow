-- 0009 — journal_insert : l'entite_id doit appartenir à l'utilisateur (audit).
-- Appliquée en prod le 10/09/2026 (miroir local).
DROP POLICY IF EXISTS journal_insert ON journal_evenements;
CREATE POLICY journal_insert ON journal_evenements FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    entite_id IS NULL
    OR public.get_my_role() = 'super_admin'
    OR (entite_type IN ('entreprise', 'echeance') AND (
      entite_id = (SELECT entreprise_id FROM profiles WHERE id = auth.uid())
      OR entite_id IN (
        SELECT entreprise_id FROM cabinet_entreprises
        WHERE cabinet_id = (SELECT cabinet_id FROM profiles WHERE id = auth.uid())
      )
    ))
    OR (entite_type = 'cabinet' AND entite_id = (SELECT cabinet_id FROM profiles WHERE id = auth.uid()))
    OR (entite_type IS NOT NULL AND entite_type NOT IN ('entreprise', 'echeance', 'cabinet'))
  )
);
