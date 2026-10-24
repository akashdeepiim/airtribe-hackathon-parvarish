import { useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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
} from '../../../src/components/ui';
import { useConsents, useAccess, refreshFamily } from '../../../src/lib/data';
import { purposes, notices, NOTICE_VERSION, type Purpose } from '../../../src/domain/consent';
import { idSchema } from '../../../src/domain/schemas';
import { db } from '../../../src/lib/supabase';
import { friendlyError } from '../../../src/lib/errors';
export default function Privacy() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = typeof raw === 'string' ? raw : '';
  const consent = useConsents(id);
  const access = useAccess(id);
  const [selected, setSelected] = useState<Purpose | null>(null);
  const save = useMutation({
    mutationFn: async ({ purpose, granted }: { purpose: Purpose; granted: boolean }) => {
      const { error } = await db().rpc('set_consent', {
        cid: idSchema.parse(id),
        purpose,
        granted,
        notice_version: NOTICE_VERSION,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setSelected(null);
      await refreshFamily();
    },
  });
  if (!idSchema.safeParse(id).success)
    return (
      <Guard>
        <Screen back>
          <Body>This privacy link is unavailable.</Body>
        </Screen>
      </Guard>
    );
  return (
    <Guard>
      <Screen back>
        <Eyebrow>Always your choice</Eyebrow>
        <Heading>Privacy, in plain words.</Heading>
        <Body muted>Review what you’ve agreed to. You can change your choices at any time.</Body>
        <SensitiveNotice />
        {consent.isPending || access.isPending ? (
          <Loading />
        ) : consent.isError || access.isError ? (
          <Card>
            <ErrorNotice message="Your privacy choices couldn’t be loaded. Your access may have changed." />
            <Button title="Try again" onPress={() => void refreshFamily()} />
          </Card>
        ) : (
          <>
            <Card tint>
              <Body>
                {access.data?.role === 'owner'
                  ? 'As the profile owner, turning off a purpose stops that processing for this child across your family.'
                  : 'Your choices apply to your account. A feature also needs to be enabled by the profile owner and allowed by your access settings.'}
              </Body>
            </Card>
            {selected ? (
              <Card>
                <Eyebrow>{notices[selected].eyebrow}</Eyebrow>
                <Heading small>{notices[selected].title}</Heading>
                <Body>{notices[selected].copy}</Body>
                <Body muted>{notices[selected].detail}</Body>
                {selected === 'memories' ? (
                  <Body>
                    Withdrawing memories consent stops access to photos. Your profile remains
                    available so you can manage family access and privacy choices.
                  </Body>
                ) : null}
                {consent.data?.find((c) => c.purpose === selected)?.decision === 'granted' ? (
                  <Button
                    title="Confirm withdrawal"
                    variant="danger"
                    loading={save.isPending}
                    onPress={() => save.mutate({ purpose: selected, granted: false })}
                  />
                ) : (
                  <Button
                    title="Agree and enable"
                    loading={save.isPending}
                    onPress={() => save.mutate({ purpose: selected, granted: true })}
                  />
                )}
                <ErrorNotice message={save.isError ? friendlyError(save.error) : null} />
                <Button
                  title="Keep current choice"
                  variant="quiet"
                  disabled={save.isPending}
                  onPress={() => setSelected(null)}
                />
              </Card>
            ) : (
              purposes.map((p) => {
                const latest = consent.data?.find((c) => c.purpose === p);
                return (
                  <Card key={p}>
                    <View className="flex-row justify-between gap-4">
                      <Text className="text-lg text-ink font-semibold">{notices[p].eyebrow}</Text>
                      <Text className="text-sm text-forest">
                        {latest?.decision === 'granted' ? 'Enabled' : 'Off'}
                      </Text>
                    </View>
                    <Body muted>{notices[p].copy}</Body>
                    <Button
                      title={`Review ${notices[p].eyebrow.toLowerCase()}`}
                      variant="secondary"
                      onPress={() => {
                        save.reset();
                        setSelected(p);
                      }}
                    />
                  </Card>
                );
              })
            )}
          </>
        )}
      </Screen>
    </Guard>
  );
}
