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
  Eyebrow,
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
import { roleLabels } from '../../../src/domain/access';
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
        <Eyebrow>{roleLabels[a.role]} · Your family space</Eyebrow>
        <SensitiveNotice />
        <Reminders
          childId={id}
          enabled={a.purposes.notifications}
          health={a.purposes.health && a.capabilities['health.read']}
        />
        {editing ? (
          <Card>
            <Heading small>The little details.</Heading>
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
                  style={{ width: 88, height: 88, borderRadius: 44 }}
                />
              ) : (
                <View className="w-22 h-22 p-6 rounded-full bg-peach">
                  <Icon name="flower-outline" size={36} />
                </View>
              )}
              <View className="flex-1 gap-2">
                <Heading>{c.name}</Heading>
                <Text className="text-muted">
                  {c.city} · Born {c.dob}
                </Text>
              </View>
            </View>
            {c.interests.length ? (
              <View className="flex-row flex-wrap gap-2">
                {c.interests.map((item) => (
                  <View key={item} className="bg-sage px-4 py-2 rounded-full">
                    <Text className="text-forest">{item}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Body muted>A little space, ready to grow with them.</Body>
            )}
            {a.capabilities['profile.edit'] ? (
              <View className="flex-row flex-wrap gap-3">
                <Button
                  title="Edit profile"
                  variant="secondary"
                  icon="create-outline"
                  onPress={() => setEditing(true)}
                />
                {a.purposes.memories ? (
                  <Button
                    title={c.avatar_path ? 'Change photo' : 'Add profile photo'}
                    variant="secondary"
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
        <View className="flex-col md:flex-row gap-5">
          <View className="flex-1">
            <Card tint>
              <Icon name="people-outline" size={28} />
              <Heading small>Your people.</Heading>
              <Body muted>A private circle, with the right access for each person.</Body>
              <Button
                title="Family & access"
                variant="secondary"
                onPress={() => router.push(`/children/${id}/family`)}
              />
            </Card>
          </View>
          <View className="flex-1">
            <Card>
              <Icon name="options-outline" size={28} />
              <Heading small>Your choices.</Heading>
              <Body muted>
                Review the purposes you’ve agreed to and change them whenever you need.
              </Body>
              <Button
                title="Privacy choices"
                variant="secondary"
                onPress={() => router.push(`/children/${id}/privacy`)}
              />
            </Card>
          </View>
        </View>
        {maySeePhotos ? (
          <Card>
            <Heading small>Make a little keepsake.</Heading>
            <Body>Eight layouts, your photos, and a monthly recap ready to make your own.</Body>
            <Button
              title="Open memory studio"
              onPress={() => router.push(`/children/${id}/studio`)}
            />
            <Button
              title="Make this month’s recap"
              variant="secondary"
              onPress={() => router.push(`/children/${id}/studio?recap=true`)}
            />
          </Card>
        ) : null}
        {a.capabilities['activities.read'] ? (
          <Card>
            <Heading small>A little time, together.</Heading>
            <Body>Three activities for this week, with room for whatever interests them.</Body>
            <Button
              title="Open activities"
              onPress={() => router.push(`/children/${id}/activities`)}
            />
          </Card>
        ) : null}
        {a.capabilities['milestones.read'] ? (
          <Card tint>
            <Icon name="sparkles-outline" size={28} />
            <Heading small>Firsts, in their own time.</Heading>
            <Body>Connect a memory to a milestone, or record a new skill with its date.</Body>
            <Button
              title="Open milestones"
              onPress={() => router.push(`/children/${id}/milestones`)}
            />
          </Card>
        ) : null}
        {a.capabilities['health.read'] ? (
          <Card>
            <Icon name="heart-outline" size={28} />
            <Heading small>Health & growing.</Heading>
            <Body>
              Allergies, vaccination cards and measurements, with access recorded each time.
            </Body>
            <Button
              title="Open health records"
              onPress={() => router.push(`/children/${id}/health`)}
            />
          </Card>
        ) : null}
        <Card tint>
          <Icon name="images-outline" size={28} />
          <Heading small>All their little moments.</Heading>
          <Body>
            Keep everyday photos in a private timeline, arranged by their age. Add a caption,
            remember the people, and celebrate a first.
          </Body>
          <Button
            title="Open memories"
            icon="images-outline"
            onPress={() => router.push(`/children/${id}/memories`)}
          />
        </Card>
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
