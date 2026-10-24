-- Allow a cold Edge Function and its authorization query to acknowledge the job.
-- The durable work still runs via EdgeRuntime.waitUntil after the 202 response.
create or replace function private.dispatch_background() returns void language plpgsql security definer set search_path='' as $$
declare target text; secret text;
begin
 select endpoint into target from private.background_settings where singleton;
 if target is null then return; end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='parvarish_worker_token';
 perform net.http_post(url:=target,headers:=jsonb_build_object('Content-Type','application/json','x-worker-token',secret),body:='{}',timeout_milliseconds:=30000);
end $$;
revoke all on function private.dispatch_background() from public,anon,authenticated;
