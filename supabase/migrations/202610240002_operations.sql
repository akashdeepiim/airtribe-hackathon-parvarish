-- Fixed search paths + explicit authorisation in every SECURITY DEFINER entry point.
create function private.require_auth() returns uuid language plpgsql stable security definer set search_path='' as $$
declare uid uuid := auth.uid(); begin
  if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then
    raise sqlstate 'PT401' using message='Please sign in with a verified email.';
  end if; return uid;
end $$;
create function private.record_choices(cid uuid, uid uuid, choices jsonb) returns void language plpgsql security definer set search_path='' as $$
declare p public.consent_purpose; accepted boolean; begin
  if jsonb_typeof(choices) is distinct from 'object' or (select count(*) from jsonb_object_keys(choices)) <> 5 then
    raise sqlstate 'PT400' using message='Choose an option for each purpose.';
  end if;
  foreach p in array enum_range(null::public.consent_purpose) loop
    if jsonb_typeof(choices->p::text) is distinct from 'boolean' then raise sqlstate 'PT400' using message='Choose an option for each purpose.'; end if;
    accepted := (choices->>p::text)::boolean;
    insert into public.consents(user_id,child_id,purpose,notice_version,verification_method,decision,granted_at)
      values(uid,cid,p,'2026-10-24.v1','self_declaration',case when accepted then 'granted'::public.consent_decision else 'declined'::public.consent_decision end,case when accepted then clock_timestamp() end);
  end loop;
end $$;
create function public.create_child(profile jsonb, choices jsonb, adult_guardian boolean, notice_version text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); cid uuid; birth date; begin
  if adult_guardian is distinct from true or notice_version is distinct from '2026-10-24.v1' then raise sqlstate 'PT400' using message='Confirm the current parent or guardian notice.'; end if;
  if (choices->>'memories') is distinct from 'true' then raise sqlstate 'PT400' using message='Memories consent is needed to create a profile.'; end if;
  if jsonb_typeof(profile) is distinct from 'object' or length(trim(coalesce(profile->>'name',''))) not between 1 and 80 then raise sqlstate 'PT400' using message='Enter a name of 1 to 80 characters.'; end if;
  birth := (profile->>'dob')::date;
  if birth is null or birth > timezone('Asia/Kolkata',now())::date or birth <= (timezone('Asia/Kolkata',now()) - interval '6 years')::date then raise sqlstate 'PT400' using message='Enter a date of birth for a child aged 0 to 5.'; end if;
  if length(coalesce(profile->>'city','Bangalore')) not between 1 and 100 then raise sqlstate 'PT400' using message='Enter a city.'; end if;
  insert into public.children(name,dob,sex,city,interests,created_by)
    values(trim(profile->>'name'),birth,nullif(profile->>'sex',''),coalesce(profile->>'city','Bangalore'),
      array(select jsonb_array_elements_text(coalesce(profile->'interests','[]'::jsonb))),uid) returning id into cid;
  insert into public.child_members(child_id,user_id,role,relationship) values(cid,uid,'owner','Parent');
  perform private.record_choices(cid,uid,choices);
  return cid;
end $$;

create function public.update_child(cid uuid, profile jsonb) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); birth date; begin
  if not private.has_permission(cid,'profile.edit') then raise sqlstate 'PT403' using message='You do not have access to edit this profile.'; end if;
  birth := (profile->>'dob')::date;
  if birth is null or birth > timezone('Asia/Kolkata',now())::date or length(trim(coalesce(profile->>'name',''))) not between 1 and 80 then raise sqlstate 'PT400' using message='Check the name and date of birth.'; end if;
  update public.children set name=trim(profile->>'name'),dob=birth,sex=nullif(profile->>'sex',''),city=coalesce(profile->>'city','Bangalore'),
    interests=array(select jsonb_array_elements_text(coalesce(profile->'interests','[]'::jsonb))) where id=cid;
end $$;
create function public.set_child_avatar(cid uuid, object_path text) returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.require_auth();
  if not private.can(cid,'profile.edit','memories') then raise sqlstate 'PT403' using message='You do not have access to change this photo.'; end if;
  if split_part(object_path,'/',1) <> cid::text or split_part(object_path,'/',2) <> auth.uid()::text or
    not exists(select 1 from storage.objects where bucket_id='child-photos' and name=object_path) then
    raise sqlstate 'PT400' using message='Upload the profile photo first.';
  end if;
  update public.children set avatar_path=object_path where id=cid;
end $$;

create function public.set_consent(cid uuid, purpose public.consent_purpose, granted boolean, notice_version text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); begin
  if not private.is_member(cid) then raise sqlstate 'PT403' using message='You do not have access to this profile.'; end if;
  if notice_version is distinct from '2026-10-24.v1' or granted is null then raise sqlstate 'PT400' using message='Review the current notice.'; end if;
  insert into public.consents(user_id,child_id,purpose,notice_version,verification_method,decision,granted_at,withdrawn_at)
    values(uid,cid,purpose,notice_version,'self_declaration',case when granted then 'granted'::public.consent_decision else 'withdrawn'::public.consent_decision end,
      case when granted then clock_timestamp() end,case when not granted then clock_timestamp() end);
end $$;

create function public.get_my_access(cid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare capabilities jsonb; purposes jsonb; begin
  perform private.require_auth();
  if not private.is_member(cid) then raise sqlstate 'PT403' using message='This profile is unavailable.'; end if;
  select jsonb_object_agg(c,private.has_permission(cid,c)) into capabilities from unnest(enum_range(null::public.capability)) c;
  select jsonb_object_agg(p,private.purpose_enabled(cid,p)) into purposes from unnest(enum_range(null::public.consent_purpose)) p;
  return jsonb_build_object('role',(select role from public.child_members where child_id=cid and user_id=auth.uid()),'capabilities',capabilities,'purposes',purposes);
end $$;

create function public.set_member_access(cid uuid, member_id uuid, relationship text, permissions jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); cap public.capability; entry record; target_role public.member_role; begin
  if not private.is_owner(cid) then raise sqlstate 'PT403' using message='Only the owner can change access levels.'; end if;
  select role into target_role from public.child_members where child_id=cid and user_id=member_id and status='active' for update;
  if target_role is null or target_role='owner' then raise sqlstate 'PT403' using message='This member cannot be changed.'; end if;
  if length(trim(relationship)) not between 1 and 60 or jsonb_typeof(permissions) is distinct from 'object' then raise sqlstate 'PT400' using message='Check the relationship and access settings.'; end if;
  delete from public.child_member_permissions where child_id=cid and user_id=member_id;
  for entry in select * from jsonb_each(permissions) loop
    cap := entry.key::public.capability;
    if jsonb_typeof(entry.value) <> 'boolean' then raise sqlstate 'PT400' using message='Access choices must be true or false.'; end if;
    if (entry.value::text)::boolean and cap in ('health.write','family.manage','memories.delete_all') and target_role not in ('owner','co_parent') then raise sqlstate 'PT400' using message='This permission is limited to parents.'; end if;
    insert into public.child_member_permissions(child_id,user_id,capability,allowed,granted_by) values(cid,member_id,cap,(entry.value::text)::boolean,uid);
  end loop;
  update public.child_members set relationship=trim(set_member_access.relationship) where child_id=cid and user_id=member_id;
  insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(uid,cid,'access_changed','child_members',member_id);
end $$;

create function public.create_invite(cid uuid, recipient_email text, member_role public.member_role, relationship text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); raw_token text; invite_id uuid; begin
  if not private.has_permission(cid,'family.manage') then raise sqlstate 'PT403' using message='You do not have access to invite family.'; end if;
  if member_role is null or member_role='owner' or (member_role='co_parent' and not private.is_owner(cid)) then raise sqlstate 'PT403' using message='Only the owner can invite a co-parent.'; end if;
  if length(trim(relationship)) not between 1 and 60 or length(recipient_email)>254 or recipient_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise sqlstate 'PT400' using message='Check the email and relationship.'; end if;
  raw_token := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.child_invites(child_id,email_hash,token_hash,role,relationship,invited_by,expires_at)
    values(cid,encode(extensions.digest(lower(trim(recipient_email)),'sha256'),'hex'),encode(extensions.digest(raw_token,'sha256'),'hex'),member_role,trim(relationship),uid,now()+interval '7 days') returning id into invite_id;
  return jsonb_build_object('id',invite_id,'token',raw_token,'expires_at',now()+interval '7 days');
end $$;
create function public.accept_invite(invite_token text, choices jsonb, adult boolean, notice_version text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); invitation public.child_invites; email_value text; begin
  if adult is distinct from true or notice_version is distinct from '2026-10-24.v1' or (choices->>'memories') is distinct from 'true' then raise sqlstate 'PT400' using message='Complete the family notices before joining.'; end if;
  select * into invitation from public.child_invites where token_hash=encode(extensions.digest(invite_token,'sha256'),'hex') for update;
  select email into email_value from auth.users where id=uid;
  if invitation.id is null or invitation.accepted_at is not null or invitation.revoked_at is not null or invitation.expires_at<=now()
    or invitation.email_hash <> encode(extensions.digest(lower(trim(email_value)),'sha256'),'hex')
    or exists(select 1 from public.children where id=invitation.child_id and deleted_at is not null)
    or not exists(select 1 from public.child_members where child_id=invitation.child_id and user_id=invitation.invited_by and status='active' and role in ('owner','co_parent')) then
    raise sqlstate 'PT403' using message='This invitation is unavailable for this account.';
  end if;
  if exists(select 1 from public.child_members where child_id=invitation.child_id and user_id=uid and (role='owner' or status='active')) then raise sqlstate 'PT409' using message='You already belong to this family.'; end if;
  -- Remove overrides when an explicitly re-invited member returns.
  delete from public.child_member_permissions where child_id=invitation.child_id and user_id=uid;
  insert into public.child_members(child_id,user_id,role,relationship,invited_by) values(invitation.child_id,uid,invitation.role,invitation.relationship,invitation.invited_by)
    on conflict(child_id,user_id) do update set role=excluded.role,relationship=excluded.relationship,invited_by=excluded.invited_by,status='active';
  perform private.record_choices(invitation.child_id,uid,choices);
  update public.child_invites set accepted_at=now() where id=invitation.id;
  return invitation.child_id;
end $$;
create function public.list_invites(cid uuid) returns table(id uuid,role public.member_role,relationship text,expires_at timestamptz,accepted_at timestamptz,revoked_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_auth();
  if not private.has_permission(cid,'family.manage') then raise sqlstate 'PT403' using message='You do not have access to invitations.'; end if;
  return query select i.id,i.role,i.relationship,i.expires_at,i.accepted_at,i.revoked_at from public.child_invites i where child_id=cid order by created_at desc;
end $$;
create function public.revoke_invite(invite_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare cid uuid; begin
  perform private.require_auth(); select child_id into cid from public.child_invites where id=invite_id;
  if not private.has_permission(cid,'family.manage') then raise sqlstate 'PT403' using message='You do not have access to this invitation.'; end if;
  update public.child_invites set revoked_at=now() where id=invite_id and accepted_at is null;
end $$;
create function public.revoke_member(cid uuid, member_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); target_role public.member_role; begin
  select role into target_role from public.child_members where child_id=cid and user_id=member_id for update;
  if not private.has_permission(cid,'family.manage') or target_role is null or target_role='owner' or (target_role='co_parent' and not private.is_owner(cid)) then raise sqlstate 'PT403' using message='You do not have access to remove this member.'; end if;
  update public.child_members set status='revoked' where child_id=cid and user_id=member_id;
  update public.child_invites set revoked_at=now() where child_id=cid and invited_by=member_id and accepted_at is null;
  insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(uid,cid,'access_revoked','child_members',member_id);
end $$;

create function public.read_health(cid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); result jsonb; begin
  if not private.can(cid,'health.read','health') then raise sqlstate 'PT403' using message='You do not have access to health records.'; end if;
  -- Audit and result are in the same transaction; failed audit means no result.
  insert into public.audit_log(actor_id,child_id,action,entity,entity_id) select uid,cid,'read','allergies',id from public.allergies where child_id=cid;
  insert into public.audit_log(actor_id,child_id,action,entity,entity_id) select uid,cid,'read','vaccination_logs',id from public.vaccination_logs where child_id=cid;
  insert into public.audit_log(actor_id,child_id,action,entity) values(uid,cid,'read','health_collection');
  select jsonb_build_object('allergies',coalesce((select jsonb_agg(a) from public.allergies a where child_id=cid),'[]'),
    'vaccinations',coalesce((select jsonb_agg(v) from public.vaccination_logs v where child_id=cid),'[]')) into result;
  return result;
end $$;
create function public.write_health(cid uuid, entity text, record_id uuid, payload jsonb, remove boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); rid uuid := coalesce(record_id,gen_random_uuid()); begin
  if not private.can(cid,'health.write','health') then raise sqlstate 'PT403' using message='You do not have access to edit health records.'; end if;
  if entity not in ('allergies','vaccination_logs') or remove is null then raise sqlstate 'PT400' using message='Choose a supported record type.'; end if;
  if record_id is not null then
    if entity='allergies' and not exists(select 1 from public.allergies where id=rid and child_id=cid) then raise sqlstate 'PT404' using message='Record unavailable.'; end if;
    if entity='vaccination_logs' and not exists(select 1 from public.vaccination_logs where id=rid and child_id=cid) then raise sqlstate 'PT404' using message='Record unavailable.'; end if;
  end if;
  if remove then
    if entity='allergies' then delete from public.allergies where id=rid and child_id=cid;
    else
      -- Card cleanup is implemented with the Phase 4 photo workflow; never orphan it silently.
      if exists(select 1 from public.vaccination_logs where id=rid and card_photo_path is not null) then raise sqlstate 'PT409' using message='Remove the attached card through the photo workflow first.'; end if;
      delete from public.vaccination_logs where id=rid and child_id=cid;
    end if;
  elsif entity='allergies' then
    if length(trim(coalesce(payload->>'allergen',''))) not between 1 and 200 or length(coalesce(payload->>'notes',''))>2000 or length(coalesce(payload->>'severity','')) not between 1 and 60 then raise sqlstate 'PT400' using message='Check the record fields.'; end if;
    insert into public.allergies(id,child_id,type,allergen,severity,notes) values(rid,cid,payload->>'type',payload->>'allergen',payload->>'severity',coalesce(payload->>'notes',''))
      on conflict(id) do update set type=excluded.type,allergen=excluded.allergen,severity=excluded.severity,notes=excluded.notes;
  else
    if length(trim(coalesce(payload->>'vaccine_name',''))) not between 1 and 200 or (payload->>'given_on')::date>current_date or length(coalesce(payload->>'notes',''))>2000 or payload ? 'card_photo_path' then raise sqlstate 'PT400' using message='Check the record fields.'; end if;
    insert into public.vaccination_logs(id,child_id,vaccine_name,given_on,notes) values(rid,cid,payload->>'vaccine_name',(payload->>'given_on')::date,coalesce(payload->>'notes',''))
      on conflict(id) do update set vaccine_name=excluded.vaccine_name,given_on=excluded.given_on,notes=excluded.notes;
  end if;
  insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(uid,cid,case when remove then 'delete' when record_id is null then 'create' else 'update' end,entity,rid);
  return rid;
end $$;

create function public.authorize_photo(object_path text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare cid uuid := private.object_child(object_path); begin
  perform private.require_auth();
  return private.can(cid,'memories.read','memories') and (
    exists(select 1 from public.memories where child_id=cid and storage_path=object_path) or
    exists(select 1 from public.children where id=cid and avatar_path=object_path));
end $$;

-- Explicit privileges stop PUBLIC/default grants exposing future helper functions.
revoke execute on all functions in schema public from public,anon,authenticated;
revoke execute on all functions in schema private from public,anon;
grant execute on function public.create_child(jsonb,jsonb,boolean,text),public.update_child(uuid,jsonb),public.set_child_avatar(uuid,text),
  public.set_consent(uuid,public.consent_purpose,boolean,text),public.get_my_access(uuid),public.set_member_access(uuid,uuid,text,jsonb),
  public.create_invite(uuid,text,public.member_role,text),public.accept_invite(text,jsonb,boolean,text),public.list_invites(uuid),
  public.revoke_invite(uuid),public.revoke_member(uuid,uuid),public.read_health(uuid),public.write_health(uuid,text,uuid,jsonb,boolean),
  public.authorize_photo(text) to authenticated;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;
