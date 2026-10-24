begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) select ('04000000-0000-4000-8000-00000000000'||i)::uuid,'schedule-test-'||i||'@example.test',now() from generate_series(1,5) i;
insert into public.children(id,name,dob,created_by) values('14000000-0000-4000-8000-000000000001','TEST',current_date-365,'04000000-0000-4000-8000-000000000001');
insert into public.child_members(child_id,user_id,role) select '14000000-0000-4000-8000-000000000001',('04000000-0000-4000-8000-00000000000'||i)::uuid,(array['owner','co_parent','family_contributor','family_viewer'])[i]::public.member_role from generate_series(1,4) i;
insert into public.consents(user_id,child_id,purpose,notice_version,verification_method,decision,granted_at)
 select m.user_id,m.child_id,p,'2026-10-24.v2','self_declaration','granted',now() from public.child_members m cross join unnest(enum_range(null::public.consent_purpose)) p where child_id='14000000-0000-4000-8000-000000000001';
create schema schedule_test;
grant usage on schema schedule_test to authenticated;
create function schedule_test.role_check(i integer,label text,parent boolean) returns setof text language plpgsql as $$
declare cid uuid:='14000000-0000-4000-8000-000000000001'; stmt text; begin
 perform set_config('request.jwt.claim.sub',('04000000-0000-4000-8000-00000000000'||i)::text,true);
 return next is((select count(*) from public.vaccination_preferences),0::bigint,label||': no unaudited preference reads');
 return next is((select count(*) from public.vaccination_reminders),0::bigint,label||': no unaudited reminder reads');
 stmt:=format('select public.set_vaccination_plan(%L,%L,true)',cid,'UIP');
 if parent then
  return next lives_ok(stmt,label||': choose schedule');
  return next lives_ok(format('select public.read_vaccination_plan(%L)',cid),label||': audited plan read');
  return next lives_ok(format('select public.set_vaccination_reminder(%L,%L,%L,%L)',cid,'uip-birth-bcg','completed',current_date),label||': record completion');
 else
  return next throws_ok(stmt,'PT403',null,label||': cannot choose schedule');
  return next throws_ok(format('select public.read_vaccination_plan(%L)',cid),'PT403',null,label||': no health access');
  return next throws_ok(format('select public.set_vaccination_reminder(%L,%L,%L,%L)',cid,'uip-birth-bcg','completed',current_date),'PT403',null,label||': cannot record completion');
 end if;
end $$;
grant execute on function schedule_test.role_check(integer,text,boolean) to authenticated;
set local role authenticated;
select * from schedule_test.role_check(1,'owner',true);
select * from schedule_test.role_check(2,'co_parent',true);
select * from schedule_test.role_check(3,'contributor',false);
select * from schedule_test.role_check(4,'viewer',false);
select * from schedule_test.role_check(5,'non_member',false);
select set_config('request.jwt.claim.sub','04000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.set_vaccination_plan('14000000-0000-4000-8000-000000000001','unknown',true)$$,'PT400',null,'Reject unverified schedule');
select throws_ok($$select public.set_vaccination_reminder('14000000-0000-4000-8000-000000000001','uip-birth-opv-0','completed','2000-01-01')$$,'PT400',null,'Reject vaccination before birth');
select throws_ok($$select public.set_vaccination_reminder('14000000-0000-4000-8000-000000000001','uip-birth-opv-0','completed',current_date+1)$$,'PT400',null,'Reject future completion');
select throws_ok($$select public.set_vaccination_reminder('14000000-0000-4000-8000-000000000001','uip-birth-opv-0','completed',null,null,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')$$,'PT400',null,'Existing log must belong to child');
select throws_ok($$select public.write_health('14000000-0000-4000-8000-000000000001','vaccination_logs',null,'{"vaccine_name":"TEST","given_on":"2000-01-01"}')$$,'PT400',null,'Manual API cannot record before birth either');
select lives_ok($$select public.set_vaccination_reminder('14000000-0000-4000-8000-000000000001','uip-9-12-months-je-1','pending',null,current_date+7)$$,'Save clinician-confirmed conditional appointment');
select lives_ok($$select public.set_member_access('14000000-0000-4000-8000-000000000001','04000000-0000-4000-8000-000000000004','Grandparent','{"health.read":true}')$$,'Owner can explicitly grant health read');
select set_config('request.jwt.claim.sub','04000000-0000-4000-8000-000000000004',true);
select lives_ok($$select public.read_vaccination_plan('14000000-0000-4000-8000-000000000001')$$,'Explicit grant permits audited read');
select throws_ok($$select public.set_vaccination_plan('14000000-0000-4000-8000-000000000001','IAP',true)$$,'PT403',null,'Read grant does not allow editing');
select set_config('request.jwt.claim.sub','04000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.set_consent('14000000-0000-4000-8000-000000000001','health',false,'2026-10-24.v2')$$,'Withdraw health consent');
select throws_ok($$select public.read_vaccination_plan('14000000-0000-4000-8000-000000000001')$$,'PT403',null,'Withdrawal stops schedule reads');
select throws_ok($$select public.set_vaccination_plan('14000000-0000-4000-8000-000000000001','IAP',true)$$,'PT403',null,'Withdrawal stops schedule writes');
reset role;
select is((select count(*) from public.vaccination_logs where child_id='14000000-0000-4000-8000-000000000001'),1::bigint,'Retrying completion does not duplicate vaccination');
select is((select count(*) from public.audit_log where child_id='14000000-0000-4000-8000-000000000001' and entity='vaccination_reminders' and action='read'),3::bigint,'Every schedule read audited');
select is((select count(*) from public.audit_log where child_id='14000000-0000-4000-8000-000000000001' and entity='vaccination_reminders' and action='update'),3::bigint,'Every schedule update audited');
select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.vaccination_preferences'::regclass,'public.vaccination_reminders'::regclass,'public.vaccination_schedule'::regclass)),'All new tables have RLS');
select * from finish(); rollback;
