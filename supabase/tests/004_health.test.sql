begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) select ('02000000-0000-4000-8000-00000000000'||i)::uuid,'health-test-'||i||'@example.test',now() from generate_series(1,5) i;
insert into public.children(id,name,dob,created_by) values('12000000-0000-4000-8000-000000000001','TEST',current_date-365,'02000000-0000-4000-8000-000000000001');
insert into public.child_members(child_id,user_id,role) select '12000000-0000-4000-8000-000000000001',('02000000-0000-4000-8000-00000000000'||i)::uuid,(array['owner','co_parent','family_contributor','family_viewer'])[i]::public.member_role from generate_series(1,4) i;
insert into public.consents(user_id,child_id,purpose,notice_version,verification_method,decision,granted_at)
 select m.user_id,m.child_id,p,'2026-10-24.v2','self_declaration','granted',now() from public.child_members m cross join unnest(enum_range(null::public.consent_purpose)) p where child_id='12000000-0000-4000-8000-000000000001';
insert into public.vaccination_logs(id,child_id,vaccine_name,given_on,card_photo_path) values('42000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','TEST',current_date,'12000000-0000-4000-8000-000000000001/02000000-0000-4000-8000-000000000001/card.jpg');
insert into storage.objects(bucket_id,name) values('health-photos','12000000-0000-4000-8000-000000000001/02000000-0000-4000-8000-000000000001/card.jpg');
create schema health_test;
grant usage on schema health_test to authenticated;
create function health_test.check_role(i integer,label text,parent boolean) returns setof text language plpgsql as $$
declare cid uuid:='12000000-0000-4000-8000-000000000001'; uid uuid:=('02000000-0000-4000-8000-00000000000'||i)::uuid; rid uuid; stmt text; begin
 perform set_config('request.jwt.claim.sub',uid::text,true);
 return next is((select count(*) from public.growth_measurements),0::bigint,label||': no unaudited growth read');
 stmt:=format('select public.write_growth(%L,null,%L)',cid,'{"measured_on":"'||current_date||'","weight_kg":10}');
 if parent then
  return next lives_ok(stmt,label||': can write growth');
  return next lives_ok(format('select public.read_growth(%L)',cid),label||': audited growth read');
  return next lives_ok(format('select public.authorize_health_photo(%L,%L)',cid,'42000000-0000-4000-8000-000000000001'),label||': audited card read');
 else
  return next throws_ok(stmt,'PT403',null,label||': cannot write growth');
  return next throws_ok(format('select public.read_growth(%L)',cid),'PT403',null,label||': no growth access');
  return next throws_ok(format('select public.authorize_health_photo(%L,%L)',cid,'42000000-0000-4000-8000-000000000001'),'PT403',null,label||': no card access');
  return next throws_ok(format('select public.set_vaccination_card(%L,%L,null)',cid,'42000000-0000-4000-8000-000000000001'),'PT403',null,label||': cannot change card');
  return next throws_ok(format('select public.remove_health_record(%L,%L,%L)',cid,'vaccination_logs','42000000-0000-4000-8000-000000000001'),'PT403',null,label||': cannot delete vaccination');
 end if;
 return next is((select count(*) from storage.objects where bucket_id='health-photos'),0::bigint,label||': no direct photo read/signing');
end $$;
grant execute on function health_test.check_role(integer,text,boolean) to authenticated;
set local role authenticated;
select * from health_test.check_role(1,'owner',true);
select * from health_test.check_role(2,'co_parent',true);
select * from health_test.check_role(3,'contributor',false);
select * from health_test.check_role(4,'viewer',false);
select * from health_test.check_role(5,'non_member',false);
select set_config('request.jwt.claim.sub','02000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.write_growth('12000000-0000-4000-8000-000000000001',null,'{"measured_on":"2000-01-01","weight_kg":10}')$$,'PT400',null,'Measurement cannot predate birth');
select throws_ok($$select public.set_vaccination_card('12000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000001','other/missing.jpg')$$,'PT400',null,'Card must exist and belong to child/uploader');
select lives_ok($$select public.set_member_access('12000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000004','Grandparent','{"health.read":true}')$$,'Owner grants viewer health read');
select set_config('request.jwt.claim.sub','02000000-0000-4000-8000-000000000004',true);
select lives_ok($$select public.read_growth('12000000-0000-4000-8000-000000000001')$$,'Explicitly granted viewer can read growth');
select lives_ok($$select public.authorize_health_photo('12000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000001')$$,'Explicitly granted viewer can read card');
select throws_ok($$select public.write_growth('12000000-0000-4000-8000-000000000001',null,'{}')$$,'PT403',null,'Read grant never permits writing');
select set_config('request.jwt.claim.sub','02000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.remove_health_record('12000000-0000-4000-8000-000000000001','vaccination_logs','42000000-0000-4000-8000-000000000001')$$,'Parent removes vaccination with card');
select lives_ok($$select public.set_consent('12000000-0000-4000-8000-000000000001','health',false,'2026-10-24.v2')$$,'Health consent withdrawal');
select throws_ok($$select public.read_growth('12000000-0000-4000-8000-000000000001')$$,'PT403',null,'Withdrawal stops growth access');
reset role;
select is((select count(*) from private.photo_cleanup_jobs where child_id='12000000-0000-4000-8000-000000000001'),1::bigint,'Card deletion queued');
select is((select count(*) from public.audit_log where child_id='12000000-0000-4000-8000-000000000001' and entity='vaccination_card' and action='read'),3::bigint,'Every successful card read audited');
select is((select count(*) from public.audit_log where child_id='12000000-0000-4000-8000-000000000001' and entity='growth_measurements' and action='create'),2::bigint,'Every growth write audited');
select ok((select relrowsecurity from pg_class where oid='public.growth_measurements'::regclass),'Growth table RLS enabled');
select * from finish(); rollback;
