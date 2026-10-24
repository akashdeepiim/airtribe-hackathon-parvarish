begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) select ('05000000-0000-4000-8000-00000000000'||i)::uuid,'activity-test-'||i||'@example.test',now() from generate_series(1,5) i;
insert into public.children(id,name,dob,created_by) values('15000000-0000-4000-8000-000000000001','TEST',current_date-365,'05000000-0000-4000-8000-000000000001');
insert into public.child_members(child_id,user_id,role) select '15000000-0000-4000-8000-000000000001',('05000000-0000-4000-8000-00000000000'||i)::uuid,(array['owner','co_parent','family_contributor','family_viewer'])[i]::public.member_role from generate_series(1,4) i;
insert into public.consents(user_id,child_id,purpose,notice_version,verification_method,decision,granted_at)
 select m.user_id,m.child_id,p,'2026-10-24.v2','self_declaration','granted',now() from public.child_members m cross join unnest(enum_range(null::public.consent_purpose)) p where child_id='15000000-0000-4000-8000-000000000001';
insert into public.activity_batches(id,child_id,week_start,items,model,prompt_version) values('65000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001',current_date-14,'[{},{},{}]','test','test');
create schema activity_test;
grant usage on schema activity_test to authenticated;
create function activity_test.role_check(i integer,label text,parent boolean) returns setof text language plpgsql as $$
declare cid uuid:='15000000-0000-4000-8000-000000000001'; stmt text; begin
 perform set_config('request.jwt.claim.sub',('05000000-0000-4000-8000-00000000000'||i)::text,true);
 stmt:=format('select public.set_activity_preferences(%L,10,%L,%L,%L)',cid,'indoors','free','Singing');
 if parent then
  return next lives_ok(stmt,label||': can update constraints');
  return next is((select count(*) from public.activity_preferences where child_id=cid),1::bigint,label||': reads own preferences');
  return next lives_ok(format('select public.record_activity_feedback(%L,%L,0,%L)',cid,'65000000-0000-4000-8000-000000000001','did_it'),label||': feedback');
 else
  return next throws_ok(stmt,'PT403',null,label||': cannot update preferences');
  return next is((select count(*) from public.activity_preferences where child_id=cid),0::bigint,label||': no preference read');
  return next throws_ok(format('select public.record_activity_feedback(%L,%L,0,%L)',cid,'65000000-0000-4000-8000-000000000001','did_it'),'PT403',null,label||': cannot leave feedback');
 end if;
 return next throws_ok(format('select public.claim_activity_generation(%L,%L)',cid,'05000000-0000-4000-8000-000000000001'),'42501',null,label||': cannot bypass Edge generation validator');
end $$;
grant execute on function activity_test.role_check(integer,text,boolean) to authenticated;
set local role authenticated;
select * from activity_test.role_check(1,'owner',true);
select * from activity_test.role_check(2,'co_parent',true);
select * from activity_test.role_check(3,'contributor',false);
select * from activity_test.role_check(4,'viewer',false);
select * from activity_test.role_check(5,'non_member',false);
select set_config('request.jwt.claim.sub','05000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.record_activity_feedback('15000000-0000-4000-8000-000000000001','65000000-0000-4000-8000-000000000001',4,'up')$$,'PT400',null,'Reject out of range activity');
select throws_ok($$select public.record_activity_feedback('15000000-0000-4000-8000-000000000001','65000000-0000-4000-8000-000000000001',0,'did_it','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')$$,'PT400',null,'Cross-child memory rejected');
select lives_ok($$select public.record_activity_feedback('15000000-0000-4000-8000-000000000001','65000000-0000-4000-8000-000000000001',0,'up')$$,'Positive feedback saved');
select lives_ok($$select public.record_activity_feedback('15000000-0000-4000-8000-000000000001','65000000-0000-4000-8000-000000000001',0,'down')$$,'Feedback may change');
reset role;
select is((select count(*) from public.activity_feedback where child_id='15000000-0000-4000-8000-000000000001' and signal in('up','down')),1::bigint,'Up and down are mutually exclusive');
select lives_ok($$select public.claim_activity_generation('15000000-0000-4000-8000-000000000001','05000000-0000-4000-8000-000000000001')$$,'Service gets minimal consented activity context');
select throws_ok($$select public.claim_activity_generation('15000000-0000-4000-8000-000000000001','05000000-0000-4000-8000-000000000001')$$,'PT409',null,'Concurrent generation is leased');
select ok((select count(*)>0 from public.audit_log where child_id='15000000-0000-4000-8000-000000000001' and action='read_for_activity_safety'),'Safety data access is audited');
select set_config('request.jwt.claim.sub','05000000-0000-4000-8000-000000000001',true);
select public.set_consent('15000000-0000-4000-8000-000000000001','personalisation',false,'2026-10-24.v2');
select throws_ok($$select public.claim_activity_generation('15000000-0000-4000-8000-000000000001','05000000-0000-4000-8000-000000000001')$$,'PT403',null,'Withdrawal prevents background generation');
select ok((select relrowsecurity from pg_class where oid='public.activity_preferences'::regclass),'New child preferences use RLS');
select * from finish(); rollback;
