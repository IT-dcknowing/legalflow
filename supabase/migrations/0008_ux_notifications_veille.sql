-- ============================================================================
-- 0008 — Cahier des charges UX & Notifications : opt-in WhatsApp, notifications,
-- veille réglementaire, préférences, bandeau maintenance.
-- (Miroir local de la migration appliquée en prod le 08/09/2026.)
-- ============================================================================

-- 1. Opt-in WhatsApp sur profiles ------------------------------------------------
alter table public.profiles
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_optin_at timestamptz,
  add column if not exists whatsapp_popup_dismissals integer not null default 0;

-- 2. Champs profil exigés par le CDC §4 ------------------------------------------------
alter table public.entreprises
  add column if not exists noms_salaries text,
  add column if not exists masse_salariale numeric;

-- 3. Notifications (in-app) -------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  contenu text not null,
  type text not null check (type in ('generale','alerte','rappel','information','mise_a_jour','veille','opportunite')),
  criticite text not null default 'basse' check (criticite in ('basse','moyenne','haute','critique')),
  cible text not null default 'tous' check (cible in ('tous','entreprise')),
  entreprise_id uuid references public.entreprises(id) on delete cascade,
  envoye_par uuid references public.profiles(id) on delete set null,
  date_envoi timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((cible = 'tous' and entreprise_id is null) or (cible = 'entreprise' and entreprise_id is not null))
);

create table if not exists public.notifications_lues (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lu_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

-- 4. Préférences (critiques non désactivables = pas de colonnes) -------------------
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  veille boolean not null default true,
  opportunites boolean not null default true,
  maj_app boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 5. Veille réglementaire ------------------------------------------------------------
create table if not exists public.veille_notes (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  contenu text not null,
  categorie text not null default 'generale',
  statut text not null default 'brouillon' check (statut in ('brouillon','publie','archive')),
  is_global_broadcast boolean not null default true,
  pieces text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_global_broadcast = true) or (is_global_broadcast = false))
);

create table if not exists public.veille_entreprises (
  note_id uuid not null references public.veille_notes(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  primary key (note_id, entreprise_id)
);

create table if not exists public.veille_lectures (
  note_id uuid not null references public.veille_notes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lu_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

-- 6. Bandeau maintenance (piloté par le super admin) ---------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (key, value)
values ('maintenance_banner', '{"active": false, "message": ""}'::jsonb)
on conflict (key) do nothing;

-- 7. RLS --------------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.notifications_lues enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.veille_notes enable row level security;
alter table public.veille_entreprises enable row level security;
alter table public.veille_lectures enable row level security;
alter table public.app_settings enable row level security;

create policy "notifications_select"
  on public.notifications for select to authenticated
  using (
    public.get_my_role() = 'super_admin'
    or (
      date_envoi <= now()
      and (
        cible = 'tous'
        or entreprise_id = (select p.entreprise_id from public.profiles p where p.id = (select auth.uid()))
      )
    )
  );
create policy "notifications_manage_admin"
  on public.notifications for all to authenticated
  using (public.get_my_role() = 'super_admin')
  with check (public.get_my_role() = 'super_admin');

create policy "notifications_lues_own"
  on public.notifications_lues for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notification_preferences_own"
  on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "veille_notes_select"
  on public.veille_notes for select to authenticated
  using (
    public.get_my_role() = 'super_admin'
    or (
      statut = 'publie'
      and (
        is_global_broadcast = true
        or exists (
          select 1 from public.veille_entreprises ve
          where ve.note_id = veille_notes.id
            and ve.entreprise_id = (select p.entreprise_id from public.profiles p where p.id = (select auth.uid()))
        )
      )
    )
  );
create policy "veille_notes_manage_admin"
  on public.veille_notes for all to authenticated
  using (public.get_my_role() = 'super_admin')
  with check (public.get_my_role() = 'super_admin');

create policy "veille_entreprises_select"
  on public.veille_entreprises for select to authenticated
  using (true);
create policy "veille_entreprises_manage_admin"
  on public.veille_entreprises for all to authenticated
  using (public.get_my_role() = 'super_admin')
  with check (public.get_my_role() = 'super_admin');

create policy "veille_lectures_own"
  on public.veille_lectures for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "app_settings_select"
  on public.app_settings for select to authenticated
  using (true);
create policy "app_settings_manage_admin"
  on public.app_settings for all to authenticated
  using (public.get_my_role() = 'super_admin')
  with check (public.get_my_role() = 'super_admin');

-- 8. Exposition Data API ---------------------------------------------------------------
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.notifications_lues to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.veille_notes to authenticated;
grant select, insert, update, delete on public.veille_entreprises to authenticated;
grant select, insert, update, delete on public.veille_lectures to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;

-- 9. Bucket "veille" public (JO, circulaires) -------------------------------------------
insert into storage.buckets (id, name, public)
values ('veille', 'veille', true)
on conflict (id) do update set public = true;

create policy "veille_bucket_read_public"
  on storage.objects for select to public
  using (bucket_id = 'veille');
create policy "veille_bucket_write_admin"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'veille' and public.get_my_role() = 'super_admin');
create policy "veille_bucket_update_admin"
  on storage.objects for update to authenticated
  using (bucket_id = 'veille' and public.get_my_role() = 'super_admin')
  with check (bucket_id = 'veille' and public.get_my_role() = 'super_admin');
create policy "veille_bucket_delete_admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'veille' and public.get_my_role() = 'super_admin');
