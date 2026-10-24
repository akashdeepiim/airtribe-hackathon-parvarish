import { useState } from 'react';
import { View, Text, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { Guard } from '../../../src/components/Guard';
import {
  Screen,
  Card,
  Heading,
  Body,
  Eyebrow,
  Button,
  Field,
  SensitiveNotice,
  ErrorNotice,
  Loading,
  Toggle,
} from '../../../src/components/ui';
import {
  useAccess,
  useMembers,
  usePermissions,
  useInvites,
  refreshFamily,
} from '../../../src/lib/data';
import { useAuth } from '../../../src/lib/auth';
import { db } from '../../../src/lib/supabase';
import { friendlyError } from '../../../src/lib/errors';
import {
  capabilities,
  defaultPermissions,
  parentOnly,
  permissionLabels,
  roleLabels,
  type Capability,
} from '../../../src/domain/access';
import {
  inviteInputSchema,
  createdInviteSchema,
  idSchema,
  type Member,
} from '../../../src/domain/schemas';
import { inviteUrl, whatsappInvite } from '../../../src/domain/invites';

function AccessEditor({
  member,
  initial,
  onClose,
}: {
  member: Member;
  initial: Record<Capability, boolean>;
  onClose: () => void;
}) {
  const [relationship, setRelationship] = useState(member.relationship);
  const [permissions, setPermissions] = useState(initial);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await db().rpc('set_member_access', {
        cid: idSchema.parse(member.child_id),
        member_id: idSchema.parse(member.user_id),
        relationship: z.string().trim().min(1).max(60).parse(relationship),
        permissions: z.record(z.enum(capabilities), z.boolean()).parse(permissions),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshFamily();
      onClose();
    },
  });
  return (
    <Card>
      <Eyebrow>Access for {member.relationship}</Eyebrow>
      <Heading small>Their place in your circle.</Heading>
      <SensitiveNotice access />
      <Field
        label="Relationship / name"
        value={relationship}
        onChangeText={setRelationship}
        maxLength={60}
      />
      <Body muted>
        Start from their role, then adjust each permission. Their relationship label does not
        determine access. Features also need the appropriate privacy choices enabled.
      </Body>
      <View>
        {capabilities.map((cap) => (
          <Toggle
            key={cap}
            title={permissionLabels[cap]}
            detail={
              cap === 'health.read'
                ? 'Sensitive: explicitly allow this person to view health records.'
                : parentOnly.has(cap) && member.role !== 'co_parent'
                  ? 'Available to parents only.'
                  : undefined
            }
            value={permissions[cap]}
            disabled={save.isPending || (parentOnly.has(cap) && member.role !== 'co_parent')}
            onChange={(value) => setPermissions((p) => ({ ...p, [cap]: value }))}
          />
        ))}
      </View>
      <ErrorNotice message={save.isError ? friendlyError(save.error) : null} />
      <Button title="Save access settings" loading={save.isPending} onPress={() => save.mutate()} />
      <Button title="Cancel" disabled={save.isPending} variant="quiet" onPress={onClose} />
    </Card>
  );
}
export default function Family() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = typeof raw === 'string' ? raw : '';
  const { session } = useAuth();
  const access = useAccess(id);
  const members = useMembers(id);
  const overrides = usePermissions(id);
  const invites = useInvites(id, !!access.data?.capabilities['family.manage']);
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Grandparent');
  const [role, setRole] = useState<'co_parent' | 'family_contributor' | 'family_viewer'>(
    'family_viewer',
  );
  const [link, setLink] = useState<string | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const invite = useMutation({
    mutationFn: async () => {
      const input = inviteInputSchema.parse({ email: email.trim(), role, relationship });
      const { data, error } = await db().rpc('create_invite', {
        cid: idSchema.parse(id),
        recipient_email: input.email,
        member_role: input.role,
        relationship: input.relationship,
      });
      if (error) throw error;
      return createdInviteSchema.parse(data);
    },
    onSuccess: async (result) => {
      setLink(inviteUrl(process.env.EXPO_PUBLIC_APP_URL ?? 'http://localhost:8081', result.token));
      setEmail('');
      await refreshFamily();
    },
  });
  const revoke = useMutation({
    mutationFn: async (member: Member) => {
      const { error } = await db().rpc('revoke_member', {
        cid: idSchema.parse(id),
        member_id: idSchema.parse(member.user_id),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setRemoving(null);
      await refreshFamily();
    },
  });
  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await db().rpc('revoke_invite', { invite_id: idSchema.parse(inviteId) });
      if (error) throw error;
    },
    onSuccess: async () => {
      setLink(null);
      await refreshFamily();
    },
  });
  const canManage = !!access.data?.capabilities['family.manage'];
  const owner = access.data?.role === 'owner';
  const busy = access.isPending || members.isPending || overrides.isPending;
  const failed = access.isError || members.isError || overrides.isError;
  if (!idSchema.safeParse(id).success)
    return (
      <Guard>
        <Screen back>
          <Body>This family link is unavailable.</Body>
        </Screen>
      </Guard>
    );
  return (
    <Guard>
      <Screen back>
        <Eyebrow>Growing your circle</Eyebrow>
        <Heading>Love, with boundaries.</Heading>
        <Body muted>Invite the people who matter. Choose the part they play.</Body>
        <SensitiveNotice access />
        {busy ? (
          <Loading />
        ) : failed || !access.data ? (
          <Card>
            <ErrorNotice message="Family access is unavailable. Your permissions may have changed." />
            <Button title="Try again" onPress={() => void refreshFamily()} />
          </Card>
        ) : (
          <>
            {editing ? (
              <AccessEditor
                member={editing}
                initial={Object.assign(
                  defaultPermissions(editing.role),
                  Object.fromEntries(
                    (overrides.data ?? [])
                      .filter((p) => p.user_id === editing.user_id)
                      .map((p) => [p.capability, p.allowed]),
                  ),
                )}
                onClose={() => setEditing(null)}
              />
            ) : null}
            {!editing ? (
              <Card>
                <Eyebrow>Your family</Eyebrow>
                {members.data?.map((member) => (
                  <View key={member.user_id} className="border-b border-line pb-5 gap-3">
                    <View className="flex-row justify-between gap-3">
                      <View className="gap-1">
                        <Text className="text-xl text-ink font-semibold">
                          {member.user_id === session?.user.id ? 'You' : member.relationship}
                        </Text>
                        <Text className="text-sm text-muted">
                          {roleLabels[member.role]}
                          {member.user_id === session?.user.id ? ` · ${member.relationship}` : ''}
                        </Text>
                      </View>
                      {member.role === 'owner' ? (
                        <Text className="text-sm text-forest">Profile owner</Text>
                      ) : null}
                    </View>
                    {member.role !== 'owner' &&
                    (owner || (canManage && member.role !== 'co_parent')) ? (
                      <View className="flex-row flex-wrap gap-2">
                        {owner ? (
                          <Button
                            title={`Edit access for ${member.relationship}`}
                            variant="secondary"
                            onPress={() => setEditing(member)}
                          />
                        ) : null}
                        <Button
                          title="Remove from family"
                          variant="quiet"
                          onPress={() => setRemoving(member)}
                        />
                      </View>
                    ) : null}
                  </View>
                ))}
                {!members.data?.length ? (
                  <Body muted>Your role does not include viewing the family list.</Body>
                ) : null}
              </Card>
            ) : null}
            {removing ? (
              <Card>
                <Heading small>Remove {removing.relationship}?</Heading>
                <Body>
                  They’ll lose access to this child’s space. Photo links already opened can remain
                  usable until they expire, within 15 minutes.
                </Body>
                <ErrorNotice message={revoke.isError ? friendlyError(revoke.error) : null} />
                <Button
                  title="Confirm removal"
                  variant="danger"
                  loading={revoke.isPending}
                  onPress={() => revoke.mutate(removing)}
                />
                <Button
                  title="Keep in family"
                  variant="quiet"
                  disabled={revoke.isPending}
                  onPress={() => setRemoving(null)}
                />
              </Card>
            ) : null}
            {canManage && !editing ? (
              <Card>
                <Eyebrow>Invite someone close</Eyebrow>
                <Heading small>More love, in their corner.</Heading>
                <Body muted>
                  The invitation works only for the email you enter and expires in seven days.
                  They’ll accept their own privacy notices.
                </Body>
                <Field
                  label="Their email address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="family@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
                <Field
                  label="Relationship / name"
                  value={relationship}
                  onChangeText={setRelationship}
                  placeholder="Grandparent, aunt, family friend"
                  maxLength={60}
                />
                <Text className="text-sm font-semibold text-ink">Start with an access level</Text>
                <View className="gap-2">
                  {(
                    [
                      'family_viewer',
                      'family_contributor',
                      ...(owner ? (['co_parent'] as const) : []),
                    ] as const
                  ).map((r) => (
                    <Button
                      key={r}
                      title={
                        r === 'family_viewer'
                          ? 'Viewer · view memories'
                          : r === 'family_contributor'
                            ? 'Contributor · view and add memories'
                            : 'Co-parent · full parent access'
                      }
                      variant={role === r ? 'primary' : 'secondary'}
                      onPress={() => setRole(r)}
                    />
                  ))}
                </View>
                {role === 'co_parent' ? (
                  <Body muted>
                    Co-parents can view and edit health records when health consent is enabled. Only
                    the owner can grant access to others or delete the child profile.
                  </Body>
                ) : null}
                <Button
                  title="Create private invitation"
                  loading={invite.isPending}
                  onPress={() => invite.mutate()}
                />
                <ErrorNotice message={invite.isError ? friendlyError(invite.error) : null} />
                {link ? (
                  <View className="bg-sage rounded-control p-4 gap-3">
                    <Text className="text-forest font-semibold">Your invitation is ready.</Text>
                    <Body muted>
                      Send this link to the intended person. You control when the message is sent.
                    </Body>
                    <Button
                      title="Share invitation on WhatsApp"
                      icon="logo-whatsapp"
                      onPress={() => {
                        setLinkError(null);
                        void Linking.openURL(whatsappInvite(link)).catch(() =>
                          setLinkError(
                            'WhatsApp could not be opened. You can copy the invitation below.',
                          ),
                        );
                      }}
                    />
                    <Text selectable className="text-xs text-forest leading-5">
                      {link}
                    </Text>
                    <ErrorNotice message={linkError} />
                    <Text className="text-xs text-muted">
                      The link is shown here only until you leave this screen.
                    </Text>
                  </View>
                ) : null}
              </Card>
            ) : null}
            {canManage && !editing ? (
              <Card>
                <Eyebrow>Invitations</Eyebrow>
                {invites.isPending ? (
                  <Loading />
                ) : invites.isError ? (
                  <ErrorNotice message={friendlyError(invites.error)} />
                ) : invites.data?.length ? (
                  invites.data.map((item) => (
                    <View key={item.id} className="gap-2 pb-4 border-b border-line">
                      <Text className="text-ink font-semibold">
                        {item.relationship} · {roleLabels[item.role]}
                      </Text>
                      <Text className="text-muted text-sm">
                        {item.accepted_at
                          ? 'Joined'
                          : item.revoked_at
                            ? 'Revoked'
                            : new Date(item.expires_at) < new Date()
                              ? 'Expired'
                              : `Pending · expires ${new Date(item.expires_at).toLocaleDateString()}`}
                      </Text>
                      {!item.accepted_at &&
                      !item.revoked_at &&
                      new Date(item.expires_at) > new Date() ? (
                        <Button
                          title={`Revoke invitation for ${item.relationship}`}
                          variant="quiet"
                          loading={cancelInvite.isPending}
                          onPress={() => cancelInvite.mutate(item.id)}
                        />
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Body muted>No invitations yet. Your circle can grow whenever you’re ready.</Body>
                )}
                <ErrorNotice
                  message={cancelInvite.isError ? friendlyError(cancelInvite.error) : null}
                />
              </Card>
            ) : null}
          </>
        )}
      </Screen>
    </Guard>
  );
}
