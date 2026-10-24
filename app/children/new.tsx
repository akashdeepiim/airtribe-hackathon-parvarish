import { useState } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Guard } from '../../src/components/Guard';
import { ConsentFlow } from '../../src/components/ConsentFlow';
import { ProfileForm } from '../../src/components/ProfileForm';
import {
  Screen,
  Card,
  Eyebrow,
  Heading,
  Body,
  SensitiveNotice,
  ErrorNotice,
  Button,
} from '../../src/components/ui';
import { type ConsentChoices, NOTICE_VERSION, choicesSchema } from '../../src/domain/consent';
import { type Profile, profileSchema, idSchema } from '../../src/domain/schemas';
import { db } from '../../src/lib/supabase';
import { refreshFamily } from '../../src/lib/data';
import { friendlyError } from '../../src/lib/errors';
export default function NewChild() {
  const [choices, setChoices] = useState<ConsentChoices | null>(null);
  const create = useMutation({
    mutationFn: async (profile: Profile) => {
      const { data, error } = await db().rpc('create_child', {
        profile: profileSchema.parse(profile),
        choices: choicesSchema.parse(choices),
        adult_guardian: true,
        notice_version: NOTICE_VERSION,
      });
      if (error) throw error;
      return idSchema.parse(data);
    },
    onSuccess: async (id) => {
      await refreshFamily();
      router.replace(`/children/${id}`);
    },
  });
  return (
    <Guard>
      <Screen back>
        {!choices ? (
          <ConsentFlow onComplete={setChoices} />
        ) : (
          <>
            <Eyebrow>The beginning of their story</Eyebrow>
            <Heading>Meet your little one.</Heading>
            <Body muted>
              Start with the basics. You can add a profile photo once their private space is ready.
            </Body>
            <SensitiveNotice />
            <Card>
              <ProfileForm pending={create.isPending} onSave={(p) => create.mutate(p)} />
              <ErrorNotice message={create.isError ? friendlyError(create.error) : null} />
              <Button
                title="Review my choices again"
                variant="quiet"
                disabled={create.isPending}
                onPress={() => setChoices(null)}
              />
            </Card>
          </>
        )}
      </Screen>
    </Guard>
  );
}
