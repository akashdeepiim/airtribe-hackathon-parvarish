-- Relationship-specific access cannot override invariant parent-only operations.
create or replace function private.has_permission(cid uuid, cap public.capability) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_member(cid) and coalesce((select case
    when m.role='owner' then true
    when cap in ('health.write','family.manage','memories.delete_all') and m.role not in ('owner','co_parent') then false
    else coalesce((select p.allowed from public.child_member_permissions p where p.child_id=cid and p.user_id=auth.uid() and p.capability=cap),
      exists(select 1 from public.role_permissions r where r.role=m.role and r.capability=cap)) end
    from public.child_members m where m.child_id=cid and m.user_id=auth.uid()), false)
$$;

-- Use Bangalore's calendar day so a child born after midnight IST is not rejected until UTC catches up.
alter table public.children drop constraint children_dob_check;
alter table public.children add constraint children_dob_check check(dob <= timezone('Asia/Kolkata',now())::date);

-- A bearer invite must also be invalidated if its creator loses family-management permission.
-- Existing pending invitations are revoked when permissions are changed to disallow management.
create function private.revoke_unmanaged_invites() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.capability='family.manage' and not new.allowed then
    update public.child_invites set revoked_at=now() where child_id=new.child_id and invited_by=new.user_id and accepted_at is null;
  end if;
  return new;
end $$;
create trigger revoke_unmanaged_invites after insert or update on public.child_member_permissions for each row execute function private.revoke_unmanaged_invites();
revoke execute on function private.revoke_unmanaged_invites() from public,anon,authenticated;
