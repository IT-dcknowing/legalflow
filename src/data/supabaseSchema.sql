-- ==============================================================================
-- 📋 ARCHITECTURE DE BASE DE DONNÉES SUPABASE — SYSTÈME D'HABILITATIONS LEGAL FLOW
-- 3 Niveaux : Super Admin, Gestionnaire (Multi-entreprises), Utilisateur (Mono-entreprise)
-- Tables, Triggers automatiques (profil_complet) & Politiques RLS (Row Level Security)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE USERS (Extension de auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'gestionnaire', 'entreprise')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLE ENTREPRISES
CREATE TABLE IF NOT EXISTS public.entreprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    forme_juridique VARCHAR(50),                     -- SARL, SA, SAS, EI, etc.
    secteur_activite VARCHAR(100) NOT NULL,          -- BTP, Commerce, Industrie, Services
    regime_fiscal VARCHAR(50),                       -- RME, RSI, Réel Normal, etc.
    ca_estime NUMERIC(15,2) DEFAULT 0,               -- Chiffre d'affaires estimé en FCFA
    effectif INTEGER DEFAULT 0,                      -- Nombre de salariés
    adresse_adhesion_cga BOOLEAN DEFAULT false,      -- Adhésion CGA (Centre de Gestion Agréé)
    numero_cnps VARCHAR(50),
    numero_rccm VARCHAR(50),
    numero_cc VARCHAR(50),                           -- Compte Contribuable DGI
    secteur_geographique VARCHAR(100),               -- Abidjan, San Pedro, Bouaké...
    profil_complet BOOLEAN DEFAULT false NOT NULL,   -- TRUE si tous les 5 champs obligatoires sont renseignés
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLE GESTION_ENTREPRISE (Liaison Multi-entreprises & switch actif)
CREATE TABLE IF NOT EXISTS public.gestion_entreprise (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
    role_dans_entreprise VARCHAR(50) DEFAULT 'gestionnaire' CHECK (role_dans_entreprise IN ('proprietaire', 'gestionnaire', 'membre')),
    entreprise_active BOOLEAN DEFAULT false NOT NULL, -- Entreprise actuellement sélectionnée pour le switch
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_entreprise UNIQUE (user_id, entreprise_id)
);

-- Index pour accélérer le switch d'entreprise
CREATE INDEX idx_gestion_active ON public.gestion_entreprise(user_id, entreprise_active);

-- 5. TABLE DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    titre VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('quittance', 'attestation', 'declaration', 'autre')),
    domaine VARCHAR(50) NOT NULL CHECK (domaine IN ('fiscal', 'social', 'administratif', 'commerce', 'industrie')),
    url_fichier VARCHAR(500) NOT NULL,
    taille_fichier INTEGER DEFAULT 0,
    date_document DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLE NOTIFICATIONS (Globales ou ciblées)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titre VARCHAR(255) NOT NULL,
    contenu TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('general', 'alerte', 'rappel', 'information', 'mise_a_jour')),
    cible VARCHAR(50) NOT NULL CHECK (cible IN ('tous', 'par_secteur', 'par_regime', 'individuelle')),
    secteur_cible VARCHAR(100),
    regime_cible VARCHAR(50),
    entreprise_cible UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
    envoye_par UUID REFERENCES public.users(id) ON DELETE SET NULL,
    date_envoi TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABLE NOTIFICATIONS_LUES
CREATE TABLE IF NOT EXISTS public.notifications_lues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lu_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_notification UNIQUE (notification_id, user_id)
);

-- 8. TABLE AUDITS (Réalisés par Super Admin)
CREATE TABLE IF NOT EXISTS public.audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
    auditeur_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date_audit TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    score_conformite INTEGER CHECK (score_conformite BETWEEN 0 AND 100),
    score_optimisation INTEGER CHECK (score_optimisation BETWEEN 0 AND 100),
    rapport_url VARCHAR(500),
    statut VARCHAR(50) DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'termine', 'annule')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- ⚙️ TRIGGER AUTOMATIQUE : CALCUL DU PROFIL COMPLET
-- profil_complet = TRUE si :
-- forme_juridique + secteur_activite + regime_fiscal + effectif (>0) + ca_estime (>0)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_check_profil_complet()
RETURNS TRIGGER AS $$
BEGIN
    NEW.profil_complet := (
        NEW.forme_juridique IS NOT NULL AND TRIM(NEW.forme_juridique) <> '' AND
        NEW.secteur_activite IS NOT NULL AND TRIM(NEW.secteur_activite) <> '' AND
        NEW.regime_fiscal IS NOT NULL AND TRIM(NEW.regime_fiscal) <> '' AND
        COALESCE(NEW.effectif, 0) > 0 AND
        COALESCE(NEW.ca_estime, 0) > 0
    );
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcul_profil_complet ON public.entreprises;
CREATE TRIGGER trg_calcul_profil_complet
    BEFORE INSERT OR UPDATE ON public.entreprises
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_check_profil_complet();

-- ==============================================================================
-- 🔒 POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestion_entreprise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_lues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Helper pour vérifier le rôle Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'super_admin'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- RÈGLE 1 : ENTREPRISES (Super Admin voit tout, Gestionnaire/User voient les leurs)
CREATE POLICY "Super admin voit toutes les entreprises"
    ON public.entreprises FOR ALL
    USING (public.is_super_admin());

CREATE POLICY "Gestionnaire et Utilisateur voient leurs entreprises"
    ON public.entreprises FOR SELECT
    USING (
        id IN (SELECT entreprise_id FROM public.gestion_entreprise WHERE user_id = auth.uid())
    );

CREATE POLICY "Gestionnaire et Super Admin peuvent créer des entreprises"
    ON public.entreprises FOR INSERT
    WITH CHECK (
        public.is_super_admin() OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('gestionnaire', 'entreprise'))
    );

CREATE POLICY "Gestionnaire et User peuvent modifier leurs entreprises"
    ON public.entreprises FOR UPDATE
    USING (
        public.is_super_admin() OR
        id IN (SELECT entreprise_id FROM public.gestion_entreprise WHERE user_id = auth.uid())
    );

-- RÈGLE 2 : DOCUMENTS (Accessible aux membres de l'entreprise)
CREATE POLICY "Super admin voit tous les documents"
    ON public.documents FOR ALL
    USING (public.is_super_admin());

CREATE POLICY "Utilisateurs voient les documents de leurs entreprises"
    ON public.documents FOR SELECT
    USING (
        entreprise_id IN (SELECT entreprise_id FROM public.gestion_entreprise WHERE user_id = auth.uid())
    );

CREATE POLICY "Upload document permis pour les membres autorisés"
    ON public.documents FOR INSERT
    WITH CHECK (
        public.is_super_admin() OR
        entreprise_id IN (SELECT entreprise_id FROM public.gestion_entreprise WHERE user_id = auth.uid())
    );

-- RÈGLE 3 : NOTIFICATIONS (Super admin crée, les autres lisent ce qui les concerne)
CREATE POLICY "Super admin gère les notifications"
    ON public.notifications FOR ALL
    USING (public.is_super_admin());

CREATE POLICY "Utilisateurs lisent les notifications ciblées"
    ON public.notifications FOR SELECT
    USING (
        cible = 'tous' OR
        (cible = 'par_secteur' AND secteur_cible IN (
            SELECT secteur_activite FROM public.entreprises e
            JOIN public.gestion_entreprise ge ON ge.entreprise_id = e.id
            WHERE ge.user_id = auth.uid()
        )) OR
        (cible = 'par_regime' AND regime_cible IN (
            SELECT regime_fiscal FROM public.entreprises e
            JOIN public.gestion_entreprise ge ON ge.entreprise_id = e.id
            WHERE ge.user_id = auth.uid()
        )) OR
        (cible = 'individuelle' AND entreprise_cible IN (
            SELECT entreprise_id FROM public.gestion_entreprise WHERE user_id = auth.uid()
        ))
    );

-- RÈGLE 4 : AUDITS (Créés uniquement par Super Admin, consultés par les concernés)
CREATE POLICY "Super admin gère les audits"
    ON public.audits FOR ALL
    USING (public.is_super_admin());

CREATE POLICY "Entreprises consultent leurs audits"
    ON public.audits FOR SELECT
    USING (
        entreprise_id IN (SELECT entreprise_id FROM public.gestion_entreprise WHERE user_id = auth.uid())
    );

-- ==============================================================================
-- 📚 9. TABLE DOCUMENTS_JURIDIQUES (RAG pgvector 384 dimensions & RPC match_documents)
-- 8 005 extraits de textes officiels (CGI, CNPS, CMU, FDFP, Code du Travail, OHADA)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.documents_juridiques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_fichier VARCHAR(255) NOT NULL,
    reference_article VARCHAR(255) NOT NULL,
    contenu TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index vectoriel IVFFlat ou HNSW pour recherche ultra-rapide par similarité cosinus (<=>)
CREATE INDEX IF NOT EXISTS idx_documents_juridiques_embedding
    ON public.documents_juridiques USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Fonction RPC 'match_documents' appelée par server/legalRagEngine.ts
CREATE OR REPLACE FUNCTION public.match_documents (
    query_embedding vector(384),
    match_count int DEFAULT 6
)
RETURNS TABLE (
    id UUID,
    source_fichier VARCHAR(255),
    reference_article VARCHAR(255),
    contenu TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.source_fichier,
        d.reference_article,
        d.contenu,
        (1 - (d.embedding <=> query_embedding))::float AS similarity
    FROM public.documents_juridiques d
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

