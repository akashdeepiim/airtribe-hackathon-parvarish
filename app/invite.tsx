import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Guard } from '../src/components/Guard';
import { ConsentFlow } from '../src/components/ConsentFlow';
import { Screen, Card, Heading, Body, Button, ErrorNotice } from '../src/components/ui';
import { useAuth } from '../src/lib/auth';
import { db } from '../src/lib/supabase';
import { refreshFamily } from '../src/lib/data';
import { friendlyError } from '../src/lib/errors';
import { NOTICE_VERSION, choicesSchema, type ConsentChoices } from '../src/domain/consent';
import { idSchema } from '../src/domain/schemas';
import { z } from 'zod';
export default function Invite() {
  const { pendingInvite, clearInvite, session } = useAuth();
  const accept = useMutation({
    mutationFn: async (choices: ConsentChoices) => {
      const { data, error } = await db().rpc('accept_invite', {
        invite_token: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .parse(pendingInvite),
        choices: choicesSchema.parse(choices),
        adult: true,
        notice_version: NOTICE_VERSION,
      });
      if (error) throw error;
      return idSchema.parse(data);
    },
    onSuccess: async (id) => {
      clearInvite();
      await refreshFamily();
      router.replace(`/children/${id}`);
    },
  });
  return (
    <Guard>
      <Screen>
        <Heading>You’re part of their story.</Heading>
        <Body muted>
          Sign in with the email the invitation was created for, then choose how you participate.
        </Body>
        {session ? <Body>Signed in as {session.user.email}</Body> : null}
        {!pendingInvite ? (
          <Card>
            <Body>
              Open the complete invitation link to join. Ask the person who invited you for a new
              link if it has expired.
            </Body>
            <Button title="Go home" onPress={() => router.replace('/')} />
          </Card>
        ) : (
          <ConsentFlow
            family
            busy={accept.isPending}
            onComplete={(choices) => accept.mutate(choices)}
          />
        )}
        <ErrorNotice message={accept.isError ? friendlyError(accept.error) : null} />
        {pendingInvite ? (
          <Button
            title="Leave invitation"
            variant="quiet"
            disabled={accept.isPending}
            onPress={() => {
              clearInvite();
              router.replace('/');
            }}
          />
        ) : null}
      </Screen>
    </Guard>
  );
}
