create table public.data_jobs(
 id uuid primary key default gen_random_uuid(), child_id uuid not null, requested_by uuid not null references public.users(id),
 kind text not null check(kind in('export','deletion')), status text not null default 'queued' check(status in('queued','running','ready','expired','cancelled')),
 requested_at timestamptz not null default now(), completed_at timestamptz, expires_at timestamptz,
 cursor integer not null default 0, total_files integer not null default 0, parts text[] not null default '{}', deleted_objects integer not null default 0,
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(), lease uuid, leased_until timestamptz
);
alter table public.data_jobs enable row level security;
revoke all on public.data_jobs from public,anon,authenticated;
grant select on public.data_jobs to authenticated;
create policy data_jobs_read on public.data_jobs for select to authenticated using(requested_by=auth.uid() and (kind='deletion' or private.is_owner(child_id)));
create table private.data_job_payloads(job_id uuid primary key references public.data_jobs(id) on delete cascade,payload jsonb not null);
alter table private.data_job_payloads enable row level security;
revoke all on private.data_job_payloads from public,anon,authenticated;
create table public.deletion_receipts(id uuid primary key,child_id uuid not null,requested_by uuid not null references public.users(id),requested_at timestamptz not null,completed_at timestamptz not null,deleted_objects integer not null);
alter table public.deletion_receipts enable row level security;
revoke all on public.deletion_receipts from public,anon,authenticated;
grant select on public.deletion_receipts to authenticated;
create policy receipt_owner on public.deletion_receipts for select to authenticated using(requested_by=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('family-exports','family-exports',false,52428800,array['application/zip']) on conflict(id) do nothing;
create function private.export_allowed(job public.data_jobs) returns boolean language plpgsql stable security definer set search_path='' as $$
declare scopes jsonb; p text; begin
 if not exists(select 1 from public.child_members m join public.children c on c.id=m.child_id where c.id=job.child_id and c.deleted_at is null and m.user_id=job.requested_by and m.role='owner' and m.status='active') then return false; end if;
 select payload->'included_purposes' into scopes from private.data_job_payloads where job_id=job.id;
 if scopes is null then return false; end if;
 foreach p in array array['memories','milestones','health','personalisation','notifications'] loop
  if coalesce((scopes->>p)::boolean,false) and not private.user_consented(job.child_id,job.requested_by,p::public.consent_purpose) then return false; end if;
 end loop;return true;
end $$;
create function public.request_data_export(cid uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); rid uuid; scopes jsonb; result jsonb; files jsonb; h jsonb; begin
 if not private.is_owner(cid) then raise sqlstate 'PT403' using message='Only the profile owner can export this family space.'; end if;
 perform 1 from public.children where id=cid for update;
 select id into rid from public.data_jobs where child_id=cid and requested_by=uid and kind='export' and ((status in('queued','running')) or (status='ready' and requested_at>now()-interval '15 minutes' and expires_at>now())) and private.export_allowed(data_jobs) order by requested_at desc limit 1;
 if rid is not null then return rid; end if;
 select jsonb_object_agg(p,private.purpose_enabled(cid,p)) into scopes from unnest(enum_range(null::public.consent_purpose)) p;
 if (scopes->>'health')::boolean then h:=public.read_health(cid)||jsonb_build_object('growth',public.read_growth(cid),'vaccination_plan',public.read_vaccination_plan(cid)); else h:='null'; end if;
 select jsonb_build_object('format_version',1,'exported_at',now(),'included_purposes',scopes,
 'child',(select to_jsonb(c) from public.children c where id=cid),
 'members',coalesce((select jsonb_agg(m) from public.child_members m where child_id=cid),'[]'),
 'consents',coalesce((select jsonb_agg(c) from public.consents c where child_id=cid and user_id=uid),'[]'),
 'memories',case when (scopes->>'memories')::boolean then coalesce((select jsonb_agg(m) from public.memories m where child_id=cid),'[]') else '[]'::jsonb end,
 'milestones',case when (scopes->>'milestones')::boolean then coalesce((select jsonb_agg(m) from public.child_milestones m where child_id=cid),'[]') else '[]'::jsonb end,
 'health',h,
 'activities',case when (scopes->>'personalisation')::boolean then coalesce((select jsonb_agg(a) from public.activity_batches a where child_id=cid),'[]') else '[]'::jsonb end,
 'activity_preferences',case when (scopes->>'personalisation')::boolean then (select to_jsonb(p) from public.activity_preferences p where child_id=cid) else null end,
 'activity_feedback',case when (scopes->>'personalisation')::boolean then coalesce((select jsonb_agg(a) from public.activity_feedback a where child_id=cid and user_id=uid),'[]') else '[]'::jsonb end,
 'notifications',case when (scopes->>'notifications')::boolean then coalesce((select jsonb_agg(n) from public.notifications_log n where child_id=cid and user_id=uid),'[]') else '[]'::jsonb end) into result;
 select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket,'path',path)),'[]') into files from (
  select 'child-photos' bucket,storage_path path from public.memories where child_id=cid and (scopes->>'memories')::boolean
  union select 'child-photos',avatar_path from public.children where id=cid and avatar_path is not null and (scopes->>'memories')::boolean
  union select 'health-photos',card_photo_path from public.vaccination_logs where child_id=cid and card_photo_path is not null and (scopes->>'health')::boolean
 ) f;
 insert into public.data_jobs(child_id,requested_by,kind,total_files) values(cid,uid,'export',jsonb_array_length(files)) returning id into rid;
 insert into private.data_job_payloads values(rid,result||jsonb_build_object('files',files));
 if (scopes->>'health')::boolean then insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(uid,cid,'create','health_export',rid); end if;
 return rid;
end $$;
create function public.request_child_deletion(cid uuid,confirmation text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); rid uuid; begin
 if not private.is_owner(cid) then raise sqlstate 'PT403' using message='Only the owner can delete a child profile.'; end if;
 if confirmation is distinct from 'DELETE' then raise sqlstate 'PT400' using message='Type DELETE to confirm.'; end if;
 perform 1 from public.children where id=cid for update;
 insert into public.data_jobs(child_id,requested_by,kind) values(cid,uid,'deletion') returning id into rid;
 insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(uid,cid,'delete_requested','child',cid);
 update public.children set deleted_at=now() where id=cid;
 update public.data_jobs set status='cancelled',next_attempt_at=now() where child_id=cid and kind='export';
 return rid;
end $$;
create function public.authorize_export_part(job_id uuid,part_index integer) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); job public.data_jobs; path text; begin
 select * into job from public.data_jobs where id=job_id;
 if job.id is null or job.requested_by<>uid or job.kind<>'export' or job.status<>'ready' or job.expires_at<=now() or not private.export_allowed(job) then raise sqlstate 'PT403' using message='Export unavailable. Request a new export.'; end if;
 path:=job.parts[part_index+1];if path is null then raise sqlstate 'PT404' using message='Export part unavailable.'; end if;
 if exists(select 1 from private.data_job_payloads where data_job_payloads.job_id=job.id and (payload->'included_purposes'->>'health')::boolean) then
 insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(uid,job.child_id,'read','health_export',job.id); end if;
 return path;
end $$;
create function public.claim_data_job(requested_job uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.data_jobs; token uuid:=gen_random_uuid(); result jsonb; payload jsonb; files jsonb; begin
 select * into job from public.data_jobs j where (requested_job is null or id=requested_job) and next_attempt_at<=now() and ((status in('queued','running') and (leased_until is null or leased_until<now())) or (kind='export' and ((status='ready' and expires_at<=now()) or status='cancelled'))) order by case when kind='deletion' then 0 else 1 end,requested_at for update skip locked limit 1;
 if not found then return null; end if;
 if job.kind='export' and (job.status='cancelled' or job.expires_at<=now() or not private.export_allowed(job)) then
  update public.data_jobs set status='cancelled' where id=job.id;
  select coalesce(jsonb_agg(jsonb_build_object('bucket','family-exports','path',p)),'[]') into files from unnest(job.parts) p;
  delete from private.data_job_payloads where job_id=job.id;
  return jsonb_build_object('id',job.id,'kind','expire','files',files);
 end if;
 update public.data_jobs set status='running',lease=token,leased_until=now()+interval '3 minutes',attempts=attempts+1 where id=job.id;
 if job.kind='deletion' then
  select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name)),'[]') into files from (select bucket_id,name from storage.objects where bucket_id in('child-photos','health-photos','family-exports') and split_part(name,'/',1)=job.child_id::text order by name limit 50) s;
  return jsonb_build_object('id',job.id,'kind','deletion','lease',token,'files',files);
 end if;
 select p.payload into payload from private.data_job_payloads p where job_id=job.id;
 if (payload->'included_purposes'->>'health')::boolean then insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(job.requested_by,job.child_id,'read_for_export','health_export',job.id); end if;
 return jsonb_build_object('id',job.id,'kind','export','lease',token,'child_id',job.child_id,'cursor',job.cursor,'total',job.total_files,'part',cardinality(job.parts)+1,'payload',payload-'files','files',(select coalesce(jsonb_agg(f),'[]') from (select value f from jsonb_array_elements(payload->'files') with ordinality where ordinality>job.cursor and ordinality<=job.cursor+20) s));
end $$;
create function public.finish_data_job(job_id uuid,token uuid,succeeded boolean,processed integer default 0,part_path text default null) returns void language plpgsql security definer set search_path='' as $$
declare job public.data_jobs; begin
 select * into job from public.data_jobs where id=job_id and lease=token for update;
 if not found then raise sqlstate 'PT409' using message='Job lease expired.'; end if;
 if not succeeded then update public.data_jobs set status='queued',lease=null,leased_until=null,next_attempt_at=now()+interval '1 minute' where id=job.id;return;end if;
 if job.kind='deletion' then
  update public.data_jobs set deleted_objects=deleted_objects+processed where id=job.id;
  if exists(select 1 from storage.objects where bucket_id in('child-photos','health-photos','family-exports') and split_part(name,'/',1)=job.child_id::text) then
   update public.data_jobs set status='queued',lease=null,leased_until=null where id=job.id;return;
  end if;
  -- Children cascade into every child record; receipt contains no name, health value or photo path.
  delete from private.photo_cleanup_jobs where child_id=job.child_id;
  delete from public.children where id=job.child_id and deleted_at is not null;
  if exists(select 1 from public.children where id=job.child_id) then raise sqlstate 'PT409' using message='Deletion state changed.'; end if;
  delete from public.data_jobs where child_id=job.child_id and id<>job.id;
  insert into public.deletion_receipts values(job.id,job.child_id,job.requested_by,job.requested_at,now(),job.deleted_objects+processed) on conflict(id) do nothing;
  update public.data_jobs set status='ready',completed_at=now(),lease=null,leased_until=null where id=job.id;
 else
  if not private.export_allowed(job) then update public.data_jobs set status='cancelled',parts=array_append(parts,part_path),lease=null,leased_until=null where id=job.id;return;end if;
  if part_path is null or split_part(part_path,'/',1)<>job.child_id::text or split_part(part_path,'/',2)<>job.id::text then raise sqlstate 'PT400' using message='Invalid export part.'; end if;
  update public.data_jobs set cursor=cursor+processed,parts=array_append(parts,part_path),status=case when cursor+processed>=total_files then 'ready' else 'queued' end,
   completed_at=case when cursor+processed>=total_files then now() end,expires_at=case when cursor+processed>=total_files then now()+interval '24 hours' end,lease=null,leased_until=null where id=job.id;
  if exists(select 1 from private.data_job_payloads where data_job_payloads.job_id=job.id and (payload->'included_purposes'->>'health')::boolean) then insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(job.requested_by,job.child_id,'create','health_export_part',job.id); end if;
 end if;
end $$;
create function public.finish_export_expiry(job_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin update public.data_jobs set status='expired',parts='{}' where id=job_id and kind='export' and status='cancelled';delete from private.data_job_payloads where data_job_payloads.job_id=finish_export_expiry.job_id;end $$;
revoke all on function private.export_allowed(public.data_jobs) from public,anon,authenticated;
revoke all on function public.request_data_export(uuid),public.request_child_deletion(uuid,text),public.authorize_export_part(uuid,integer) from public,anon;
grant execute on function public.request_data_export(uuid),public.request_child_deletion(uuid,text),public.authorize_export_part(uuid,integer) to authenticated;
revoke all on function public.claim_data_job(uuid),public.finish_data_job(uuid,uuid,boolean,integer,text),public.finish_export_expiry(uuid) from public,anon,authenticated;
grant execute on function public.claim_data_job(uuid),public.finish_data_job(uuid,uuid,boolean,integer,text),public.finish_export_expiry(uuid) to service_role;
