import { Reminders } from '../../../src/components/Reminders';
import { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Guard } from '../../../src/components/Guard';
import {
  Screen,
  Card,
  Heading,
  Body,
  Button,
  SensitiveNotice,
  ErrorNotice,
  Loading,
  Icon,
} from '../../../src/components/ui';
import { ProfileForm } from '../../../src/components/ProfileForm';
import { useChild, useAccess, usePhoto, refreshFamily } from '../../../src/lib/data';
import { useAuth } from '../../../src/lib/auth';
import { db } from '../../../src/lib/supabase';
import { friendlyError } from '../../../src/lib/errors';
import { uploadAvatar } from '../../../src/lib/photos';
import { profileSchema, idSchema, type Profile } from '../../../src/domain/schemas';
import { ageMonths } from '../../../src/domain/memories';
export default function ChildSpace() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = typeof raw === 'string' ? raw : '';
  const { session } = useAuth();
  const child = useChild(id);
  const access = useAccess(id);
  const [editing, setEditing] = useState(false);
  const maySeePhotos =
    !!access.data?.capabilities['memories.read'] && !!access.data?.purposes.memories;
  const photo = usePhoto(child.data?.avatar_path ?? null, maySeePhotos);
  const save = useMutation({
    mutationFn: async (profile: Profile) => {
      const { error } = await db().rpc('update_child', {
        cid: idSchema.parse(id),
        profile: profileSchema.parse(profile),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setEditing(false);
      await refreshFamily();
    },
  });
  const avatar = useMutation({
    mutationFn: async () => uploadAvatar(id, idSchema.parse(session?.user.id)),
    onSuccess: () => refreshFamily(),
  });
  let content;
  if (!idSchema.safeParse(id).success)
    content = (
      <Card>
        <Body>This profile link is unavailable.</Body>
      </Card>
    );
  else if (child.isPending || access.isPending) content = <Loading />;
  else if (child.isError || access.isError || !child.data || !access.data)
    content = (
      <Card>
        <Heading small>This space is unavailable.</Heading>
        <Body>
          Your access may have changed. You can return home or ask the owner to check your
          invitation.
        </Body>
        <Button title="Go home" onPress={() => router.replace('/family')} />
      </Card>
    );
  else {
    const c = child.data;
    const a = access.data;
    content = (
      <>
        {editing ? (
          <Card>
            <Heading small>Edit profile</Heading>
            <SensitiveNotice />
            <ProfileForm
              initial={{
                name: c.name,
                dob: c.dob,
                sex: c.sex,
                city: c.city,
                interests: c.interests,
              }}
              onSave={(p) => save.mutate(p)}
              pending={save.isPending}
              label="Save profile"
            />
            <ErrorNotice message={save.isError ? friendlyError(save.error) : null} />
            <Button
              title="Cancel"
              variant="quiet"
              disabled={save.isPending}
              onPress={() => setEditing(false)}
            />
          </Card>
        ) : (
          <Card>
            <View className="flex-row gap-5 items-center">
              {maySeePhotos && photo.data ? (
                <Image
                  source={{ uri: photo.data.url }}
                  accessibilityLabel={`${c.name}’s profile photo`}
                  style={{ width: 64, height: 64, borderRadius: 20 }}
                />
              ) : (
                <View className="p-4 rounded-2xl bg-sage">
                  <Icon name="flower-outline" size={36} />
                </View>
              )}
              <View className="flex-1 gap-2">
                <Heading>{c.name}</Heading>
                <Text className="text-muted">
                  {Math.max(0, ageMonths(c.dob, new Date().toISOString()))} months old · {c.city}
                </Text>
              </View>
            </View>
            {a.capabilities['profile.edit'] ? (
              <View className="flex-row flex-wrap gap-3">
                <Button
                  title="Edit profile"
                  variant="quiet"
                  icon="create-outline"
                  onPress={() => setEditing(true)}
                />
                {a.purposes.memories ? (
                  <Button
                    title={c.avatar_path ? 'Change photo' : 'Add profile photo'}
                    variant="quiet"
                    icon="camera-outline"
                    loading={avatar.isPending}
                    onPress={() => avatar.mutate()}
                  />
                ) : null}
              </View>
            ) : null}
            <ErrorNotice
              message={
                avatar.isError
                  ? friendlyError(avatar.error)
                  : photo.isError
                    ? 'The profile photo could not be opened. Try again shortly.'
                    : null
              }
            />
          </Card>
        )}
        {maySeePhotos ? (
          <Card tint>
            <View className="flex-row items-center gap-3">
              <Icon name="images-outline" size={26} />
              <Heading small>The everyday is worth keeping</Heading>
            </View>
            <Body>Add photos, remember a first, or turn a favourite moment into a keepsake.</Body>
            <View className="flex-row flex-wrap gap-3">
              <Button
                title="Open memories"
                icon="images-outline"
                onPress={() => router.push(`/children/${id}/memories`)}
              />
              <Button
                title="Create a keepsake"
                variant="secondary"
                onPress={() => router.push(`/children/${id}/studio`)}
              />
            </View>
          </Card>
        ) : (
          <Card>
            <Heading small>Your memories are paused</Heading>
            <Body>Review your privacy choices to enable memories.</Body>
            <Button
              title="Privacy choices"
              onPress={() => router.push(`/children/${id}/privacy`)}
            />
          </Card>
        )}
        <View className="flex-row flex-wrap gap-5">
          {a.capabilities['milestones.read'] ? (
            <View className="flex-1 min-w-[240px]">
              <Card>
                <Icon name="sparkles-outline" />
                <Heading small>Milestones</Heading>
                <Body muted>Notice a new skill. Keep the moment that goes with it.</Body>
                <Button
                  title="View milestones"
                  variant="secondary"
                  onPress={() => router.push(`/children/${id}/milestones`)}
                />
              </Card>
            </View>
          ) : null}
          {a.capabilities['activities.read'] ? (
            <View className="flex-1 min-w-[240px]">
              <Card>
                <Icon name="sunny-outline" />
                <Heading small>This week’s activities</Heading>
                <Body muted>Three simple ways to spend a little time together.</Body>
                <Button
                  title="Explore activities"
                  variant="secondary"
                  onPress={() => router.push(`/children/${id}/activities`)}
                />
              </Card>
            </View>
          ) : null}
        </View>
        <Reminders
          childId={id}
          enabled={a.purposes.notifications}
          health={a.purposes.health && a.capabilities['health.read']}
        />
        <View className="flex-row flex-wrap gap-3">
          {a.capabilities['health.read'] ? (
            <Button
              title="Health records"
              icon="heart-outline"
              variant="quiet"
              onPress={() => router.push(`/children/${id}/health`)}
            />
          ) : null}
          <Button
            title="Family access"
            icon="people-outline"
            variant="quiet"
            onPress={() => router.push(`/children/${id}/family`)}
          />
          <Button
            title="Privacy & settings"
            icon="settings-outline"
            variant="quiet"
            onPress={() => router.push(`/children/${id}/privacy`)}
          />
        </View>
      </>
    );
  }
  return (
    <Guard>
      <Screen back wide>
        {content}
      </Screen>
    </Guard>
  );
}
