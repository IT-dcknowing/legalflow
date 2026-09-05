-- 0005 — PEN-022 (BDD-003) : seuil de similarité 0.45 dans match_documents.
-- Appliqué via MCP le 2026-09-05 (migration pen022_match_threshold).
-- Constat : l'index est DÉJÀ HNSW en production (BDD-002 sans objet),
-- la table contient 8005 documents tous avec embedding. Signature live
-- conservée (id bigint, match_count défaut 5).
CREATE OR REPLACE FUNCTION public.match_documents(query_embedding vector, match_count integer DEFAULT 5)
RETURNS TABLE(id bigint, contenu text, reference_article text, source_fichier text, similarity double precision)
LANGUAGE plpgsql AS $function$
begin
  return query
  select
    documents_juridiques.id,
    documents_juridiques.contenu,
    documents_juridiques.reference_article,
    documents_juridiques.source_fichier,
    1 - (documents_juridiques.embedding <=> query_embedding) as similarity
  from documents_juridiques
  where documents_juridiques.embedding IS NOT NULL
    and (1 - (documents_juridiques.embedding <=> query_embedding)) > 0.45
  order by documents_juridiques.embedding <=> query_embedding
  limit match_count;
end;
$function$;
