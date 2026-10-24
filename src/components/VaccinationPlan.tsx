import { useState } from 'react';
import { View, Linking } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, Heading, Body, Button, Toggle, Field, ErrorNotice, Loading } from './ui';
import { db } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { queryClient } from '../lib/query';
import { friendlyError } from '../lib/errors';
import { useEditorFocus } from '../lib/focus';
import {
  planSchema,
  schedules,
  scheduledDate,
  type Schedule,
  type Reminder,
} from '../domain/vaccinations';
import type { Vaccination } from '../domain/health';
export function VaccinationPlan({
  childId,
  dob,
  canWrite,
  logs,
}: {
  childId: string;
  dob: string;
  canWrite: boolean;
  logs: Vaccination[];
}) {
  const { session } = useAuth();
  const q = useQuery({
    queryKey: ['vaccination-plan', childId, session?.user.id],
    gcTime: 0,
    queryFn: async () => {
      const r = await db().rpc('read_vaccination_plan', { cid: childId });
      if (r.error) throw r.error;
      return planSchema.parse(r.data);
    },
  });
  const [all, setAll] = useState(false),
    [edit, setEdit] = useState<Schedule | null>(null);
  const save = useMutation({
    mutationFn: async ({ plan, enabled }: { plan: 'UIP' | 'IAP'; enabled: boolean }) => {
      const r = await db().rpc('set_vaccination_plan', {
        cid: childId,
        chosen_plan: plan,
        enabled,
      });
      if (r.error) throw r.error;
    },
    onSuccess: () => q.refetch(),
  });
  const prefs = q.data?.preferences;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const items = schedules.filter((s) => s.plan === prefs?.plan);
  const refresh = async () => {
    setEdit(null);
    await q.refetch();
    await queryClient.invalidateQueries({ queryKey: ['health', childId] });
  };
  return (
    <Card>
      <Heading small>Vaccination visits</Heading>
      <Body>
        Choose the schedule you follow with your clinician. Dates are planning reminders, not
        instructions to vaccinate. Bring your vaccination card to confirm the product, interval and
        any catch-up plan.
      </Body>
      <Body muted>
        Source verified; not individually reviewed by a paediatrician. Checked 24 October 2026. Only
        childhood visits through age five are shown; visits spanning ages five–six remain visible.
      </Body>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <>
          <ErrorNotice message="The schedule could not be opened." />
          <Button title="Retry schedule" onPress={() => void q.refetch()} />
        </>
      ) : (
        <>
          {canWrite ? (
            <View className="flex-row flex-wrap gap-3">
              {(['UIP', 'IAP'] as const).map((plan) => (
                <Button
                  key={plan}
                  title={`${plan === 'UIP' ? 'National UIP' : 'IAP 2025'}${prefs?.plan === plan ? ' · selected' : ''}`}
                  variant={prefs?.plan === plan ? 'primary' : 'secondary'}
                  loading={save.isPending}
                  onPress={() => save.mutate({ plan, enabled: prefs?.reminders_enabled ?? false })}
                />
              ))}
            </View>
          ) : null}
          {!prefs ? (
            <Body>No schedule selected yet.</Body>
          ) : (
            <>
              <Button
                title={`Read ${prefs.plan} source`}
                variant="quiet"
                onPress={() => void Linking.openURL(items[0]!.source_url)}
              />
              {canWrite ? (
                <Toggle
                  title="Vaccination visit reminders"
                  detail="Also requires notification consent. Web shows reminders in the app; push is available in the native app."
                  value={prefs.reminders_enabled}
                  onChange={(enabled) => save.mutate({ plan: prefs.plan, enabled })}
                />
              ) : null}
              <Button
                title={
                  all ? 'Show current and upcoming visits' : 'Show all visits and completed records'
                }
                variant="quiet"
                onPress={() => setAll(!all)}
              />
              {edit ? (
                <ReminderEditor
                  key={edit.id}
                  item={edit}
                  childId={childId}
                  reminder={q.data?.reminders.find((r) => r.item_id === edit.id)}
                  logs={logs}
                  onDone={refresh}
                  onCancel={() => setEdit(null)}
                />
              ) : null}
              {items
                .filter((s) => all || scheduledDate(dob, s.age_end, s.age_unit) >= today)
                .map((s) => {
                  const r = q.data?.reminders.find((r) => r.item_id === s.id);
                  return (
                    <View key={s.id} className="gap-2 border-t border-line pt-4">
                      <Body>
                        {s.visit} · {s.vaccine_name}
                      </Body>
                      <Body muted>
                        {r?.vaccination_log_id
                          ? 'Recorded in vaccination log'
                          : r?.excluded
                            ? 'Marked not applicable'
                            : r?.appointment_on
                              ? `Appointment: ${r.appointment_on}`
                              : s.requires_confirmed_date
                                ? 'Confirm eligibility and a date with your clinician'
                                : `${scheduledDate(dob, s.age_start, s.age_unit)}${s.age_end !== s.age_start ? ' to ' + scheduledDate(dob, s.age_end, s.age_unit) : ''}`}
                      </Body>
                      {s.notes ? <Body muted>{s.notes}</Body> : null}
                      {canWrite ? (
                        <Button
                          title={`Manage ${s.vaccine_name} · ${s.visit}`}
                          variant="quiet"
                          onPress={() => setEdit(s)}
                        />
                      ) : null}
                    </View>
                  );
                })}
              {!all ? (
                <Body muted>
                  Earlier visits are in “Show all”. Missing records do not mean a vaccination was
                  missed.
                </Body>
              ) : null}
            </>
          )}
        </>
      )}
      <ErrorNotice message={save.isError ? friendlyError(save.error) : null} />
    </Card>
  );
}
function ReminderEditor({
  item,
  childId,
  reminder,
  logs,
  onDone,
  onCancel,
}: {
  item: Schedule;
  childId: string;
  reminder?: Reminder;
  logs: Vaccination[];
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [given, setGiven] = useState(
      new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    ),
    [visit, setVisit] = useState(reminder?.appointment_on ?? ''),
    [existing, setExisting] = useState(reminder?.vaccination_log_id ?? '');
  useEditorFocus('vaccination-editor', item.id);
  const save = useMutation({
    mutationFn: async (answer: 'pending' | 'completed' | 'not_applicable') => {
      const r = await db().rpc('set_vaccination_reminder', {
        cid: childId,
        item: item.id,
        answer,
        ...(answer === 'completed'
          ? existing
            ? { existing_log: existing }
            : { given_date: given }
          : {}),
        ...(visit ? { visit_date: visit } : {}),
      });
      if (r.error) throw r.error;
    },
    onSuccess: onDone,
  });
  return (
    <Card tint anchor="vaccination-editor">
      <Heading small>{item.vaccine_name}</Heading>
      <Body>
        Record only what was given, or save a date agreed with your clinician. Changing this
        reminder does not delete vaccination log entries.
      </Body>
      <Field
        label="Clinician-confirmed appointment (YYYY-MM-DD, optional)"
        value={visit}
        onChangeText={setVisit}
      />
      <Button
        title="Save appointment / keep pending"
        loading={save.isPending}
        onPress={() => save.mutate('pending')}
      />
      <Field
        label="Date vaccination was given (YYYY-MM-DD)"
        value={given}
        onChangeText={setGiven}
      />
      {logs.length ? (
        <>
          <Body>Or link an existing vaccination record:</Body>
          <View className="gap-2">
            {logs.map((l) => (
              <Button
                key={l.id}
                title={`${existing === l.id ? 'Selected · ' : ''}${l.vaccine_name} · ${l.given_on}`}
                variant="secondary"
                onPress={() => setExisting(existing === l.id ? '' : l.id)}
              />
            ))}
          </View>
        </>
      ) : null}
      <Button
        title={existing ? 'Confirm link to selected record' : 'Confirm given and add to log'}
        loading={save.isPending}
        onPress={() => save.mutate('completed')}
      />
      <Button
        title="Clinician says not applicable"
        variant="quiet"
        onPress={() => save.mutate('not_applicable')}
      />
      <Button title="Cancel schedule edit" variant="quiet" onPress={onCancel} />
      <ErrorNotice message={save.isError ? friendlyError(save.error) : null} />
    </Card>
  );
}
