begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

-- Synthetic fixtures only. No clinical content is authored here.
insert into auth.users(id,email,email_confirmed_at) select ('00000000-0000-4000-8000-00000000000'||i)::uuid,'fixture'||i||'@example.test',now() from generate_series(1,6) i;
insert into public.children(id,name,dob,created_by) values
 ('10000000-0000-4000-8000-000000000001','TEST CHILD A',current_date-interval '1 year','00000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002','TEST CHILD B',current_date-interval '2 years','00000000-0000-4000-8000-000000000005');
insert into public.child_members(child_id,user_id,role) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','owner'),
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','co_parent'),
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','family_contributor'),
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','family_viewer'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000005','owner');
insert into public.consents(user_id,child_id,purpose,notice_version,verification_method,decision,granted_at)
 select m.user_id,m.child_id,p,'2026-10-24.v2','self_declaration','granted',now() from public.child_members m cross join unnest(enum_range(null::public.consent_purpose)) p;
insert into public.milestone_catalog(id,domain,title,prompt_question,window_start_months,typical_months,consult_by_months,source,reassurance_copy,consult_copy,clinical_review_status)
 select ('20000000-0000-4000-8000-00000000000'||i)::uuid,'motor','[PLACEHOLDER — pending clinical review]','[PLACEHOLDER — pending clinical review]',0,1,2,'TEST ONLY','[PLACEHOLDER — pending clinical review]','[PLACEHOLDER — pending clinical review]',case when i=1 then 'approved' else 'draft' end from generate_series(1,2) i;
-- An approved placeholder above exists only inside this rolled-back policy test.
insert into public.memories(id,child_id,uploaded_by,storage_path,taken_at) values
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001/one.jpg',now()),
 ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000003/two.jpg',now()),
 ('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000005/three.jpg',now());
insert into public.child_milestones(child_id,milestone_id,status,recorded_by) values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','skipped','00000000-0000-4000-8000-000000000001');
insert into public.allergies(id,child_id,type,allergen,severity) values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','other','TEST VALUE','TEST VALUE');
insert into public.vaccination_logs(child_id,vaccine_name,given_on) values('10000000-0000-4000-8000-000000000001','TEST VALUE',current_date);
insert into public.activity_batches(id,child_id,week_start,items,model,prompt_version) values('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',current_date,'[]','test','test');
insert into public.activity_feedback(child_id,batch_id,activity_index,user_id,signal)
 select '10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001',0,user_id,'up' from public.child_members where child_id='10000000-0000-4000-8000-000000000001';
insert into public.notifications_log(user_id,child_id,type) select user_id,child_id,'test' from public.child_members;
insert into public.notification_preferences(user_id,child_id) select user_id,child_id from public.child_members;
insert into public.community_directory(name,platform,url,description,status) values('TEST','test','https://example.test','TEST','published'),('DRAFT','test','https://example.test','TEST','draft');
insert into public.community_suggestions(user_id,city,name,url) select id,'Bangalore','TEST','https://example.test' from public.users;
insert into public.child_member_permissions(child_id,user_id,capability,allowed,granted_by) values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','memories.delete_all',false,'00000000-0000-4000-8000-000000000001');

select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity),'Every public table has RLS');
select is((select count(*) from storage.buckets where id in ('child-photos','health-photos') and not public),2::bigint,'Both buckets are private');

create schema test_helpers;
grant usage on schema test_helpers to authenticated;
create function test_helpers.role_checks(uid uuid, label text, member boolean, parent boolean, contributor boolean) returns setof text language plpgsql as $$
declare cid uuid := '10000000-0000-4000-8000-000000000001'; statement text; begin
  perform set_config('request.jwt.claim.sub',uid::text,true);
  return next is((select count(*) from public.users),1::bigint,label||': only own user record');
  return next is((select count(*) from public.children where id=cid),case when member then 1 else 0 end::bigint,label||': child profile visibility');
  return next is((select count(*) from public.child_members where child_id=cid),case when member then 4 else 0 end::bigint,label||': family visibility');
  return next is((select count(*) from public.consents where child_id=cid),case when member then 5 else 0 end::bigint,label||': own consents only');
  return next is((select count(*) from public.memories where child_id=cid and id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002')),case when member then 2 else 0 end::bigint,label||': memories visibility');
  return next is((select count(*) from public.child_milestones where child_id=cid),case when parent then 1 else 0 end::bigint,label||': milestones visibility');
  return next is((select count(*) from public.allergies),0::bigint,label||': cannot bypass allergy audit');
  return next is((select count(*) from public.vaccination_logs),0::bigint,label||': cannot bypass vaccination audit');
  return next is((select count(*) from public.activity_batches where child_id=cid),case when parent then 1 else 0 end::bigint,label||': activities visibility');
  return next is((select count(*) from public.activity_feedback where child_id=cid),case when parent then 1 else 0 end::bigint,label||': feedback visibility');
  return next is((select count(*) from public.notifications_log where child_id=cid),case when member then 1 else 0 end::bigint,label||': own notifications');
  return next is((select count(*) from public.notification_preferences where child_id=cid),case when member then 1 else 0 end::bigint,label||': own notification preferences');
  return next is((select count(*) from public.child_invites),0::bigint,label||': invite secrets never readable');
  return next is((select count(*) from public.child_member_permissions),case when label in ('owner','family_contributor') then 1 else 0 end::bigint,label||': override visibility');
  return next is((select count(*) from public.milestone_catalog where id::text like '20000000%'),1::bigint,label||': draft catalogue hidden');
  return next is((select count(*) from public.community_directory where name in ('TEST','DRAFT')),1::bigint,label||': draft directory hidden');
  return next is((select count(*) from public.community_suggestions),1::bigint,label||': own suggestions only');
  return next ok((select count(*) from public.role_permissions)>0,label||': role presets readable');
  statement := format('select public.read_health(%L)',cid);
  if parent then
    return next lives_ok(statement,label||': audited health read allowed');
    return next ok(exists(select 1 from public.audit_log where actor_id=uid and action='read'),label||': health read is audited');
    return next lives_ok(format('select public.write_health(%L,%L,null,%L::jsonb)',cid,'allergies','{"type":"other","allergen":"TEST","severity":"TEST"}'),label||': audited health write allowed');
  else
    return next throws_ok(statement,'PT403','You do not have access to health records.',label||': health read denied');
    return next is((select count(*) from public.audit_log where child_id=cid),0::bigint,label||': audit hidden');
    return next throws_ok(format('select public.write_health(%L,%L,null,%L::jsonb)',cid,'allergies','{}'),'PT403','You do not have access to edit health records.',label||': health write denied');
  end if;
  return next throws_ok(format('insert into public.allergies(child_id,type,allergen,severity) values(%L,%L,%L,%L)',cid,'other','TEST','TEST'),'42501',null,label||': direct health write denied');
  return next throws_ok(format('insert into public.audit_log(actor_id,child_id,action,entity) values(%L,%L,%L,%L)',uid,cid,'spoof','test'),'42501',null,label||': cannot forge audit');
  return next throws_ok(format('insert into public.child_members(child_id,user_id,role) values(%L,%L,%L)',cid,'00000000-0000-4000-8000-000000000006','owner'),'42501',null,label||': cannot promote membership directly');
  return next throws_ok(format('insert into public.children(name,dob,created_by) values(%L,current_date,%L)','TEST',uid),'42501',null,label||': cannot bypass creation consent');
  statement := format('insert into public.memories(child_id,uploaded_by,storage_path,taken_at) values(%L,%L,%L,now())',cid,uid,cid::text||'/'||uid::text||'/'||label||'.jpg');
  if parent or contributor then return next lives_ok(statement,label||': memory upload allowed');
  else return next throws_ok(statement,'42501',null,label||': memory upload denied'); end if;
  return next throws_ok(format('update public.memories set child_id=%L where child_id=%L','10000000-0000-4000-8000-000000000002',cid),'42501',null,label||': cannot move memories between children');
  return next throws_ok(format('update public.memories set uploaded_by=%L where child_id=%L',uid,cid),'42501',null,label||': cannot take ownership of memory');
  return next throws_ok(format('select public.revoke_member(%L,%L)',cid,'00000000-0000-4000-8000-000000000001'),'PT403','You do not have access to remove this member.',label||': owner cannot be removed');
  return next is(public.authorize_photo('10000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001/one.jpg'),member,label||': photo authorisation matches membership');
  return next is(public.authorize_photo('10000000-0000-4000-8000-000000000001/unknown.jpg'),false,label||': orphan photo is not signable');
  return next throws_ok(format('insert into public.activity_batches(child_id,week_start,items,model,prompt_version) values(%L,current_date,%L,%L,%L)',cid,'[]','forged','forged'),'42501',null,label||': generated activities are server-only');
  return next results_eq($q$with changed as (update public.memories set caption='TEST EDIT' where id='30000000-0000-4000-8000-000000000001' returning id) select count(*) from changed$q$,array[case when parent then 1 else 0 end::bigint],label||': only parents edit another uploader memory by default');
  return next results_eq($q$with changed as (update public.memories set caption='TEST EDIT' where id='30000000-0000-4000-8000-000000000002' returning id) select count(*) from changed$q$,array[case when parent or contributor then 1 else 0 end::bigint],label||': contributor can edit own memory');
  statement := format('select public.record_activity_feedback(%L,%L,1,%L)',cid,'50000000-0000-4000-8000-000000000001','down');
  if parent then return next lives_ok(statement,label||': feedback write allowed');
  else return next throws_ok(statement,'PT403',null,label||': feedback write denied'); end if;
  statement := format('insert into storage.objects(bucket_id,name) values(%L,%L)','child-photos',cid::text||'/'||uid::text||'/role-test.png');
  if parent or contributor then return next lives_ok(statement,label||': storage upload policy allows writer');
  else return next throws_ok(statement,'42501',null,label||': storage upload policy denies non-writer'); end if;
  return next is((select count(*) from storage.objects where bucket_id='child-photos'),0::bigint,label||': no direct storage reads or arbitrary signed URL minting');
  return next throws_ok(format('insert into public.consents(user_id,child_id,purpose,notice_version,verification_method,decision,granted_at) values(%L,%L,%L,%L,%L,%L,now())',uid,cid,'health','forged','self_declaration','granted'),'42501',null,label||': consent events cannot be forged');
  return next throws_ok($q$insert into public.role_permissions(role,capability) values('family_viewer','health.write')$q$,'42501',null,label||': global role presets cannot be changed');
  return next throws_ok(format('insert into public.child_member_permissions(child_id,user_id,capability,allowed,granted_by) values(%L,%L,%L,true,%L)',cid,'00000000-0000-4000-8000-000000000003','profile.read',uid),'42501',null,label||': overrides must go through audited owner operation');
  return next throws_ok($q$insert into public.community_directory(name,platform,url,description,status) values('TEST','TEST','https://example.test','TEST','published')$q$,'42501',null,label||': directory publication is server-only');
  return next throws_ok(format('insert into public.community_suggestions(user_id,city,name,url,status) values(%L,%L,%L,%L,%L)',uid,'Bangalore','TEST','https://example.test','approved'),'42501',null,label||': suggestion cannot self-approve');
  return next lives_ok(format('insert into public.community_suggestions(user_id,city,name,url) values(%L,%L,%L,%L)',uid,'Bangalore','TEST','https://example.test'),label||': own suggestion can enter moderation queue');
  return next throws_ok(format('insert into public.notifications_log(user_id,child_id,type) values(%L,%L,%L)',uid,cid,'forged'),'42501',null,label||': notifications cannot be forged');
  return next results_eq(format('with changed as (update public.notification_preferences set show_child_name=true where child_id=%L returning child_id) select count(*) from changed',cid),array[case when member then 1 else 0 end::bigint],label||': only own notification preference is writable');
  return next results_eq(format('with changed as (update public.child_members set role=%L where child_id=%L returning child_id) select count(*) from changed','owner',cid),array[0::bigint],label||': no direct role promotion');
  return next results_eq(format('with changed as (delete from public.children where id=%L returning id) select count(*) from changed',cid),array[0::bigint],label||': no unsafe direct child deletion');
end $$;
grant execute on function test_helpers.role_checks(uuid,text,boolean,boolean,boolean) to authenticated;
set local role authenticated;
select * from test_helpers.role_checks('00000000-0000-4000-8000-000000000001','owner',true,true,false);
select * from test_helpers.role_checks('00000000-0000-4000-8000-000000000002','co_parent',true,true,false);
select * from test_helpers.role_checks('00000000-0000-4000-8000-000000000003','family_contributor',true,false,true);
select * from test_helpers.role_checks('00000000-0000-4000-8000-000000000004','family_viewer',true,false,false);
select * from test_helpers.role_checks('00000000-0000-4000-8000-000000000005','non_member',false,false,false);

-- Owner grants are live; family health remains read-only even with a forged write grant.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.set_member_access('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','Grandparent','{"health.read":true,"milestones.read":true,"memories.add":true}')$$,'Owner can customise a relationship');
select throws_ok($$select public.set_member_access('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','Grandparent','{"health.write":true}')$$,'PT400','This permission is limited to parents.','Health writes cannot be delegated to family');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
select lives_ok($$select public.read_health('10000000-0000-4000-8000-000000000001')$$,'Explicit family health read grant works');
select is((select count(*) from public.child_milestones),1::bigint,'Custom milestone read grant works');
select throws_ok($$select public.set_member_access('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','Family','{}')$$,'PT403','Only the owner can change access levels.','Family cannot alter their own permissions');
select lives_ok($$select public.set_consent('10000000-0000-4000-8000-000000000001','health',false,'2026-10-24.v2')$$,'Family may withdraw own health purpose');
select throws_ok($$select public.read_health('10000000-0000-4000-8000-000000000001')$$,'PT403','You do not have access to health records.','Consent denial overrides health permission');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.set_consent('10000000-0000-4000-8000-000000000001','personalisation',false,'2026-10-24.v2')$$,'Owner can withdraw personalisation');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.activity_batches),0::bigint,'Owner withdrawal stops activity access for co-parent');
select throws_ok($$select public.set_member_access('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','Family','{"health.read":true}')$$,'PT403','Only the owner can change access levels.','Co-parent cannot grant health access');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.revoke_member('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004')$$,'Owner revokes viewer');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
select is((select count(*) from public.memories),0::bigint,'Revocation immediately removes memory access');
select is((select count(*) from public.child_members),0::bigint,'Revoked member cannot see family');
select throws_ok($$select public.read_health('10000000-0000-4000-8000-000000000001')$$,'PT403','You do not have access to health records.','Revocation overrides health grant');

-- Creation validates every purpose, notice version and attestation server-side.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
select throws_ok($$select public.create_child('{"name":"TEST","dob":"2025-10-01"}','{"memories":true}',true,'2026-10-24.v2')$$,'PT400','Choose an option for each purpose.','Missing purposes reject entire transaction');
select is((select count(*) from public.children),0::bigint,'Failed consent leaves no child');
select throws_ok($$select public.create_child('{"name":"TEST","dob":"2025-10-01"}','{"memories":false}',true,'2026-10-24.v2')$$,'PT400','Memories consent is needed to create a profile.','Memories consent required');
select throws_ok($$select public.create_child('{}','{}',false,'2026-10-24.v2')$$,'PT400','Confirm the current parent or guardian notice.','Guardian confirmation required');
select lives_ok($$select public.create_child('{"name":"TEST","dob":"2025-10-01"}','{"memories":true,"milestones":false,"health":false,"personalisation":false,"notifications":false}',true,'2026-10-24.v2')$$,'Optional purposes can be declined');
select is((select count(*) from public.consents),5::bigint,'All five decisions persisted');
select is((select count(*) from public.consents where decision='declined'),4::bigint,'Optional choices remain declined');

reset role;
set local role anon;
select throws_ok($$select * from public.children$$,'42501',null,'Anonymous cannot read child table');
select throws_ok($$select public.read_health('10000000-0000-4000-8000-000000000001')$$,'42501',null,'Anonymous cannot invoke health RPC');
reset role;
select * from finish();
rollback;
