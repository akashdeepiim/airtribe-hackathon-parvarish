import { useState, useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  ErrorNotice,
  Loading,
  SensitiveNotice,
} from '../../../src/components/ui';
import { useAccess, useChild } from '../../../src/lib/data';
import { useActivities, useActivityPreferences } from '../../../src/lib/activities';
import { db } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/lib/auth';
import { queryClient } from '../../../src/lib/query';
import { pickMemories, uploadMemories } from '../../../src/lib/memories';
import { friendlyError } from '../../../src/lib/errors';
export default function Activities() {
  const { id = '' } = useLocalSearchParams<{ id: string }>(),
    { session } = useAuth(),
    access = useAccess(id),
    child = useChild(id);
  const allowed =
      !!access.data?.capabilities['activities.read'] && !!access.data?.purposes.personalisation,
    write = allowed && !!access.data?.capabilities['profile.edit'];
  const batches = useActivities(id, allowed),
    prefs = useActivityPreferences(id, allowed);
  const [minutes, setMinutes] = useState(10),
    [place, setPlace] = useState('indoors'),
    [cost, setCost] = useState('free'),
    [answer, setAnswer] = useState(''),
    [notice, setNotice] = useState('');
  useEffect(() => {
    if (prefs.data) {
      setMinutes(prefs.data.minutes);
      setPlace(prefs.data.location);
      setCost(prefs.data.budget);
      setAnswer(prefs.data.latest_answer);
    }
  }, [prefs.data]);
  const feedback = useQuery({
    queryKey: ['activity-feedback', id, session?.user.id],
    enabled: allowed,
    queryFn: async () => {
      const r = await db()
        .from('activity_feedback')
        .select('batch_id,activity_index,signal,memory_id')
        .eq('child_id', id)
        .eq('user_id', session!.user.id);
      if (r.error) throw r.error;
      return z
        .array(
          z.object({
            batch_id: z.uuid(),
            activity_index: z.number(),
            signal: z.enum(['up', 'down', 'did_it']),
            memory_id: z.uuid().nullable(),
          }),
        )
        .parse(r.data);
    },
  });
  const save = useMutation({
    mutationFn: async (includeAnswer: boolean) => {
      const r = await db().rpc('set_activity_preferences', {
        cid: id,
        time_minutes: minutes,
        place,
        cost,
        ...(includeAnswer ? { answer } : {}),
      });
      if (r.error) throw r.error;
    },
    onSuccess: async () => {
      await prefs.refetch();
      setNotice('Your preferences are saved for the next activity batch.');
    },
  });
  const generate = useMutation({
    mutationFn: async () => {
      const r = await db().functions.invoke('weekly-activities', { body: { childId: id } });
      if (r.error) throw r.error;
      z.object({ ready: z.literal(true), fallback: z.boolean() }).parse(r.data);
    },
    onSuccess: () => batches.refetch(),
  });
  const respond = useMutation({
    mutationFn: async ({
      batch,
      index,
      signal,
      photo = false,
    }: {
      batch: string;
      index: number;
      signal: 'up' | 'down' | 'did_it';
      photo?: boolean;
    }) => {
      let memory: string | undefined;
      if (photo) {
        const chosen = await pickMemories(1);
        if (!chosen.length) return;
        await uploadMemories(chosen, id, session!.user.id, (u) => {
          if (u.state === 'saved') memory = u.id;
        });
        if (!memory) throw new Error('upload_failed');
        await queryClient.invalidateQueries({ queryKey: ['memories', id] });
      }
      const r = await db().rpc('record_activity_feedback', {
        cid: id,
        batch,
        item_index: index,
        answer: signal,
        ...(memory ? { photo: memory } : {}),
      });
      if (r.error) throw r.error;
      setNotice(
        photo ? 'Your activity memory is in the timeline.' : 'Saved. A little moment, together.',
      );
    },
    onSuccess: () => feedback.refetch(),
  });
  const currentWeek = (() => {
    const d = new Date(
      new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00Z',
    );
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  })();
  const latest = batches.data?.[0],
    questionDue =
      !prefs.data?.answered_at || Date.now() - Date.parse(prefs.data.answered_at) > 14 * 86400000;
  return (
    <Guard>
      <Screen back wide>
        <Eyebrow>A little time, together</Eyebrow>
        <Heading>This week’s little adventures.</Heading>
        <Body>
          Three simple invitations to play. Follow your child’s interest, and skip anything that
          doesn’t feel right for today.
        </Body>
        {access.isPending ? (
          <Loading />
        ) : !allowed ? (
          <Card>
            <Body>Turn on personalisation to see activities for this child.</Body>
            <Button
              title="Review privacy choices"
              onPress={() => router.push(`/children/${id}/privacy`)}
            />
          </Card>
        ) : (
          <>
            <SensitiveNotice />
            <Body muted>
              Activities use age, interests and consented milestones. With health consent, recorded
              allergens are checked as a safety filter and that read is audited. Names, photos and
              sex are never sent to OpenAI. Live weather is unavailable, so this release offers
              indoor alternatives.
            </Body>
            {write ? (
              <Card>
                <Heading small>What fits your day?</Heading>
                <View className="flex-row gap-2 flex-wrap">
                  {[5, 10, 20, 30].map((n) => (
                    <Button
                      key={n}
                      title={`${n} minutes${minutes === n ? ' · selected' : ''}`}
                      variant="secondary"
                      onPress={() => setMinutes(n)}
                    />
                  ))}
                </View>
                <View className="flex-row gap-2 flex-wrap">
                  {['indoors', 'outdoors', 'either'].map((p) => (
                    <Button
                      key={p}
                      title={`${p}${place === p ? ' · selected' : ''}`}
                      variant="quiet"
                      onPress={() => setPlace(p)}
                    />
                  ))}
                </View>
                <View className="flex-row gap-2">
                  {['free', 'low'].map((c) => (
                    <Button
                      key={c}
                      title={`${c === 'free' ? 'No spending' : 'Low budget'}${cost === c ? ' · selected' : ''}`}
                      variant="secondary"
                      onPress={() => setCost(c)}
                    />
                  ))}
                </View>
                <Button
                  title="Save activity preferences"
                  loading={save.isPending}
                  onPress={() => save.mutate(false)}
                />
                {questionDue ? (
                  <>
                    <Heading small>One little question.</Heading>
                    <Field
                      label={`What does ${child.data?.name ?? 'your child'} love right now?`}
                      value={answer}
                      onChangeText={setAnswer}
                      maxLength={400}
                    />
                    <Body muted>
                      Interests are plenty. Keep health details in the private health record.
                    </Body>
                    <Button
                      title="Save this little detail"
                      loading={save.isPending}
                      onPress={() => save.mutate(true)}
                    />
                  </>
                ) : null}
              </Card>
            ) : null}
            <ErrorNotice
              message={
                generate.isError || save.isError || respond.isError
                  ? friendlyError(generate.error ?? save.error ?? respond.error)
                  : batches.isError
                    ? 'Activities could not load. Try again.'
                    : null
              }
            />
            {notice ? <Body>{notice}</Body> : null}
            {batches.isError ? (
              <Button title="Retry activities" onPress={() => void batches.refetch()} />
            ) : null}
            {write && latest?.week_start !== currentWeek ? (
              <Button
                title="Prepare this week’s activities"
                loading={generate.isPending}
                onPress={() => generate.mutate()}
              />
            ) : null}
            {batches.isPending ? (
              <Loading />
            ) : !latest ? (
              <Card>
                <Body>Your first three activities will appear here once prepared.</Body>
              </Card>
            ) : (
              <>
                <Body>
                  Week of {latest.week_start} ·{' '}
                  {latest.model.startsWith('curated')
                    ? 'Curated activities'
                    : 'AI-generated, safety-checked activities'}
                </Body>
                {latest.items.map((a, index) => {
                  const signals = feedback.data?.filter(
                    (f) => f.batch_id === latest.id && f.activity_index === index,
                  );
                  return (
                    <Card key={index} tint={index === 0}>
                      <Eyebrow>
                        {a.domain} · {a.minutes} minutes · {a.setting}
                      </Eyebrow>
                      <Heading small>{a.title}</Heading>
                      <Body>{a.why}</Body>
                      {a.steps.map((s, i) => (
                        <Body key={i}>
                          {i + 1}. {s}
                        </Body>
                      ))}
                      <Body muted>
                        {a.materials.length
                          ? 'Bring: ' + a.materials.map((m) => m.name).join(', ')
                          : 'No materials needed.'}
                      </Body>
                      <Body>{a.safety_note}</Body>
                      {access.data?.capabilities['activities.feedback'] ? (
                        <View className="flex-row gap-2 flex-wrap">
                          <Button
                            title={
                              signals?.some((s) => s.signal === 'up')
                                ? 'Liked'
                                : 'Like this activity'
                            }
                            variant="secondary"
                            disabled={respond.isPending}
                            onPress={() =>
                              respond.mutate({ batch: latest.id, index, signal: 'up' })
                            }
                          />
                          <Button
                            title={
                              signals?.some((s) => s.signal === 'down')
                                ? 'Not for us · saved'
                                : 'Not for us'
                            }
                            variant="quiet"
                            disabled={respond.isPending}
                            onPress={() =>
                              respond.mutate({ batch: latest.id, index, signal: 'down' })
                            }
                          />
                          <Button
                            title={
                              signals?.some((s) => s.signal === 'did_it')
                                ? 'We did it · saved'
                                : 'We did it'
                            }
                            disabled={respond.isPending}
                            onPress={() =>
                              respond.mutate({ batch: latest.id, index, signal: 'did_it' })
                            }
                          />
                          {access.data?.purposes.memories &&
                          access.data.capabilities['memories.add'] ? (
                            <Button
                              title={`Add a memory · ${a.title}`}
                              variant="secondary"
                              loading={respond.isPending}
                              onPress={() =>
                                respond.mutate({
                                  batch: latest.id,
                                  index,
                                  signal: 'did_it',
                                  photo: true,
                                })
                              }
                            />
                          ) : null}
                        </View>
                      ) : null}
                    </Card>
                  );
                })}
              </>
            )}
          </>
        )}
      </Screen>
    </Guard>
  );
}
