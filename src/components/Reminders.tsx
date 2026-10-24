import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Body, Button, Card, ErrorNotice, Field, Heading, Toggle } from './ui';
const prefSchema = z.object({
  show_child_name: z.boolean(),
  quiet_start: z.string(),
  quiet_end: z.string(),
  timezone: z.string(),
  push_enabled: z.boolean(),
});
const noticeSchema = z.object({ id: z.uuid(), type: z.string(), sent_at: z.string() });
const copy: Record<string, { text: string; route: string }> = {
  milestone: {
    text: 'A little first to reflect on. Add a date or photo, or choose not yet.',
    route: 'milestones',
  },
  memory: {
    text: 'It has been two weeks since your last memory. An ordinary moment counts, too.',
    route: 'memories',
  },
  activities: {
    text: 'This week’s activities are ready for a little time together.',
    route: 'activities',
  },
  vaccination: {
    text: 'A saved vaccination plan has a visit to review. Confirm the date with your clinician.',
    route: 'health',
  },
};
export function Reminders({
  childId,
  enabled,
  health = false,
  settings = false,
}: {
  childId: string;
  enabled: boolean;
  health?: boolean;
  settings?: boolean;
}) {
  const { session } = useAuth();
  const [showName, setShowName] = useState(false),
    [start, setStart] = useState('21:00'),
    [end, setEnd] = useState('08:00'),
    [zone, setZone] = useState('Asia/Kolkata'),
    [push, setPush] = useState(true),
    [registered, setRegistered] = useState(false);
  const prefs = useQuery({
    queryKey: ['notification-preferences', childId, session?.user.id],
    enabled: !!session && enabled,
    queryFn: async () => {
      const r = await db()
        .from('notification_preferences')
        .select('*')
        .eq('child_id', childId)
        .eq('user_id', session!.user.id)
        .maybeSingle();
      if (r.error) throw r.error;
      return prefSchema.nullable().parse(r.data);
    },
  });
  useEffect(() => {
    if (prefs.data) {
      setShowName(prefs.data.show_child_name);
      setStart(prefs.data.quiet_start.slice(0, 5));
      setEnd(prefs.data.quiet_end.slice(0, 5));
      setZone(prefs.data.timezone);
      setPush(prefs.data.push_enabled);
    }
  }, [prefs.data]);
  const notices = useQuery({
    queryKey: ['reminders', childId, session?.user.id],
    enabled: !!session && enabled,
    queryFn: async () => {
      const r = await db()
        .from('notifications_log')
        .select('id,type,sent_at')
        .eq('child_id', childId)
        .is('response', null)
        .order('sent_at', { ascending: false })
        .limit(10);
      if (r.error) throw r.error;
      return z.array(noticeSchema).parse(r.data);
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      if (
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) ||
        start === end
      )
        throw new Error('time');
      const r = await db().rpc('save_notification_preferences', {
        cid: childId,
        show_name: showName,
        start_time: start,
        end_time: end,
        zone,
        push,
      });
      if (r.error) throw r.error;
    },
    onSuccess: () => prefs.refetch(),
  });
  const dismiss = useMutation({
    mutationFn: async (nid: string) => {
      const r = await db().rpc('dismiss_reminder', { nid });
      if (r.error) throw r.error;
    },
    onSuccess: () => notices.refetch(),
  });
  const register = useMutation({
    mutationFn: async () => {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) throw new Error('native_build_required');
      const Notifications = await import('expo-notifications');
      if (Platform.OS === 'android')
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Family moments',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      const allowed = await Notifications.requestPermissionsAsync();
      if (allowed.status !== 'granted') throw new Error('permission');
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      const r = await db()
        .from('push_devices')
        .upsert(
          { user_id: session!.user.id, token, platform: Platform.OS },
          { onConflict: 'token' },
        );
      if (r.error) throw r.error;
      setRegistered(true);
    },
  });
  if (!enabled) return null;
  if (!settings)
    return (
      <>
        {notices.data
          ?.filter((n) => copy[n.type] && (n.type !== 'vaccination' || health))
          .slice(0, 3)
          .map((n) => (
            <Card key={n.id} tint>
              <Body>{copy[n.type]!.text}</Body>
              <View className="flex-row flex-wrap gap-3">
                <Button
                  title="Take a look"
                  onPress={() =>
                    router.push(`/children/${childId}/${copy[n.type]!.route}` as never)
                  }
                />
                <Button title="Dismiss" variant="quiet" onPress={() => dismiss.mutate(n.id)} />
              </View>
            </Card>
          ))}
      </>
    );
  return (
    <Card>
      <Heading small>Gentle reminders, on your terms.</Heading>
      <Body>
        At most one milestone reminder per child each week. “Not yet” pauses that question for five
        weeks. Check-in cards about a clinician visit stay inside the app.
      </Body>
      <Toggle
        title="Show the child’s name on the lock screen"
        detail="Off keeps notification text generic. Health facts are never shown."
        value={showName}
        onChange={setShowName}
      />
      <Toggle title="Mobile push notifications" value={push} onChange={setPush} />
      <Field label="Quiet hours begin (HH:MM)" value={start} onChangeText={setStart} />
      <Field label="Quiet hours end (HH:MM)" value={end} onChangeText={setEnd} />
      <Body>Time zone: {zone}</Body>
      <View className="flex-row flex-wrap gap-2">
        {[
          'Asia/Kolkata',
          'UTC',
          'Europe/London',
          'America/New_York',
          'America/Los_Angeles',
          'Asia/Singapore',
          'Australia/Sydney',
        ].map((z) => (
          <Button
            key={z}
            title={z}
            variant={zone === z ? 'primary' : 'secondary'}
            onPress={() => setZone(z)}
          />
        ))}
      </View>
      <Button
        title="Save reminder settings"
        loading={save.isPending}
        onPress={() => save.mutate()}
      />
      {save.isSuccess ? <Body>Settings saved.</Body> : null}
      {Platform.OS === 'web' ? (
        <Body muted>
          On the web, reminders appear in your family space. Push notifications are available in the
          iOS and Android builds.
        </Body>
      ) : (
        <Button
          title={registered ? 'This device is connected' : 'Enable notifications on this device'}
          loading={register.isPending}
          onPress={() => register.mutate()}
        />
      )}
      <ErrorNotice
        message={
          save.isError
            ? 'Check the time format and try again.'
            : register.isError
              ? 'Notifications need a configured native app build and device permission.'
              : null
        }
      />
    </Card>
  );
}
