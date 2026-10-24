alter table public.milestone_catalog add column source_review_status text not null default 'unverified' check(source_review_status in ('unverified','verified'));
alter table public.milestone_catalog add column source_verified_at date;
alter table public.milestone_catalog add column age_basis text not null default 'clinical_window' check(age_basis in ('clinical_window','cdc_checkpoint','who_window'));
alter table public.milestone_catalog add column did_you_know text not null default '';
alter table public.milestone_catalog alter column typical_months drop not null;
create function private.catalog_published(mid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.milestone_catalog where id=mid and (clinical_review_status='approved' or (clinical_review_status='draft' and source_review_status='verified' and source_verified_at is not null and source ~ '^https://(www\.cdc\.gov|www\.who\.int|cdn\.who\.int)/')))
$$;
revoke all on function private.catalog_published(uuid) from public,anon;
grant execute on function private.catalog_published(uuid) to authenticated;
drop policy catalogue_approved on public.milestone_catalog;
create policy catalogue_published on public.milestone_catalog for select to authenticated using(private.catalog_published(id));
drop policy milestones_read on public.child_milestones;
drop policy milestones_add on public.child_milestones;
drop policy milestones_edit on public.child_milestones;
create policy milestones_read on public.child_milestones for select to authenticated using(private.can(child_id,'milestones.read','milestones') and private.catalog_published(milestone_id));
-- Writes use RPCs so dates, photo links and re-ask times remain consistent.
create function public.record_milestone(cid uuid,mid uuid,answer text,achieved_date date default null,nudges boolean default true) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); birthday date; begin
 if not private.can(cid,'milestones.write','milestones') then raise sqlstate 'PT403' using message='You do not have access to record milestones.'; end if;
 if not private.catalog_published(mid) or answer is null or answer not in ('achieved','not_yet','skipped') or nudges is null then raise sqlstate 'PT400' using message='Choose a published milestone and response.'; end if;
 select dob into birthday from public.children where id=cid;
 if answer='achieved' and (achieved_date is null or achieved_date not between birthday and current_date) then raise sqlstate 'PT400' using message='Check the date of this first.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(cid::text,0));
 update public.memories set milestone_id=null where child_id=cid and milestone_id=mid;
 insert into public.child_milestones(child_id,milestone_id,status,achieved_on,recorded_by,next_prompt_at,nudges_enabled)
 values(cid,mid,answer,case when answer='achieved' then achieved_date end,uid,case when answer='not_yet' then now()+interval '35 days' end,nudges and answer<>'skipped')
 on conflict(child_id,milestone_id) do update set status=excluded.status,achieved_on=excluded.achieved_on,memory_id=null,recorded_by=uid,next_prompt_at=excluded.next_prompt_at,nudges_enabled=excluded.nudges_enabled;
end $$;
create function public.set_milestone_nudges(cid uuid,mid uuid,enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); begin
 if not private.can(cid,'milestones.write','milestones') then raise sqlstate 'PT403' using message='You do not have access to update reminders.'; end if;
 if not private.catalog_published(mid) or enabled is null then raise sqlstate 'PT400' using message='Choose a published milestone.'; end if;
 insert into public.child_milestones(child_id,milestone_id,status,recorded_by,nudges_enabled,next_prompt_at) values(cid,mid,'not_yet',uid,enabled,now()+interval '35 days')
 on conflict(child_id,milestone_id) do update set nudges_enabled=enabled;
end $$;
create function public.dismiss_milestone_card(cid uuid,mid uuid) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); begin
 if not private.can(cid,'milestones.write','milestones') then raise sqlstate 'PT403' using message='You do not have access to update reminders.'; end if;
 if not private.catalog_published(mid) then raise sqlstate 'PT400' using message='Choose a published milestone.'; end if;
 insert into public.child_milestones(child_id,milestone_id,status,recorded_by,consult_card_shown_at) values(cid,mid,'not_yet',uid,now()) on conflict(child_id,milestone_id) do update set consult_card_shown_at=now();
end $$;
-- Preserve confirmed-photo semantics with the explicit source-verification publication gate.
create or replace function public.confirm_memory_milestone(mid uuid,milestone uuid) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); m public.memories; previous uuid; begin
  select * into m from public.memories where id=mid;
  perform pg_advisory_xact_lock(hashtextextended(m.child_id::text,0));
  select * into m from public.memories where id=mid for update;
  if not found or not private.can(m.child_id,'milestones.write','milestones') or not (
    private.can(m.child_id,'memories.edit_all','memories') or (m.uploaded_by=uid and private.can(m.child_id,'memories.edit_own','memories'))) then
    raise sqlstate 'PT403' using message='You do not have access to record this first.';
  end if;
  if not private.catalog_published(milestone) then
    raise sqlstate 'PT400' using message='Choose a published milestone.';
  end if;
  if (m.taken_at at time zone 'Asia/Kolkata')::date < (select dob from public.children where id=m.child_id) then raise sqlstate 'PT400' using message='A first cannot predate birth.'; end if;
  select memory_id into previous from public.child_milestones where child_id=m.child_id and milestone_id=milestone for update;
  if previous is not null and previous<>mid then update public.memories set milestone_id=null where id=previous; end if;
  update public.child_milestones set memory_id=null where child_id=m.child_id and memory_id=mid and milestone_id<>milestone;
  insert into public.child_milestones(child_id,milestone_id,status,achieved_on,memory_id,recorded_by)
    values(m.child_id,milestone,'achieved',(m.taken_at at time zone 'Asia/Kolkata')::date,mid,uid)
    on conflict(child_id,milestone_id) do update set status='achieved',achieved_on=excluded.achieved_on,memory_id=excluded.memory_id,recorded_by=uid,next_prompt_at=null;
  update public.memories set milestone_id=milestone where id=mid;
end $$;


revoke all on function public.record_milestone(uuid,uuid,text,date,boolean),public.set_milestone_nudges(uuid,uuid,boolean),public.dismiss_milestone_card(uuid,uuid) from public,anon;
grant execute on function public.record_milestone(uuid,uuid,text,date,boolean),public.set_milestone_nudges(uuid,uuid,boolean),public.dismiss_milestone_card(uuid,uuid) to authenticated;
