import { useState } from 'react';
import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Body, Button, Card, ErrorNotice, Field, Heading, SensitiveNotice } from './ui';
import { db } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { refreshFamily } from '../lib/data';
const jobSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['export', 'deletion']),
  status: z.string(),
  requested_at: z.string(),
  expires_at: z.string().nullable(),
  cursor: z.number(),
  total_files: z.number(),
  parts: z.array(z.string()),
});
export function DataManagement({ childId }: { childId?: string }) {
  const { session } = useAuth();
  const [confirm, setConfirm] = useState(false),
    [word, setWord] = useState('');
  const jobs = useQuery({
    queryKey: ['data-jobs', session?.user.id, childId],
    enabled: !!session,
    refetchInterval: 5000,
    queryFn: async () => {
      let q = db()
        .from('data_jobs')
        .select('id,kind,status,requested_at,expires_at,cursor,total_files,parts')
        .order('requested_at', { ascending: false })
        .limit(20);
      if (childId) q = q.eq('child_id', childId);
      else q = q.eq('kind', 'deletion');
      const r = await q;
      if (r.error) throw r.error;
      return z.array(jobSchema).parse(r.data);
    },
  });
  const action = useMutation({
    mutationFn: async (kind: 'export' | 'delete') => {
      const r = await db().functions.invoke('data-actions', {
        body: { action: kind, childId, ...(kind === 'delete' ? { confirmation: word } : {}) },
      });
      if (r.error) throw r.error;
      z.object({ jobId: z.uuid() }).parse(r.data);
      return kind;
    },
    onSuccess: async (kind) => {
      await jobs.refetch();
      if (kind === 'delete') {
        await refreshFamily();
        router.replace('/family');
      }
    },
  });
  const download = useMutation({
    mutationFn: async ({ jobId, part }: { jobId: string; part: number }) => {
      const r = await db().functions.invoke('data-actions', {
        body: { action: 'download', jobId, part },
      });
      if (r.error) throw r.error;
      const result = z.object({ url: z.url(), expiresAt: z.number() }).parse(r.data);
      await Linking.openURL(result.url);
    },
  });
  if (!childId && !jobs.data?.length) return null;
  return (
    <Card>
      <Heading small>{childId ? 'Your data stays yours.' : 'Deletion requests'}</Heading>
      {childId ? (
        <>
          <SensitiveNotice />
          <Body>
            Export your family records and photos as ZIP files. Health records are included only
            while health consent is enabled; each access is recorded. Exports expire after 24 hours.
            Large libraries arrive in several numbered files.
          </Body>
          <Button
            title="Prepare data export"
            loading={action.isPending}
            onPress={() => action.mutate('export')}
          />
        </>
      ) : null}
      {jobs.data?.map((j) => (
        <View key={j.id} className="gap-3 border-t border-line pt-4">
          <Body>
            {j.kind === 'export' ? 'Family export' : 'Profile deletion'} ·{' '}
            {j.status === 'ready'
              ? 'Complete'
              : j.status === 'queued' || j.status === 'running'
                ? 'Processing in the background'
                : j.status}{' '}
            · {j.requested_at.slice(0, 10)}
          </Body>
          {j.kind === 'deletion' && j.status === 'ready' ? (
            <Body muted>
              Deletion receipt: {j.id}. All child records and stored files have been removed.
            </Body>
          ) : j.kind === 'export' && j.status === 'ready' ? (
            j.parts.map((_, i) => (
              <Button
                key={i}
                title={`Download ZIP ${i + 1} of ${j.parts.length}`}
                variant="secondary"
                loading={download.isPending}
                onPress={() => download.mutate({ jobId: j.id, part: i })}
              />
            ))
          ) : j.kind === 'export' && ['queued', 'running'].includes(j.status) ? (
            <Body muted>
              {j.cursor} of {j.total_files} photos prepared. You can leave this page.
            </Body>
          ) : null}
        </View>
      ))}
      <ErrorNotice
        message={
          action.isError || download.isError || jobs.isError
            ? 'This request could not be completed. Check your access and try again.'
            : null
        }
      />
      {childId ? (
        <>
          {confirm ? (
            <>
              <Body>
                Deleting this profile removes it for everyone now and permanently removes all its
                records and files in the background, within 30 days. This cannot be undone. Export
                first if you want a copy.
              </Body>
              <Field
                label="Type DELETE to confirm"
                value={word}
                onChangeText={setWord}
                autoCapitalize="characters"
              />
              <Button
                title="Permanently delete profile"
                variant="danger"
                disabled={word !== 'DELETE'}
                loading={action.isPending}
                onPress={() => action.mutate('delete')}
              />
              <Button
                title="Keep this profile"
                variant="quiet"
                onPress={() => {
                  setConfirm(false);
                  setWord('');
                }}
              />
            </>
          ) : (
            <Button
              title="Delete this child profile"
              variant="quiet"
              onPress={() => setConfirm(true)}
            />
          )}
        </>
      ) : null}
    </Card>
  );
}
