-- Private byte cleanup survives record deletion and retries independently.
create table private.photo_cleanup_jobs (
  id uuid primary key default gen_random_uuid(), child_id uuid not null,
  bucket text not null check(bucket in ('child-photos','health-photos')),
  object_path text not null, requested_by uuid, created_at timestamptz not null default now(),
  attempts integer not null default 0, available_at timestamptz not null default now(),
  locked_until timestamptz, completed_at timestamptz
);
alter table private.photo_cleanup_jobs enable row level security;
revoke all on private.photo_cleanup_jobs from public,anon,authenticated,service_role;
create index photo_cleanup_pending on private.photo_cleanup_jobs(available_at) where completed_at is null;

create function public.record_memory(mid uuid,cid uuid,object_path text,photo_date timestamptz,photo_caption text default '',tags text[] default '{}') returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); existing public.memories; begin
  if not private.can(cid,'memories.add','memories') then raise sqlstate 'PT403' using message='You do not have access to add memories.'; end if;
  if split_part(object_path,'/',1)<>cid::text or split_part(object_path,'/',2)<>uid::text
    or not exists(select 1 from storage.objects where bucket_id='child-photos' and name=object_path)
    or photo_date is null or photo_date>now()+interval '1 day' or length(coalesce(photo_caption,''))>2000
    or cardinality(tags)>10 or exists(select 1 from unnest(tags) t where length(t) not between 1 and 60) then
    raise sqlstate 'PT400' using message='Check the memory details and uploaded photo.';
  end if;
  select * into existing from public.memories where id=mid;
  if found then
    if existing.child_id=cid and existing.uploaded_by=uid and existing.storage_path=object_path then return mid; end if;
    raise sqlstate 'PT409' using message='Memory identifier already used.';
  end if;
  insert into public.memories(id,child_id,uploaded_by,storage_path,taken_at,caption,people_tags)
    values(mid,cid,uid,object_path,photo_date,coalesce(photo_caption,''),coalesce(tags,'{}'));
  return mid;
end $$;

create function public.remove_memory(mid uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); m public.memories; jid uuid; begin
  select * into m from public.memories where id=mid for update;
  if not found or not (private.can(m.child_id,'memories.delete_all','memories') or
    (m.uploaded_by=uid and private.can(m.child_id,'memories.delete_own','memories'))) then
    raise sqlstate 'PT403' using message='You do not have access to remove this memory.';
  end if;
  insert into private.photo_cleanup_jobs(child_id,bucket,object_path,requested_by)
    values(m.child_id,'child-photos',m.storage_path,uid) returning id into jid;
  update public.children set avatar_path=null where id=m.child_id and avatar_path=m.storage_path;
  delete from public.memories where id=mid;
  return jid;
end $$;

create function public.discard_memory_upload(cid uuid,object_path text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); jid uuid; begin
  if not private.can(cid,'memories.add','memories') or split_part(object_path,'/',1)<>cid::text or split_part(object_path,'/',2)<>uid::text
    or exists(select 1 from public.memories where storage_path=object_path)
    or exists(select 1 from public.children where avatar_path=object_path) then
    raise sqlstate 'PT403' using message='This photo cannot be discarded.';
  end if;
  insert into private.photo_cleanup_jobs(child_id,bucket,object_path,requested_by) values(cid,'child-photos',object_path,uid) returning id into jid;
  return jid;
end $$;

create function public.confirm_memory_milestone(mid uuid,milestone uuid) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_auth(); m public.memories; previous uuid; begin
  select * into m from public.memories where id=mid for update;
  if not found or not private.can(m.child_id,'milestones.write','milestones') or not (
    private.can(m.child_id,'memories.edit_all','memories') or (m.uploaded_by=uid and private.can(m.child_id,'memories.edit_own','memories'))) then
    raise sqlstate 'PT403' using message='You do not have access to record this first.';
  end if;
  if not exists(select 1 from public.milestone_catalog where id=milestone and clinical_review_status='approved') then
    raise sqlstate 'PT400' using message='Choose a published milestone.';
  end if;
  select memory_id into previous from public.child_milestones where child_id=m.child_id and milestone_id=milestone for update;
  if previous is not null and previous<>mid then update public.memories set milestone_id=null where id=previous; end if;
  update public.child_milestones set memory_id=null where child_id=m.child_id and memory_id=mid and milestone_id<>milestone;
  insert into public.child_milestones(child_id,milestone_id,status,achieved_on,memory_id,recorded_by)
    values(m.child_id,milestone,'achieved',(m.taken_at at time zone 'Asia/Kolkata')::date,mid,uid)
    on conflict(child_id,milestone_id) do update set status='achieved',achieved_on=excluded.achieved_on,memory_id=excluded.memory_id,recorded_by=uid,next_prompt_at=null;
  update public.memories set milestone_id=milestone where id=mid;
end $$;

-- Narrow worker RPCs expose only pending object paths, never broad table grants.
create function public.claim_photo_cleanup(job_id uuid default null) returns table(id uuid,bucket text,object_path text)
language sql security definer set search_path='' as $$
  update private.photo_cleanup_jobs j set locked_until=now()+interval '5 minutes',attempts=attempts+1
  where j.id in (select p.id from private.photo_cleanup_jobs p where p.completed_at is null and p.available_at<=now()
    and (p.locked_until is null or p.locked_until<now()) and (job_id is null or p.id=job_id)
    order by p.created_at for update skip locked limit 20)
  returning j.id,j.bucket,j.object_path
$$;
create function public.finish_photo_cleanup(job_id uuid,succeeded boolean) returns void language sql security definer set search_path='' as $$
  update private.photo_cleanup_jobs set completed_at=case when succeeded then now() else null end,
    locked_until=null,available_at=now()+interval '15 minutes' where id=job_id
$$;
revoke all on function public.record_memory(uuid,uuid,text,timestamptz,text,text[]),public.remove_memory(uuid),public.discard_memory_upload(uuid,text),public.confirm_memory_milestone(uuid,uuid),public.claim_photo_cleanup(uuid),public.finish_photo_cleanup(uuid,boolean) from public,anon,authenticated;
grant execute on function public.record_memory(uuid,uuid,text,timestamptz,text,text[]),public.remove_memory(uuid),public.discard_memory_upload(uuid,text),public.confirm_memory_milestone(uuid,uuid) to authenticated;
grant execute on function public.claim_photo_cleanup(uuid),public.finish_photo_cleanup(uuid,boolean) to service_role;
