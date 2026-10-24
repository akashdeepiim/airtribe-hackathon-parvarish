create table public.activity_preferences(
 child_id uuid primary key references public.children(id) on delete cascade,
 minutes integer not null default 10 check(minutes in(5,10,20,30)),location text not null default 'indoors' check(location in('indoors','outdoors','either')),
 budget text not null default 'free' check(budget in('free','low')),latest_answer text not null default '' check(length(latest_answer)<=400),answered_at timestamptz,
 updated_by uuid not null references public.users(id)
);
alter table public.activity_preferences enable row level security;
revoke all on public.activity_preferences from public,anon,authenticated;
grant select on public.activity_preferences to authenticated;
create policy activity_preferences_read on public.activity_preferences for select to authenticated using(private.can(child_id,'activities.read','personalisation'));
create function public.set_activity_preferences(cid uuid,time_minutes integer,place text,cost text,answer text default null) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); begin
 if not private.can(cid,'profile.edit','personalisation') then raise sqlstate 'PT403' using message='Personalisation consent and profile editing access are needed.'; end if;
 if time_minutes not in(5,10,20,30) or time_minutes is null or place not in('indoors','outdoors','either') or place is null or cost not in('free','low') or cost is null or length(coalesce(answer,''))>400 then raise sqlstate 'PT400' using message='Check activity preferences.'; end if;
 insert into public.activity_preferences(child_id,minutes,location,budget,latest_answer,answered_at,updated_by) values(cid,time_minutes,place,cost,coalesce(answer,''),case when answer is not null then now() end,uid)
 on conflict(child_id) do update set minutes=excluded.minutes,location=excluded.location,budget=excluded.budget,latest_answer=coalesce(answer,public.activity_preferences.latest_answer),answered_at=case when answer is not null then now() else public.activity_preferences.answered_at end,updated_by=uid;
end $$;
create table private.activity_generation_jobs(child_id uuid references public.children(id) on delete cascade,week_start date,lease uuid not null,leased_until timestamptz not null,actor_id uuid not null references public.users(id),primary key(child_id,week_start));
alter table private.activity_generation_jobs enable row level security;
revoke all on private.activity_generation_jobs from public,anon,authenticated;
create function public.claim_activity_generation(cid uuid,actor uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_claim text:=current_setting('request.jwt.claim.sub',true); week date:=date_trunc('week',now() at time zone 'Asia/Kolkata')::date; token uuid:=gen_random_uuid(); result jsonb; health_ok boolean; begin
 perform set_config('request.jwt.claim.sub',actor::text,true);
 if not private.can(cid,'profile.edit','personalisation') or not private.can(cid,'activities.read','personalisation') then raise sqlstate 'PT403' using message='Personalisation is not enabled.'; end if;
 if exists(select 1 from public.activity_batches where child_id=cid and week_start=week) then return jsonb_build_object('existing',true); end if;
 insert into private.activity_generation_jobs values(cid,week,token,now()+interval '3 minutes',actor)
 on conflict(child_id,week_start) do update set lease=token,leased_until=excluded.leased_until,actor_id=actor where private.activity_generation_jobs.leased_until<now();
 if not found then raise sqlstate 'PT409' using message='Activities are being prepared. Try again shortly.'; end if;
 health_ok:=private.can(cid,'health.read','health');
 if health_ok then
  insert into public.audit_log(actor_id,child_id,action,entity,entity_id) select actor,cid,'read_for_activity_safety','allergies',id from public.allergies where child_id=cid;
  insert into public.audit_log(actor_id,child_id,action,entity) values(actor,cid,'read_for_activity_safety','allergy_collection');
 end if;
 select jsonb_build_object('lease',token,'week_start',week,'age_months',floor((current_date-c.dob)/30.4375),'city',c.city,'interests',c.interests,
 'milestones',case when private.can(cid,'milestones.read','milestones') then coalesce((select jsonb_agg(jsonb_build_object('title',mc.title,'domain',mc.domain,'status',cm.status)) from public.child_milestones cm join public.milestone_catalog mc on mc.id=cm.milestone_id where cm.child_id=cid and private.catalog_published(mc.id) and (cm.achieved_on>current_date-90 or cm.status='not_yet')),'[]') else '[]'::jsonb end,
 'in_window',case when private.can(cid,'milestones.read','milestones') then coalesce((select jsonb_agg(jsonb_build_object('title',mc.title,'domain',mc.domain)) from public.milestone_catalog mc where private.catalog_published(mc.id) and (current_date-c.dob)/30.4375 between mc.window_start_months and mc.consult_by_months),'[]') else '[]'::jsonb end,
 'allergens',case when health_ok then coalesce((select jsonb_agg(allergen) from public.allergies where child_id=cid),'[]') else '[]'::jsonb end,
 'allergy_screened',health_ok,'constraints',coalesce((select to_jsonb(p)-'child_id'-'updated_by' from public.activity_preferences p where child_id=cid),'{"minutes":10,"location":"indoors","budget":"free","latest_answer":""}'::jsonb)) into result from public.children c where id=cid;
 perform set_config('request.jwt.claim.sub',coalesce(current_claim,''),true);return result;
end $$;
create function public.finish_activity_generation(cid uuid,actor uuid,token uuid,activities jsonb,model_name text,version text) returns uuid language plpgsql security definer set search_path='' as $$
declare current_claim text:=current_setting('request.jwt.claim.sub',true); week date; rid uuid; begin
 perform set_config('request.jwt.claim.sub',actor::text,true);
 if not private.can(cid,'profile.edit','personalisation') then raise sqlstate 'PT403' using message='Personalisation is not enabled.'; end if;
 select week_start into week from private.activity_generation_jobs where child_id=cid and actor_id=actor and lease=token and leased_until>now() for update;
 if not found then raise sqlstate 'PT409' using message='Preparation expired. Try again.'; end if;
 if jsonb_typeof(activities)<>'array' or jsonb_array_length(activities)<>3 then raise sqlstate 'PT400' using message='Three validated activities are required.'; end if;
 insert into public.activity_batches(child_id,week_start,items,model,prompt_version) values(cid,week,activities,model_name,version) on conflict(child_id,week_start) do nothing returning id into rid;
 if rid is null then select id into rid from public.activity_batches where child_id=cid and week_start=week; end if;
 delete from private.activity_generation_jobs where child_id=cid and lease=token;
 perform set_config('request.jwt.claim.sub',coalesce(current_claim,''),true);return rid;
end $$;
-- Feedback uses live permissions and validates the memory belongs to this same child.
create function public.record_activity_feedback(cid uuid,batch uuid,item_index integer,answer text,photo uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_auth(); begin
 if not private.can(cid,'activities.feedback','personalisation') then raise sqlstate 'PT403' using message='Activity feedback access is needed.'; end if;
 if answer is null or answer not in('up','down','did_it') or item_index is null or item_index not between 0 and 2 or not exists(select 1 from public.activity_batches where child_id=cid and id=batch) then raise sqlstate 'PT400' using message='Choose an activity from this child.'; end if;
 if photo is not null and (answer<>'did_it' or not private.can(cid,'memories.read','memories') or not exists(select 1 from public.memories where child_id=cid and id=photo)) then raise sqlstate 'PT400' using message='Choose a memory from this child.'; end if;
 if answer in('up','down') then delete from public.activity_feedback where batch_id=batch and activity_index=item_index and user_id=uid and signal in('up','down'); end if;
 insert into public.activity_feedback(child_id,batch_id,activity_index,user_id,signal,memory_id) values(cid,batch,item_index,uid,answer,photo)
 on conflict(batch_id,activity_index,user_id,signal) do update set memory_id=coalesce(excluded.memory_id,public.activity_feedback.memory_id);
end $$;
revoke insert,update,delete on public.activity_feedback from authenticated;
revoke all on function public.set_activity_preferences(uuid,integer,text,text,text),public.record_activity_feedback(uuid,uuid,integer,text,uuid) from public,anon;
grant execute on function public.set_activity_preferences(uuid,integer,text,text,text),public.record_activity_feedback(uuid,uuid,integer,text,uuid) to authenticated;
revoke all on function public.claim_activity_generation(uuid,uuid),public.finish_activity_generation(uuid,uuid,uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.claim_activity_generation(uuid,uuid),public.finish_activity_generation(uuid,uuid,uuid,jsonb,text,text) to service_role;
