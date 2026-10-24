-- Durable, privacy-preserving reminders and background maintenance.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
alter table public.notification_preferences add column push_enabled boolean not null default true;
alter table public.notification_preferences add constraint valid_timezone check(timezone in ('Asia/Kolkata','UTC','Europe/London','America/New_York','America/Los_Angeles','Asia/Singapore','Australia/Sydney'));
alter table public.notifications_log add column milestone_id uuid references public.milestone_catalog(id);
alter table public.notifications_log add column delivered_at timestamptz;
alter table public.notifications_log add column delivery_status text not null default 'in_app' check(delivery_status in('in_app','sending','sent','failed','cancelled'));
alter table public.notifications_log add column lease_until timestamptz;
create table public.push_devices(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.users(id) on delete cascade,token text not null unique check(token ~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'),platform text not null check(platform in('ios','android')),updated_at timestamptz not null default now());
alter table public.push_devices enable row level security;
revoke all on public.push_devices from public,anon,authenticated;
grant select,insert,update,delete on public.push_devices to authenticated;
create policy own_devices on public.push_devices for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create function public.save_notification_preferences(cid uuid,show_name boolean,start_time time,end_time time,zone text,push boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.purpose_enabled(cid,'notifications') then raise sqlstate 'PT403' using message='Enable notifications consent first.'; end if;
 if show_name is null or start_time is null or end_time is null or zone is null or push is null or start_time=end_time then raise sqlstate 'PT400' using message='Choose a valid quiet period.'; end if;
 insert into public.notification_preferences(child_id,user_id,show_child_name,quiet_start,quiet_end,timezone,push_enabled) values(cid,auth.uid(),show_name,start_time,end_time,zone,push) on conflict(child_id,user_id) do update set show_child_name=show_name,quiet_start=start_time,quiet_end=end_time,timezone=zone,push_enabled=push;
end $$;
create function private.is_quiet(moment timestamptz,start_time time,end_time time,zone text) returns boolean language sql immutable set search_path='' as $$
 select case when start_time>end_time then (moment at time zone zone)::time>=start_time or (moment at time zone zone)::time<end_time else (moment at time zone zone)::time>=start_time and (moment at time zone zone)::time<end_time end
$$;
create function public.enqueue_reminders(moment timestamptz default now()) returns integer language plpgsql security definer set search_path='' as $$
declare c record; pref public.notification_preferences; mid uuid; n integer:=0; months numeric; due boolean; begin
 perform pg_advisory_xact_lock(hashtextextended('parvarish-reminders',0));
 for c in select ch.id,ch.dob,m.user_id from public.children ch join public.child_members m on m.child_id=ch.id and m.role='owner' and m.status='active' where ch.deleted_at is null loop
  perform set_config('request.jwt.claim.sub',c.user_id::text,true);
  if not private.purpose_enabled(c.id,'notifications') then continue; end if;
  select * into pref from public.notification_preferences where child_id=c.id and user_id=c.user_id;
  if private.is_quiet(moment,coalesce(pref.quiet_start,'21:00'),coalesce(pref.quiet_end,'08:00'),coalesce(pref.timezone,'Asia/Kolkata')) then continue;end if;
  months:=(moment::date-c.dob)/30.4375;
  if private.can(c.id,'milestones.read','milestones') and not exists(select 1 from public.notifications_log where child_id=c.id and type='milestone' and sent_at>moment-interval '7 days') then
   select mc.id into mid from public.milestone_catalog mc left join public.child_milestones cm on cm.child_id=c.id and cm.milestone_id=mc.id
    where private.catalog_published(mc.id) and mc.window_start_months<=months and mc.consult_by_months>months
    and coalesce(cm.status,'not_yet')='not_yet' and coalesce(cm.nudges_enabled,true) and (cm.next_prompt_at is null or cm.next_prompt_at<=moment)
    order by (select max(sent_at) from public.notifications_log where child_id=c.id and milestone_id=mc.id) nulls first,mc.window_start_months desc,mc.id limit 1;
   if mid is not null then
    insert into public.notifications_log(user_id,child_id,type,milestone_id,sent_at) values(c.user_id,c.id,'milestone',mid,moment);
    update public.child_milestones set last_prompted_at=moment where child_id=c.id and milestone_id=mid;n:=n+1;
   end if;
  end if;
  if private.can(c.id,'memories.add','memories') and coalesce((select max(created_at) from public.memories where child_id=c.id),(select created_at from public.children where id=c.id))<=moment-interval '14 days'
   and not exists(select 1 from public.notifications_log where child_id=c.id and type='memory' and sent_at>moment-interval '14 days') then
   insert into public.notifications_log(user_id,child_id,type,sent_at) values(c.user_id,c.id,'memory',moment);n:=n+1;
  end if;
  if private.can(c.id,'activities.read','personalisation') and exists(select 1 from public.activity_batches where child_id=c.id and week_start=date_trunc('week',moment at time zone 'Asia/Kolkata')::date)
   and not exists(select 1 from public.notifications_log where child_id=c.id and type='activities' and sent_at>=date_trunc('week',moment at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') then
   insert into public.notifications_log(user_id,child_id,type,sent_at) values(c.user_id,c.id,'activities',moment);n:=n+1;
  end if;
  if private.can(c.id,'health.read','health') and not exists(select 1 from public.notifications_log where child_id=c.id and type='vaccination' and sent_at>moment-interval '7 days') then
   insert into public.audit_log(actor_id,child_id,action,entity) values(c.user_id,c.id,'read_for_reminder','vaccination_preferences');
   if exists(select 1 from public.vaccination_preferences where child_id=c.id and reminders_enabled) then
    insert into public.audit_log(actor_id,child_id,action,entity) values(c.user_id,c.id,'read_for_reminder','vaccination_reminders');
    select exists(select 1 from public.vaccination_preferences vp join public.vaccination_schedule s on s.plan=vp.plan left join public.vaccination_reminders vr on vr.child_id=c.id and vr.item_id=s.id
     where vp.child_id=c.id and not coalesce(vr.excluded,false) and vr.vaccination_log_id is null and (not s.requires_confirmed_date or vr.appointment_on is not null)
     and coalesce(vr.appointment_on,(c.dob+case when s.age_unit='days' then make_interval(days=>s.age_start) else make_interval(months=>s.age_start) end)::date) between moment::date and moment::date+7) into due;
    if due then insert into public.notifications_log(user_id,child_id,type,sent_at) values(c.user_id,c.id,'vaccination',moment);n:=n+1;end if;
   end if;
  end if;
 end loop;return n;
end $$;
create function public.pending_activity_children() returns table(child_id uuid,actor uuid) language sql stable security definer set search_path='' as $$
 select c.id,m.user_id from public.children c join public.child_members m on m.child_id=c.id and m.role='owner' and m.status='active'
 where c.deleted_at is null and private.user_consented(c.id,m.user_id,'personalisation')
 and not exists(select 1 from public.activity_batches b where b.child_id=c.id and b.week_start=date_trunc('week',now() at time zone 'Asia/Kolkata')::date)
 order by c.created_at limit 5
$$;
create function public.claim_pushes() returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.notifications_log; pref public.notification_preferences; result jsonb:='[]'::jsonb; devices jsonb; nm text; begin
 for n in select * from public.notifications_log where (delivery_status='in_app' or (delivery_status='sending' and lease_until<now())) and sent_at>now()-interval '2 days' and response is null order by sent_at for update skip locked limit 50 loop
  perform set_config('request.jwt.claim.sub',n.user_id::text,true);
  if not private.purpose_enabled(n.child_id,'notifications') or
    (n.type='milestone' and not private.can(n.child_id,'milestones.read','milestones')) or
    (n.type='memory' and not private.can(n.child_id,'memories.read','memories')) or
    (n.type='activities' and not private.can(n.child_id,'activities.read','personalisation')) or
    (n.type='vaccination' and not private.can(n.child_id,'health.read','health')) then
   update public.notifications_log set delivery_status='cancelled' where id=n.id;continue;
  end if;
  select * into pref from public.notification_preferences where child_id=n.child_id and user_id=n.user_id;
  if pref.push_enabled=false or private.is_quiet(now(),coalesce(pref.quiet_start,'21:00'),coalesce(pref.quiet_end,'08:00'),coalesce(pref.timezone,'Asia/Kolkata')) then continue;end if;
  select jsonb_agg(token) into devices from public.push_devices where user_id=n.user_id;
  if devices is null then continue;end if;
  select case when pref.show_child_name then name else null end into nm from public.children where id=n.child_id;
  update public.notifications_log set delivery_status='sending',lease_until=now()+interval '3 minutes' where id=n.id;
  result:=result||jsonb_build_array(jsonb_build_object('id',n.id,'childId',n.child_id,'type',n.type,'name',nm,'tokens',devices));
 end loop;return result;
end $$;
create function public.finish_push(nid uuid,success boolean,invalid_tokens text[] default '{}') returns void language plpgsql security definer set search_path='' as $$
begin update public.notifications_log set delivery_status=case when success then 'sent' else 'failed' end,delivered_at=case when success then now() end,lease_until=null where id=nid and delivery_status='sending';delete from public.push_devices where token=any(invalid_tokens);end $$;
create function public.dismiss_reminder(nid uuid) returns void language plpgsql security definer set search_path='' as $$
begin update public.notifications_log set response='dismissed' where id=nid and user_id=auth.uid() and private.purpose_enabled(child_id,'notifications');end $$;
-- Reconcile incomplete client uploads. Keep a 24-hour grace period for interrupted uploads.
create function public.queue_orphan_photos() returns integer language plpgsql security definer set search_path='' as $$
declare o record;n integer:=0;cid uuid;begin
 for o in select bucket_id,name from storage.objects where bucket_id in('child-photos','health-photos') and created_at<now()-interval '24 hours'
 and not exists(select 1 from public.memories where storage_path=name) and not exists(select 1 from public.children where avatar_path=name)
 and not exists(select 1 from public.vaccination_logs where card_photo_path=name) limit 100 loop
  begin cid:=split_part(o.name,'/',1)::uuid;exception when invalid_text_representation then continue;end;
  insert into private.photo_cleanup_jobs(child_id,bucket,object_path) values(cid,o.bucket_id,o.name) on conflict do nothing;
  if o.bucket_id='health-photos' and exists(select 1 from public.children where id=cid) then insert into public.audit_log(child_id,action,entity) values(cid,'delete_orphan','vaccination_card');end if;n:=n+1;
 end loop;return n;
end $$;
create table private.background_settings(singleton boolean primary key default true check(singleton),endpoint text not null);
alter table private.background_settings enable row level security;
revoke all on private.background_settings from public,anon,authenticated;
do $$begin if not exists(select 1 from vault.secrets where name='parvarish_worker_token') then perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'parvarish_worker_token');end if;end $$;
create function public.authorize_background_worker(candidate text) returns boolean language sql stable security definer set search_path='' as $$
 select candidate is not null and extensions.digest(candidate,'sha256')=(select extensions.digest(decrypted_secret,'sha256') from vault.decrypted_secrets where name='parvarish_worker_token')
$$;
create function private.dispatch_background() returns void language plpgsql security definer set search_path='' as $$
declare target text;secret text;begin
 select endpoint into target from private.background_settings where singleton;
 if target is null then return;end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='parvarish_worker_token';
 perform net.http_post(url:=target,headers:=jsonb_build_object('Content-Type','application/json','x-worker-token',secret),body:='{}',timeout_milliseconds:=1000);
end $$;
create function public.configure_background_jobs(project_url text) returns void language plpgsql security definer set search_path='' as $$
begin
 if project_url !~ '^https://[a-z0-9]+\.supabase\.co$' then raise exception 'Use the Supabase project HTTPS URL';end if;
 insert into private.background_settings values(true,project_url||'/functions/v1/background-jobs') on conflict(singleton) do update set endpoint=excluded.endpoint;
 perform cron.schedule('parvarish-maintenance','*/5 * * * *','select private.dispatch_background()');
end $$;
revoke all on function public.save_notification_preferences(uuid,boolean,time,time,text,boolean),public.dismiss_reminder(uuid) from public,anon;
grant execute on function public.save_notification_preferences(uuid,boolean,time,time,text,boolean),public.dismiss_reminder(uuid) to authenticated;
revoke all on function private.is_quiet(timestamptz,time,time,text),private.dispatch_background() from public,anon,authenticated;
revoke all on function public.enqueue_reminders(timestamptz),public.pending_activity_children(),public.claim_pushes(),public.finish_push(uuid,boolean,text[]),public.queue_orphan_photos(),public.authorize_background_worker(text),public.configure_background_jobs(text) from public,anon,authenticated;
grant execute on function public.enqueue_reminders(timestamptz),public.pending_activity_children(),public.claim_pushes(),public.finish_push(uuid,boolean,text[]),public.queue_orphan_photos(),public.authorize_background_worker(text),public.configure_background_jobs(text) to service_role;
