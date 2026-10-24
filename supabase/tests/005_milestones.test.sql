begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) select ('03000000-0000-4000-8000-00000000000'||i)::uuid,'milestone-test-'||i||'@example.test',now() from generate_series(1,5) i;
insert into public.children(id,name,dob,created_by) values('13000000-0000-4000-8000-000000000001','TEST',current_date-365,'03000000-0000-4000-8000-000000000001');
insert into public.child_members(child_id,user_id,role) select '13000000-0000-4000-8000-000000000001',('03000000-0000-4000-8000-00000000000'||i)::uuid,(array['owner','co_parent','family_contributor','family_viewer'])[i]::public.member_role from generate_series(1,4) i;
insert into public.consents(user_id,child_id,purpose,notice_version,verification_method,decision,granted_at)
 select m.user_id,m.child_id,p,'2026-10-24.v2','self_declaration','granted',now() from public.child_members m cross join unnest(enum_range(null::public.consent_purpose)) p where child_id='13000000-0000-4000-8000-000000000001';
insert into public.milestone_catalog(id,domain,title,prompt_question,window_start_months,consult_by_months,source,reassurance_copy,consult_copy,source_review_status,source_verified_at) values
 ('23000000-0000-4000-8000-000000000001','motor','TEST','TEST',2,2,'https://www.cdc.gov/test','TEST','TEST','verified',current_date),
 ('23000000-0000-4000-8000-000000000002','motor','TEST','TEST',2,2,'https://untrusted.example/test','TEST','TEST','verified',current_date),
 ('23000000-0000-4000-8000-000000000003','motor','TEST','TEST',2,2,'https://www.cdc.gov/test','TEST','TEST','unverified',null);
create schema milestone_test;grant usage on schema milestone_test to authenticated;
create function milestone_test.check_role(i integer,label text,parent boolean) returns setof text language plpgsql as $$
declare cid uuid:='13000000-0000-4000-8000-000000000001';mid uuid:='23000000-0000-4000-8000-000000000001';stmt text;begin
 perform set_config('request.jwt.claim.sub',('03000000-0000-4000-8000-00000000000'||i),true);
 return next is((select count(*) from public.milestone_catalog where id::text like '23000000%'),1::bigint,label||': source publication gate');
 stmt:=format('select public.record_milestone(%L,%L,%L)',cid,mid,'not_yet');
 if parent then
  return next lives_ok(stmt,label||': can record not yet');
  return next ok((select next_prompt_at between now()+interval '28 days' and now()+interval '42 days' from public.child_milestones where child_id=cid and milestone_id=mid),label||': re-ask in four to six weeks');
  return next lives_ok(format('select public.set_milestone_nudges(%L,%L,false)',cid,mid),label||': can pause nudges');
  return next is((select nudges_enabled from public.child_milestones where child_id=cid and milestone_id=mid),false,label||': nudge pause persisted');
  return next lives_ok(format('select public.record_milestone(%L,%L,%L,current_date)',cid,mid,'achieved'),label||': can mark achieved');
  return next is((select next_prompt_at from public.child_milestones where child_id=cid and milestone_id=mid),null::timestamptz,label||': achievement clears re-ask');
 else
  return next throws_ok(stmt,'PT403',null,label||': cannot record milestone');
  return next throws_ok(format('select public.set_milestone_nudges(%L,%L,false)',cid,mid),'PT403',null,label||': cannot alter nudges');
  return next throws_ok(format('select public.dismiss_milestone_card(%L,%L)',cid,mid),'PT403',null,label||': cannot dismiss card');
 end if;
end $$;
grant execute on function milestone_test.check_role(integer,text,boolean) to authenticated;
set local role authenticated;
select * from milestone_test.check_role(1,'owner',true);
select * from milestone_test.check_role(2,'co_parent',true);
select * from milestone_test.check_role(3,'contributor',false);
select * from milestone_test.check_role(4,'viewer',false);
select * from milestone_test.check_role(5,'non_member',false);
select set_config('request.jwt.claim.sub','03000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.record_milestone('13000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000003','achieved',current_date)$$,'PT400',null,'Unverified content cannot be tagged');
select throws_ok($$select public.record_milestone('13000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','achieved','2000-01-01')$$,'PT400',null,'Achievement cannot predate birth');
select lives_ok($$select public.set_consent('13000000-0000-4000-8000-000000000001','milestones',false,'2026-10-24.v2')$$,'Withdraw milestone consent');
select throws_ok($$select public.record_milestone('13000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','not_yet')$$,'PT403',null,'Consent withdrawal stops tracking');
select * from finish();rollback;
