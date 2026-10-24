create unique index cleanup_unique_object on private.photo_cleanup_jobs(bucket,object_path);
-- Health values never have a direct SELECT policy. Every returned record is audited.
create table public.growth_measurements (
 id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
 measured_on date not null, weight_kg numeric check(weight_kg>0 and weight_kg<=100),
 height_cm numeric check(height_cm between 20 and 160), head_cm numeric check(head_cm between 10 and 70),
 height_method text not null default 'length' check(height_method in ('length','height')),
 notes text not null default '' check(length(notes)<=2000), recorded_by uuid not null references public.users(id),
 created_at timestamptz not null default now(), check(num_nonnulls(weight_kg,height_cm,head_cm)>0)
);
alter table public.growth_measurements enable row level security;
revoke all on public.growth_measurements from public,anon,authenticated;
grant select on public.growth_measurements to authenticated; -- RLS denies all direct reads.
create index growth_by_child on public.growth_measurements(child_id,measured_on);
create function public.read_growth(cid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); result jsonb; begin
 if not private.can(cid,'health.read','health') then raise sqlstate 'PT403' using message='You do not have access to health records.'; end if;
 insert into public.audit_log(actor_id,child_id,action,entity,entity_id) select uid,cid,'read','growth_measurements',id from public.growth_measurements where child_id=cid;
 insert into public.audit_log(actor_id,child_id,action,entity) values(uid,cid,'read','growth_collection');
 select coalesce(jsonb_agg(g order by measured_on desc),'[]') into result from public.growth_measurements g where child_id=cid;
 return result;
end $$;
create function public.write_growth(cid uuid,record_id uuid,payload jsonb,remove boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); rid uuid:=coalesce(record_id,gen_random_uuid()); birthday date; begin
 if not private.can(cid,'health.write','health') then raise sqlstate 'PT403' using message='You do not have access to edit health records.'; end if;
 if remove is null then raise sqlstate 'PT400' using message='Choose an action.'; end if;
 if record_id is not null and not exists(select 1 from public.growth_measurements where id=rid and child_id=cid) then raise sqlstate 'PT404' using message='Record unavailable.'; end if;
 if remove then delete from public.growth_measurements where id=rid and child_id=cid;
 else
  select dob into birthday from public.children where id=cid;
  if (payload->>'measured_on')::date not between birthday and current_date or payload->>'measured_on' is null then raise sqlstate 'PT400' using message='Check the measurement date.'; end if;
  insert into public.growth_measurements(id,child_id,measured_on,weight_kg,height_cm,head_cm,height_method,notes,recorded_by)
   values(rid,cid,(payload->>'measured_on')::date,(payload->>'weight_kg')::numeric,(payload->>'height_cm')::numeric,(payload->>'head_cm')::numeric,coalesce(payload->>'height_method','length'),coalesce(payload->>'notes',''),uid)
   on conflict(id) do update set measured_on=excluded.measured_on,weight_kg=excluded.weight_kg,height_cm=excluded.height_cm,head_cm=excluded.head_cm,height_method=excluded.height_method,notes=excluded.notes,recorded_by=uid;
 end if;
 insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(uid,cid,case when remove then 'delete' when record_id is null then 'create' else 'update' end,'growth_measurements',rid);
 return rid;
end $$;
-- A client may upload only into its own child-scoped folder. Reading is RPC + Edge only.
create policy health_photos_upload on storage.objects for insert to authenticated with check (
 bucket_id='health-photos' and split_part(name,'/',2)=auth.uid()::text and private.can(private.object_child(name),'health.write','health')
);
create function public.set_vaccination_card(cid uuid,record_id uuid,object_path text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); old_path text; begin
 if not private.can(cid,'health.write','health') then raise sqlstate 'PT403' using message='You do not have access to edit health records.'; end if;
 select card_photo_path into old_path from public.vaccination_logs where id=record_id and child_id=cid for update;
 if not found then raise sqlstate 'PT404' using message='Record unavailable.'; end if;
 if object_path is not null and (split_part(object_path,'/',1)<>cid::text or split_part(object_path,'/',2)<>uid::text or not exists(select 1 from storage.objects where bucket_id='health-photos' and name=object_path)) then raise sqlstate 'PT400' using message='Choose an uploaded card photo.'; end if;
 if old_path is not null and old_path is distinct from object_path then
  insert into private.photo_cleanup_jobs(child_id,bucket,object_path,requested_by) values(cid,'health-photos',old_path,uid) on conflict do nothing;
 end if;
 update public.vaccination_logs set card_photo_path=object_path where id=record_id;
 insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(uid,cid,'update','vaccination_card',record_id);
end $$;
create function public.authorize_health_photo(cid uuid,record_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); path text; begin
 if not private.can(cid,'health.read','health') then raise sqlstate 'PT403' using message='You do not have access to health records.'; end if;
 select card_photo_path into path from public.vaccination_logs where id=record_id and child_id=cid;
 if path is null then raise sqlstate 'PT404' using message='Card unavailable.'; end if;
 insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(uid,cid,'read','vaccination_card',record_id);
 return path;
end $$;
create function public.remove_health_record(cid uuid,entity text,record_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); path text; begin
 if not private.can(cid,'health.write','health') then raise sqlstate 'PT403' using message='You do not have access to edit health records.'; end if;
 if entity='vaccination_logs' then
  select card_photo_path into path from public.vaccination_logs where id=record_id and child_id=cid for update;
  if not found then raise sqlstate 'PT404' using message='Record unavailable.'; end if;
  if path is not null then insert into private.photo_cleanup_jobs(child_id,bucket,object_path,requested_by) values(cid,'health-photos',path,uid) on conflict do nothing; end if;
  delete from public.vaccination_logs where id=record_id and child_id=cid;
  insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(uid,cid,'delete',entity,record_id);
 elsif entity='allergies' then perform public.write_health(cid,entity,record_id,'{}',true);
 elsif entity='growth_measurements' then perform public.write_growth(cid,record_id,'{}',true);
 else raise sqlstate 'PT400' using message='Choose a supported record type.';
 end if;
end $$;
revoke all on function public.read_growth(uuid),public.write_growth(uuid,uuid,jsonb,boolean),public.set_vaccination_card(uuid,uuid,text),public.authorize_health_photo(uuid,uuid),public.remove_health_record(uuid,text,uuid) from public,anon;
grant execute on function public.read_growth(uuid),public.write_growth(uuid,uuid,jsonb,boolean),public.set_vaccination_card(uuid,uuid,text),public.authorize_health_photo(uuid,uuid),public.remove_health_record(uuid,text,uuid) to authenticated;

create function private.audit_health_upload() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.bucket_id='health-photos' then
  insert into public.audit_log(actor_id,child_id,action,entity,entity_id) values(auth.uid(),private.object_child(new.name),'upload','health_photo',new.id);
 end if;
 return new;
end $$;
create trigger audit_health_upload after insert on storage.objects for each row when (new.bucket_id='health-photos') execute function private.audit_health_upload();
revoke all on function private.audit_health_upload() from public,anon,authenticated;
