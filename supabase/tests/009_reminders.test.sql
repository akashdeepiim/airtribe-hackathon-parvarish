begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) select ('07000000-0000-4000-8000-00000000000'||i)::uuid,'data-test-'||i||'@example.test',now() from generate_series(1,5) i;
insert into public.children(id,name,dob,created_by) values('17000000-0000-4000-8000-000000000001','TEST',current_date-365,'07000000-0000-4000-8000-000000000001');
insert into public.child_members(child_id,user_id,role) select '17000000-0000-4000-8000-000000000001',('07000000-0000-4000-8000-00000000000'||i)::uuid,(array['owner','co_parent','family_contributor','family_viewer'])[i]::public.member_role from generate_series(1,4) i;
insert into public.consents(user_id,child_id,purpose,notice_version,verification_method,decision,granted_at)
 select m.user_id,m.child_id,p,'2026-10-24.v2','self_declaration','granted',now() from public.child_members m cross join unnest(enum_range(null::public.consent_purpose)) p where child_id='17000000-0000-4000-8000-000000000001';

create schema reminder_test;grant usage on schema reminder_test to authenticated;
create function reminder_test.roles(i integer,label text,member boolean) returns setof text language plpgsql as $$
begin
 perform set_config('request.jwt.claim.sub',('07000000-0000-4000-8000-00000000000'||i)::text,true);
 if member then return next lives_ok($q$select public.save_notification_preferences('17000000-0000-4000-8000-000000000001',false,'21:00','08:00','Asia/Kolkata',true)$q$,label||': set own preferences');else return next throws_ok($q$select public.save_notification_preferences('17000000-0000-4000-8000-000000000001',false,'21:00','08:00','Asia/Kolkata',true)$q$,'PT403',null,label||': nonmember denied');end if;
 return next is((select count(*) from public.notification_preferences),case when member then 1 else 0 end::bigint,label||': sees only own preferences');
 return next throws_ok('select public.enqueue_reminders()','42501',null,label||': cannot run scheduler');
 return next throws_ok('select public.authorize_background_worker(null)','42501',null,label||': cannot access worker auth');
 return next lives_ok(format('insert into public.push_devices(user_id,token,platform) values(%L,%L,%L)',auth.uid(),'ExpoPushToken[test'||i||']','android'),label||': own device');
 return next is((select count(*) from public.push_devices),1::bigint,label||': only own device visible');
 return next throws_ok($q$insert into public.push_devices(user_id,token,platform) values('07000000-0000-4000-8000-000000000009','ExpoPushToken[other]','android')$q$,'42501',null,label||': cannot register another user');
end $$;
grant execute on function reminder_test.roles(integer,text,boolean) to authenticated;
set local role authenticated;
select * from reminder_test.roles(1,'owner',true);select * from reminder_test.roles(2,'co_parent',true);select * from reminder_test.roles(3,'contributor',true);select * from reminder_test.roles(4,'viewer',true);select * from reminder_test.roles(5,'non_member',false);
reset role;
select ok(private.is_quiet('2026-10-24 17:00:00+00','21:00','08:00','Asia/Kolkata'),'22:30 is quiet');
select ok(not private.is_quiet('2026-10-24 05:00:00+00','21:00','08:00','Asia/Kolkata'),'10:30 allows reminders');
select ok(private.is_quiet('2026-10-24 05:00:00+00','09:00','11:00','Asia/Kolkata'),'Same-day quiet hours work');
select is(public.enqueue_reminders(current_date::timestamptz+interval '17 hours'),0,'Quiet hours do not enqueue');
select lives_ok($$select public.enqueue_reminders(current_date::timestamptz+interval '5 hours')$$,'Scheduler handles all reminder types');
select lives_ok($$select public.enqueue_reminders(current_date::timestamptz+interval '6 hours')$$,'Repeated worker is safe');
select ok((select count(*)<=1 from public.notifications_log where child_id='17000000-0000-4000-8000-000000000001' and type='milestone'),'At most one milestone per week per child');
select ok(not exists(select 1 from public.notifications_log n join public.milestone_catalog m on m.id=n.milestone_id join public.children c on c.id=n.child_id where n.type='milestone' and m.consult_by_months <= (current_date-c.dob)/30.4375),'Consult-age cards are never pushed');
select ok(not public.authorize_background_worker('wrong-token'),'Invalid worker secret rejected');
select ok(not public.authorize_background_worker(null),'Missing worker secret rejected');
select lives_ok('select public.queue_orphan_photos()','Orphan reconciliation runs');
select * from finish();rollback;
