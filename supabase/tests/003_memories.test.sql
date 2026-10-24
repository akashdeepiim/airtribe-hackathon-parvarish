begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) select ('01000000-0000-4000-8000-00000000000'||i)::uuid,'memory-test-'||i||'@example.test',now() from generate_series(1,5) i;
insert into public.children(id,name,dob,created_by) values('11000000-0000-4000-8000-000000000001','TEST',current_date-365,'01000000-0000-4000-8000-000000000001');
insert into public.child_members(child_id,user_id,role) select '11000000-0000-4000-8000-000000000001',('01000000-0000-4000-8000-00000000000'||i)::uuid,(array['owner','co_parent','family_contributor','family_viewer'])[i]::public.member_role from generate_series(1,4) i;
insert into public.consents(user_id,child_id,purpose,notice_version,verification_method,decision,granted_at)
 select m.user_id,m.child_id,p,'2026-10-24.v2','self_declaration','granted',now() from public.child_members m cross join unnest(enum_range(null::public.consent_purpose)) p where child_id='11000000-0000-4000-8000-000000000001';
insert into storage.objects(bucket_id,name) select 'child-photos','11000000-0000-4000-8000-000000000001/01000000-0000-4000-8000-00000000000'||i||'/test.jpg' from generate_series(1,5)i;
insert into public.memories(id,child_id,uploaded_by,storage_path,taken_at) select ('31000000-0000-4000-8000-00000000000'||i)::uuid,'11000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001/01000000-0000-4000-8000-000000000001/other-'||i||'.jpg',now() from generate_series(1,5)i;
create schema memory_test;
grant usage on schema memory_test to authenticated;
create function memory_test.check_role(i integer,label text,can_add boolean,parent boolean) returns setof text language plpgsql as $$
declare cid uuid:='11000000-0000-4000-8000-000000000001'; uid uuid:=('01000000-0000-4000-8000-00000000000'||i)::uuid; mid uuid:=('32000000-0000-4000-8000-00000000000'||i)::uuid; path text:=cid::text||'/'||uid::text||'/test.jpg'; stmt text; begin
 perform set_config('request.jwt.claim.sub',uid::text,true);
 stmt:=format('select public.record_memory(%L,%L,%L,now(),%L)',mid,cid,path,'TEST CAPTION');
 if can_add then
  return next lives_ok(stmt,label||': upload can become memory');
  return next lives_ok(stmt,label||': retry is idempotent');
  return next is((select count(*) from public.memories where id=mid),1::bigint,label||': one saved row');
  return next lives_ok(format('select public.remove_memory(%L)',mid),label||': can remove own memory');
  return next is((select count(*) from public.memories where id=mid),0::bigint,label||': removed from timeline');
 else
  return next throws_ok(stmt,'PT403',null,label||': cannot add memory');
  return next throws_ok(format('select public.remove_memory(%L)',mid),'PT403',null,label||': cannot remove memory');
 end if;
 stmt:=format('select public.remove_memory(%L)',('31000000-0000-4000-8000-00000000000'||i)::uuid);
 if parent then return next lives_ok(stmt,label||': can remove another contribution');
 else return next throws_ok(stmt,'PT403',null,label||': cannot remove another contribution'); end if;
 return next throws_ok('select * from private.photo_cleanup_jobs','42501',null,label||': queue cannot expose private paths');
 return next throws_ok('select public.claim_photo_cleanup(null)','42501',null,label||': cannot impersonate cleanup worker');
end $$;
grant execute on function memory_test.check_role(integer,text,boolean,boolean) to authenticated;
set local role authenticated;
select * from memory_test.check_role(1,'owner',true,true);
select * from memory_test.check_role(2,'co_parent',true,true);
select * from memory_test.check_role(3,'contributor',true,false);
select * from memory_test.check_role(4,'viewer',false,false);
select * from memory_test.check_role(5,'non_member',false,false);
select set_config('request.jwt.claim.sub','01000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.record_memory(gen_random_uuid(),'11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001/01000000-0000-4000-8000-000000000001/missing.jpg',now())$$,'PT400',null,'Cannot record nonexistent photo');
select throws_ok($$select public.record_memory(gen_random_uuid(),'11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001/01000000-0000-4000-8000-000000000002/test.jpg',now())$$,'PT400',null,'Cannot attach another uploader object');
select lives_ok($$select public.set_consent('11000000-0000-4000-8000-000000000001','memories',false,'2026-10-24.v2')$$,'Memories consent can be withdrawn');
select throws_ok($$select public.record_memory(gen_random_uuid(),'11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001/01000000-0000-4000-8000-000000000001/test.jpg',now())$$,'PT403',null,'Withdrawal prevents upload recording');
reset role;
select is((select count(*) from private.photo_cleanup_jobs where child_id='11000000-0000-4000-8000-000000000001'),5::bigint,'Every successful deletion creates a cleanup job');
select ok((select relrowsecurity from pg_class where oid='private.photo_cleanup_jobs'::regclass),'Private cleanup table has RLS');
set local role service_role;
select is((select count(*) from public.claim_photo_cleanup()),5::bigint,'Worker claims only pending cleanup');
select is((select count(*) from public.claim_photo_cleanup()),0::bigint,'Worker claims are locked against duplicates');
reset role;
select * from finish();
rollback;
