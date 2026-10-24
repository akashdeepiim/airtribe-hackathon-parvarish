import { useState } from 'react';
import { useEditorFocus } from '../../../src/lib/focus';
import { View, Text, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Guard } from '../../../src/components/Guard';
import {
  Screen,
  Card,
  Heading,
  Body,
  Eyebrow,
  Button,
  Field,
  Toggle,
  ErrorNotice,
  Loading,
} from '../../../src/components/ui';
import { useChild, useAccess } from '../../../src/lib/data';
import { useMilestoneCatalogue, useChildMilestones } from '../../../src/lib/milestones';
import { milestonePrompt, type Milestone } from '../../../src/domain/milestones';
import { ageInReferenceMonths } from '../../../src/domain/growth';
import { db } from '../../../src/lib/supabase';
import { queryClient } from '../../../src/lib/query';
import { friendlyError } from '../../../src/lib/errors';
import { z } from 'zod';
export default function Milestones() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const child = useChild(id),
    access = useAccess(id);
  const enabled =
    !!access.data?.purposes.milestones && !!access.data?.capabilities['milestones.read'];
  const canWrite = enabled && !!access.data?.capabilities['milestones.write'];
  const catalogue = useMilestoneCatalogue(enabled),
    records = useChildMilestones(id, enabled);
  const [domain, setDomain] = useState('all'),
    [range, setRange] = useState<'now' | 'all' | 'achieved'>('now'),
    [selected, setSelected] = useState<Milestone | null>(null),
    [date, setDate] = useState(
      new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    ),
    [notice, setNotice] = useState<string | null>(null);
  useEditorFocus('milestone-editor', selected?.id);
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['child-milestones', id] });
    await queryClient.invalidateQueries({ queryKey: ['memories', id] });
  };
  const save = useMutation({
    mutationFn: async ({
      mid,
      answer,
    }: {
      mid: string;
      answer: 'achieved' | 'not_yet' | 'skipped';
    }) => {
      const r = await db().rpc('record_milestone', {
        cid: id,
        mid,
        answer,
        ...(answer === 'achieved' ? { achieved_date: z.iso.date().parse(date) } : {}),
      });
      if (r.error) throw r.error;
      return answer;
    },
    onSuccess: async (answer) => {
      setSelected(null);
      setNotice(
        answer === 'achieved'
          ? 'A little first, remembered.'
          : answer === 'not_yet'
            ? 'Saved. Within the observation window, we can ask again in five weeks. You can also pause this reminder.'
            : 'Skipped. Reminders for this skill are off.',
      );
      await refresh();
    },
  });
  const nudge = useMutation({
    mutationFn: async ({ mid, on }: { mid: string; on: boolean }) => {
      const r = await db().rpc('set_milestone_nudges', { cid: id, mid, enabled: on });
      if (r.error) throw r.error;
    },
    onSuccess: refresh,
  });
  const dismiss = useMutation({
    mutationFn: async (mid: string) => {
      const r = await db().rpc('dismiss_milestone_card', { cid: id, mid });
      if (r.error) throw r.error;
    },
    onSuccess: refresh,
  });
  const age = child.data
    ? ageInReferenceMonths(child.data.dob, new Date().toISOString().slice(0, 10))
    : 0;
  const map = new Map(records.data?.map((r) => [r.milestone_id, r]));
  const upcoming = catalogue.data
    ?.filter(
      (m) =>
        map.get(m.id)?.status === 'not_yet' &&
        milestonePrompt(m, map.get(m.id), age) === 'conversation' &&
        !(records.data ?? []).some(
          (r) =>
            r.consult_card_shown_at &&
            Date.parse(r.consult_card_shown_at) > Date.now() - 7 * 86400000,
        ),
    )
    .sort((a, b) => b.consult_by_months - a.consult_by_months)[0];
  const filtered = catalogue.data?.filter(
    (m) =>
      (domain === 'all' || m.domain === domain) &&
      (range === 'all' ||
        (range === 'achieved' && map.get(m.id)?.status === 'achieved') ||
        (range === 'now' &&
          m.window_start_months <= age &&
          m.consult_by_months >= Math.max(0, age - 6))),
  );
  return (
    <Guard>
      <Screen back wide>
        <Eyebrow>The firsts, and the getting there</Eyebrow>
        <Heading>Little steps. Their pace.</Heading>
        <Body>Keep a record of what you notice, with space for photos and conversations.</Body>
        {access.isPending || child.isPending ? (
          <Loading />
        ) : !enabled ? (
          <Card>
            <Body>Milestone consent and permission are needed to open this space.</Body>
            <Button
              title="Review privacy choices"
              onPress={() => router.push(`/children/${id}/privacy`)}
            />
          </Card>
        ) : (
          <>
            <Card tint>
              <Body>
                Source verified; not individually reviewed by a paediatrician. CDC ages are
                checkpoints, not developmental windows. WHO walking ages describe an observation
                window. These tools do not replace developmental screening. If skills are lost or
                you have concerns, speak with your clinician promptly.
              </Body>
              <Button
                title="How CDC checkpoints work"
                variant="quiet"
                onPress={() =>
                  void Linking.openURL('https://www.cdc.gov/act-early/milestones/2-months.html')
                }
              />
            </Card>
            <ErrorNotice
              message={
                save.isError || nudge.isError || dismiss.isError
                  ? friendlyError(save.error ?? nudge.error ?? dismiss.error)
                  : catalogue.isError || records.isError
                    ? 'Milestones could not be loaded. Try again.'
                    : null
              }
            />
            {catalogue.isError || records.isError ? (
              <Button
                title="Reload milestones"
                onPress={() => {
                  void catalogue.refetch();
                  void records.refetch();
                }}
              />
            ) : null}
            {notice ? (
              <View accessibilityLiveRegion="polite">
                <Body>{notice}</Body>
              </View>
            ) : null}
            {upcoming && canWrite ? (
              <Card tint>
                <Eyebrow>A conversation for your next visit</Eyebrow>
                <Heading small>{upcoming.title}</Heading>
                <Body>{upcoming.consult_copy}</Body>
                <Body muted>
                  This card stays in the app and is never sent as a push notification.
                </Body>
                <Button
                  title="I’ve noted this"
                  variant="secondary"
                  loading={dismiss.isPending}
                  onPress={() => dismiss.mutate(upcoming.id)}
                />
              </Card>
            ) : null}
            {selected ? (
              <Card>
                <Heading small>{selected.title}</Heading>
                <Field
                  label="Date of this first"
                  hint="YYYY-MM-DD"
                  value={date}
                  onChangeText={setDate}
                />
                <Body>
                  This records the skill as achieved on this date. To connect a photo, select it
                  from Memories and confirm “This was a first”.
                </Body>
                <Button
                  title="Confirm this first"
                  loading={save.isPending}
                  onPress={() => save.mutate({ mid: selected.id, answer: 'achieved' })}
                />
                <Button
                  title="Choose a memory instead"
                  variant="secondary"
                  onPress={() => router.push(`/children/${id}/memories`)}
                />
                <Button title="Cancel" variant="quiet" onPress={() => setSelected(null)} />
              </Card>
            ) : null}
            <View className="flex-row flex-wrap gap-2">
              {(['now', 'all', 'achieved'] as const).map((r) => (
                <Button
                  key={r}
                  title={
                    r === 'now'
                      ? 'Around this chapter'
                      : r === 'all'
                        ? 'All ages'
                        : 'Celebrated firsts'
                  }
                  variant={range === r ? 'primary' : 'secondary'}
                  onPress={() => setRange(r)}
                />
              ))}
            </View>
            <View className="flex-row flex-wrap gap-2">
              {['all', 'motor', 'language', 'social', 'cognitive'].map((d) => (
                <Button
                  key={d}
                  title={
                    d === 'all'
                      ? 'Every area'
                      : d === 'social'
                        ? 'Social & emotional'
                        : d[0]!.toUpperCase() + d.slice(1)
                  }
                  variant={domain === d ? 'primary' : 'quiet'}
                  onPress={() => setDomain(d)}
                />
              ))}
            </View>
            {catalogue.isPending || records.isPending ? (
              <Loading />
            ) : !filtered?.length ? (
              <Card>
                <Body>
                  No milestones in this view yet. Explore all ages or add a first from a memory.
                </Body>
              </Card>
            ) : (
              filtered.map((m) => {
                const r = map.get(m.id);
                return (
                  <Card key={m.id}>
                    <Eyebrow>
                      {m.domain} ·{' '}
                      {m.age_basis === 'who_window'
                        ? `WHO observed window ${m.window_start_months}–17.6 months`
                        : `CDC checkpoint: ${m.window_start_months} months`}
                    </Eyebrow>
                    <Heading small>{m.title}</Heading>
                    <Body>
                      {r?.status === 'achieved'
                        ? `Remembered on ${r.achieved_on}`
                        : r?.status === 'skipped'
                          ? 'Skipped · reminders off'
                          : m.prompt_question}
                    </Body>
                    {r?.status === 'not_yet' ? <Body muted>{m.reassurance_copy}</Body> : null}
                    <Body muted>{m.did_you_know}</Body>
                    {r?.memory_id ? (
                      <Button
                        title="Open the memory timeline"
                        variant="secondary"
                        onPress={() =>
                          router.push(`/children/${id}/memories?memory=${r.memory_id}`)
                        }
                      />
                    ) : null}
                    {canWrite ? (
                      <>
                        <View className="flex-row gap-3 flex-wrap">
                          <Button
                            title={
                              r?.status === 'achieved'
                                ? 'Edit achievement date'
                                : 'Yes, a little first'
                            }
                            onPress={() => {
                              setSelected(m);
                              setDate(r?.achieved_on ?? new Date().toISOString().slice(0, 10));
                            }}
                          />
                          <Button
                            title={`Not yet — ${m.title}`}
                            variant="secondary"
                            loading={save.isPending}
                            onPress={() => save.mutate({ mid: m.id, answer: 'not_yet' })}
                          />
                          <Button
                            title={`Skip — ${m.title}`}
                            variant="quiet"
                            loading={save.isPending}
                            onPress={() => save.mutate({ mid: m.id, answer: 'skipped' })}
                          />
                        </View>
                        <Toggle
                          title={`Reminders for ${m.title}`}
                          value={r?.nudges_enabled ?? true}
                          disabled={nudge.isPending}
                          onChange={(on) => nudge.mutate({ mid: m.id, on })}
                        />
                      </>
                    ) : null}
                    <Button
                      title={`Read source for ${m.title}`}
                      variant="quiet"
                      onPress={() => void Linking.openURL(m.source)}
                    />
                    <Text className="text-xs text-muted">
                      {m.clinical_review_status === 'approved'
                        ? 'Paediatric review approved'
                        : 'Source verified; not individually reviewed by a paediatrician'}{' '}
                      · {m.source_verified_at ?? 'See source'}
                    </Text>
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
