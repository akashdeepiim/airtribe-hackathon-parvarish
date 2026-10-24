-- Versioned notices now describe sourced guidance and the implemented health records.
create or replace function private.record_choices(cid uuid, uid uuid, choices jsonb) returns void language plpgsql security definer set search_path='' as $$
declare p public.consent_purpose; accepted boolean; begin
  if jsonb_typeof(choices) is distinct from 'object' or (select count(*) from jsonb_object_keys(choices)) <> 5 then
    raise sqlstate 'PT400' using message='Choose an option for each purpose.';
  end if;
  foreach p in array enum_range(null::public.consent_purpose) loop
    if jsonb_typeof(choices->p::text) is distinct from 'boolean' then raise sqlstate 'PT400' using message='Choose an option for each purpose.'; end if;
    accepted := (choices->>p::text)::boolean;
    insert into public.consents(user_id,child_id,purpose,notice_version,verification_method,decision,granted_at)
      values(uid,cid,p,'2026-10-24.v2','self_declaration',case when accepted then 'granted'::public.consent_decision else 'declined'::public.consent_decision end,case when accepted then clock_timestamp() end);
  end loop;
end $$;

create or replace function public.create_child(profile jsonb, choices jsonb, adult_guardian boolean, notice_version text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); cid uuid; birth date; begin
  if adult_guardian is distinct from true or notice_version is distinct from '2026-10-24.v2' then raise sqlstate 'PT400' using message='Confirm the current parent or guardian notice.'; end if;
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

create or replace function public.set_consent(cid uuid, purpose public.consent_purpose, granted boolean, notice_version text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); begin
  if not private.is_member(cid) then raise sqlstate 'PT403' using message='You do not have access to this profile.'; end if;
  if notice_version is distinct from '2026-10-24.v2' or granted is null then raise sqlstate 'PT400' using message='Review the current notice.'; end if;
  insert into public.consents(user_id,child_id,purpose,notice_version,verification_method,decision,granted_at,withdrawn_at)
    values(uid,cid,purpose,notice_version,'self_declaration',case when granted then 'granted'::public.consent_decision else 'withdrawn'::public.consent_decision end,
      case when granted then clock_timestamp() end,case when not granted then clock_timestamp() end);
end $$;

create or replace function public.accept_invite(invite_token text, choices jsonb, adult boolean, notice_version text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); invitation public.child_invites; email_value text; begin
  if adult is distinct from true or notice_version is distinct from '2026-10-24.v2' or (choices->>'memories') is distinct from 'true' then raise sqlstate 'PT400' using message='Complete the family notices before joining.'; end if;
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


create function private.sync_memory_date() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.taken_at is distinct from old.taken_at and old.milestone_id is not null then
  if not private.can(new.child_id,'milestones.write','milestones') then raise sqlstate 'PT403' using message='Milestone permission is needed to change a linked photo date.'; end if;
  if (new.taken_at at time zone 'Asia/Kolkata')::date not between (select dob from public.children where id=new.child_id) and current_date then raise sqlstate 'PT400' using message='Check the date of this first.'; end if;
  update public.child_milestones set achieved_on=(new.taken_at at time zone 'Asia/Kolkata')::date where child_id=new.child_id and memory_id=new.id;
 end if;
 return new;
end $$;
create trigger sync_memory_date after update of taken_at on public.memories for each row execute function private.sync_memory_date();
revoke all on function private.sync_memory_date() from public,anon,authenticated;
