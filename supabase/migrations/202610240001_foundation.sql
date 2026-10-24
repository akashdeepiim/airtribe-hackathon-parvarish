-- Child-scoped authorisation is evaluated from live membership, not JWT metadata.
create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.member_role as enum ('owner','co_parent','family_contributor','family_viewer');
create type public.consent_purpose as enum ('memories','milestones','health','personalisation','notifications');
create type public.verification_method as enum ('self_declaration','digilocker','token');
create type public.consent_decision as enum ('granted','declined','withdrawn');
create type public.capability as enum (
  'profile.read','profile.edit','memories.read','memories.add','memories.edit_own','memories.edit_all',
  'memories.delete_own','memories.delete_all','milestones.read','milestones.write',
  'activities.read','activities.feedback','family.read','family.manage','health.read','health.write','audit.read'
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text, email text, display_name text not null default '', city text not null default 'Bangalore',
  created_at timestamptz not null default now()
);
create table public.children (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) between 1 and 80),
  dob date not null check (dob <= current_date), sex text check (sex in ('female','male','intersex')),
  avatar_path text, city text not null default 'Bangalore', interests text[] not null default '{}',
  created_by uuid not null references public.users(id), created_at timestamptz not null default now(), deleted_at timestamptz,
  check (cardinality(interests) <= 20),
  check (avatar_path is null or split_part(avatar_path,'/',1) = id::text)
);
create table public.child_members (
  child_id uuid references public.children(id) on delete cascade, user_id uuid references public.users(id) on delete cascade,
  role public.member_role not null, relationship text not null default 'Family' check (length(relationship) between 1 and 60),
  invited_by uuid references public.users(id), status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default now(), primary key(child_id,user_id)
);
create unique index one_owner_per_child on public.child_members(child_id) where role = 'owner';
create index members_by_user on public.child_members(user_id,child_id) where status = 'active';
create table public.role_permissions (
  role public.member_role, capability public.capability, primary key(role,capability)
);
insert into public.role_permissions select 'owner', unnest(enum_range(null::public.capability));
insert into public.role_permissions select 'co_parent', unnest(enum_range(null::public.capability));
insert into public.role_permissions select 'family_viewer', unnest(array['profile.read','memories.read','family.read']::public.capability[]);
insert into public.role_permissions select 'family_contributor', unnest(array['profile.read','memories.read','family.read','memories.add','memories.edit_own','memories.delete_own']::public.capability[]);
create table public.child_member_permissions (
  child_id uuid, user_id uuid, capability public.capability, allowed boolean not null,
  granted_by uuid not null references public.users(id), updated_at timestamptz not null default now(),
  primary key(child_id,user_id,capability),
  foreign key(child_id,user_id) references public.child_members(child_id,user_id) on delete cascade
);
-- Latest decision wins. Rows are append-only, including withdrawal events.
create table public.consents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id),
  child_id uuid not null references public.children(id) on delete cascade, purpose public.consent_purpose not null,
  notice_version text not null, verification_method public.verification_method not null,
  decision public.consent_decision not null, decided_at timestamptz not null default clock_timestamp(),
  granted_at timestamptz, withdrawn_at timestamptz,
  check ((decision = 'granted') = (granted_at is not null)),
  check ((decision = 'withdrawn') = (withdrawn_at is not null))
);
create index consent_latest on public.consents(child_id,user_id,purpose,decided_at desc);
create table public.child_invites (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  email_hash text not null, token_hash text unique not null,
  role public.member_role not null check (role <> 'owner'), relationship text not null,
  invited_by uuid not null references public.users(id), expires_at timestamptz not null,
  accepted_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now()
);
create table public.milestone_catalog (
  id uuid primary key default gen_random_uuid(), domain text not null check (domain in ('motor','language','social','cognitive')),
  title text not null, prompt_question text not null, window_start_months numeric not null,
  typical_months numeric not null, consult_by_months numeric not null, source text not null,
  reassurance_copy text not null, consult_copy text not null,
  clinical_review_status text not null default 'draft' check (clinical_review_status in ('draft','approved','rejected')),
  check (0 <= window_start_months and window_start_months <= typical_months and typical_months <= consult_by_months)
);
create table public.memories (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  uploaded_by uuid not null references public.users(id), storage_path text not null unique,
  taken_at timestamptz not null, caption text not null default '' check (length(caption) <= 2000),
  milestone_id uuid references public.milestone_catalog(id), people_tags text[] not null default '{}',
  created_at timestamptz not null default now(), unique(child_id,id),
  check (split_part(storage_path,'/',1) = child_id::text and split_part(storage_path,'/',2) = uploaded_by::text)
);
create table public.child_milestones (
  child_id uuid references public.children(id) on delete cascade, milestone_id uuid references public.milestone_catalog(id),
  status text not null check (status in ('achieved','not_yet','skipped')), achieved_on date,
  memory_id uuid, recorded_by uuid not null references public.users(id), last_prompted_at timestamptz,
  next_prompt_at timestamptz, nudges_enabled boolean not null default true, consult_card_shown_at timestamptz,
  primary key(child_id,milestone_id),
  foreign key(child_id,memory_id) references public.memories(child_id,id) on delete set null (memory_id)
);
create table public.allergies (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  type text not null check (type in ('food','medicine','other')), allergen text not null,
  severity text not null, notes text not null default '', unique(child_id,id)
);
create table public.vaccination_logs (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  vaccine_name text not null, given_on date not null, card_photo_path text, notes text not null default '',
  unique(child_id,id), check (card_photo_path is null or split_part(card_photo_path,'/',1) = child_id::text)
);
create table public.activity_batches (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  week_start date not null, items jsonb not null check (jsonb_typeof(items) = 'array'), model text not null,
  prompt_version text not null, created_at timestamptz not null default now(), unique(child_id,id), unique(child_id,week_start)
);
create table public.activity_feedback (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  batch_id uuid not null, activity_index integer not null check (activity_index between 0 and 2),
  user_id uuid not null references public.users(id), signal text not null check (signal in ('up','down','did_it')),
  memory_id uuid, created_at timestamptz not null default now(),
  foreign key(child_id,batch_id) references public.activity_batches(child_id,id) on delete cascade,
  foreign key(child_id,memory_id) references public.memories(child_id,id) on delete set null (memory_id),
  unique(batch_id,activity_index,user_id,signal)
);
create table public.community_directory (
  id uuid primary key default gen_random_uuid(), city text, name text not null, platform text not null,
  url text not null check (url ~ '^https://'), description text not null, age_focus text,
  last_verified_at timestamptz, status text not null default 'draft' check (status in ('draft','published','archived'))
);
create table public.community_suggestions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id),
  city text not null, name text not null, url text not null check (url ~ '^https://'),
  status text not null default 'pending' check (status in ('pending','approved','rejected')), created_at timestamptz not null default now()
);
create table public.notifications_log (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id),
  child_id uuid not null references public.children(id) on delete cascade,
  type text not null, sent_at timestamptz not null default now(), response text
);
create table public.notification_preferences (
  child_id uuid references public.children(id) on delete cascade, user_id uuid references public.users(id),
  show_child_name boolean not null default false, quiet_start time not null default '21:00',
  quiet_end time not null default '08:00', timezone text not null default 'Asia/Kolkata', primary key(child_id,user_id)
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.users(id),
  child_id uuid not null references public.children(id) on delete cascade,
  action text not null, entity text not null, entity_id uuid, at timestamptz not null default clock_timestamp()
);

-- All tables, including non-child tables, are denied until explicitly granted below.
do $$ declare t text; begin
  foreach t in array array['users','children','child_members','role_permissions','child_member_permissions','consents',
    'child_invites','milestone_catalog','memories','child_milestones','allergies','vaccination_logs','activity_batches',
    'activity_feedback','community_directory','community_suggestions','notifications_log','notification_preferences','audit_log'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to authenticated',t);
  end loop;
end $$;

create function private.is_member(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.child_members m join public.children c on c.id=m.child_id
    where m.child_id=cid and m.user_id=auth.uid() and m.status='active' and c.deleted_at is null)
$$;
create function private.is_owner(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_member(cid) and exists(select 1 from public.child_members where child_id=cid and user_id=auth.uid() and role='owner')
$$;
create function private.has_permission(cid uuid, cap public.capability) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_member(cid) and coalesce((select case
    when m.role='owner' then true
    when cap='health.write' and m.role not in ('owner','co_parent') then false
    when cap='family.manage' and m.role not in ('owner','co_parent') then false
    else coalesce((select p.allowed from public.child_member_permissions p where p.child_id=cid and p.user_id=auth.uid() and p.capability=cap),
      exists(select 1 from public.role_permissions r where r.role=m.role and r.capability=cap)) end
    from public.child_members m where m.child_id=cid and m.user_id=auth.uid()), false)
$$;
create function private.user_consented(cid uuid, uid uuid, purpose public.consent_purpose) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select c.decision='granted' from public.consents c where c.child_id=cid and c.user_id=uid and c.purpose=$3 order by c.decided_at desc,c.id desc limit 1),false)
$$;
create function private.purpose_enabled(cid uuid, purpose public.consent_purpose) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_member(cid) and private.user_consented(cid,auth.uid(),purpose)
    and private.user_consented(cid,(select user_id from public.child_members where child_id=cid and role='owner' and status='active'),purpose)
$$;
create function private.can(cid uuid, cap public.capability, purpose public.consent_purpose) returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_permission(cid,cap) and private.purpose_enabled(cid,purpose)
$$;

create policy self_read on public.users for select to authenticated using (id=auth.uid());
create policy self_update on public.users for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
revoke update on public.users from authenticated;
grant update(display_name,city) on public.users to authenticated;
create policy profiles_read on public.children for select to authenticated using (private.has_permission(id,'profile.read'));
-- Writes happen only through RPCs, avoiding owner/child changes via PostgREST.
create policy members_read on public.child_members for select to authenticated using (private.has_permission(child_id,'family.read') or (user_id=auth.uid() and private.is_member(child_id)));
create policy presets_read on public.role_permissions for select to authenticated using (true);
create policy permissions_read on public.child_member_permissions for select to authenticated using (private.is_owner(child_id) or (user_id=auth.uid() and private.is_member(child_id)));
create policy consents_read on public.consents for select to authenticated using (user_id=auth.uid() and private.is_member(child_id));
-- Invitations use RPCs. Token/email hashes have no client SELECT policy.
create policy catalogue_approved on public.milestone_catalog for select to authenticated using (clinical_review_status='approved');
create policy memories_read on public.memories for select to authenticated using (private.can(child_id,'memories.read','memories'));
create policy memories_add on public.memories for insert to authenticated with check (uploaded_by=auth.uid() and milestone_id is null and private.can(child_id,'memories.add','memories'));
create policy memories_edit on public.memories for update to authenticated
  using (private.can(child_id,'memories.edit_all','memories') or (uploaded_by=auth.uid() and private.can(child_id,'memories.edit_own','memories')))
  with check (private.can(child_id,'memories.edit_all','memories') or (uploaded_by=auth.uid() and private.can(child_id,'memories.edit_own','memories')));
revoke update on public.memories from authenticated;
grant update(caption,taken_at,people_tags) on public.memories to authenticated;
-- Memory deletion/tagging will use storage-aware, atomic operations in Phase 2.
create policy milestones_read on public.child_milestones for select to authenticated using (private.can(child_id,'milestones.read','milestones') and exists(select 1 from public.milestone_catalog c where c.id=milestone_id and c.clinical_review_status='approved'));
create policy milestones_add on public.child_milestones for insert to authenticated with check (recorded_by=auth.uid() and private.can(child_id,'milestones.write','milestones') and exists(select 1 from public.milestone_catalog c where c.id=milestone_id and c.clinical_review_status='approved'));
create policy milestones_edit on public.child_milestones for update to authenticated using (private.can(child_id,'milestones.write','milestones')) with check (recorded_by=auth.uid() and private.can(child_id,'milestones.write','milestones') and exists(select 1 from public.milestone_catalog c where c.id=milestone_id and c.clinical_review_status='approved'));
revoke update on public.child_milestones from authenticated;
grant update(status,achieved_on,memory_id,recorded_by,nudges_enabled) on public.child_milestones to authenticated;
-- No direct health policies: even authorised parents must use audited RPCs.
create policy activities_read on public.activity_batches for select to authenticated using (private.can(child_id,'activities.read','personalisation'));
create policy feedback_read on public.activity_feedback for select to authenticated using (user_id=auth.uid() and private.can(child_id,'activities.feedback','personalisation'));
create policy feedback_add on public.activity_feedback for insert to authenticated with check (user_id=auth.uid() and private.can(child_id,'activities.feedback','personalisation'));
create policy directory_read on public.community_directory for select to authenticated using (status='published');
create policy suggestions_read on public.community_suggestions for select to authenticated using (user_id=auth.uid());
create policy suggestions_add on public.community_suggestions for insert to authenticated with check (user_id=auth.uid() and status='pending');
create policy notifications_read on public.notifications_log for select to authenticated using (user_id=auth.uid() and private.purpose_enabled(child_id,'notifications'));
create policy preferences_read on public.notification_preferences for select to authenticated using (user_id=auth.uid() and private.is_member(child_id));
create policy preferences_add on public.notification_preferences for insert to authenticated with check (user_id=auth.uid() and private.purpose_enabled(child_id,'notifications'));
create policy preferences_edit on public.notification_preferences for update to authenticated using (user_id=auth.uid() and private.is_member(child_id)) with check (user_id=auth.uid() and private.purpose_enabled(child_id,'notifications'));
create policy audit_read on public.audit_log for select to authenticated using (private.has_permission(child_id,'audit.read'));

create function private.on_auth_user_created() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.users(id,email,phone) values(new.id,new.email,new.phone); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.on_auth_user_created();
create function private.sync_auth_user() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.users set email=new.email,phone=new.phone where id=new.id; return new; end $$;
create trigger sync_auth_user after update of email,phone on auth.users for each row execute function private.sync_auth_user();

-- Storage is private. Object SELECT has no policy: clients cannot mint arbitrary-lifetime signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('child-photos','child-photos',false,2097152,array['image/jpeg','image/png','image/webp']),
  ('health-photos','health-photos',false,2097152,array['image/jpeg','image/png','image/webp']);
create function private.object_child(object_name text) returns uuid language plpgsql immutable set search_path='' as $$
begin return split_part(object_name,'/',1)::uuid; exception when invalid_text_representation then return null; end $$;
create policy photos_upload on storage.objects for insert to authenticated with check (
  bucket_id='child-photos' and split_part(name,'/',2)=auth.uid()::text and
  (private.can(private.object_child(name),'memories.add','memories') or private.can(private.object_child(name),'profile.edit','memories'))
);

-- Revoke PUBLIC execute, including helpers that accept another user's id.
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_member(uuid), private.is_owner(uuid), private.has_permission(uuid,public.capability),
  private.purpose_enabled(uuid,public.consent_purpose), private.can(uuid,public.capability,public.consent_purpose),
  private.object_child(text) to authenticated;
