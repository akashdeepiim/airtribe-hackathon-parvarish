import { useState, useEffect, useRef } from 'react';
import { useEditorFocus } from '../../../src/lib/focus';
import { View, Text, Image } from 'react-native';
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
} from '../../../src/components/ui';
import { useChild, useAccess } from '../../../src/lib/data';
import { useAuth } from '../../../src/lib/auth';
import { db } from '../../../src/lib/supabase';
import { queryClient } from '../../../src/lib/query';
import { friendlyError } from '../../../src/lib/errors';
import {
  pickMemories,
  uploadMemories,
  useMemories,
  useMemoryPhotos,
  type UploadItem,
} from '../../../src/lib/memories';
import { groupMemories, memoryEditSchema, type Memory } from '../../../src/domain/memories';
import { idSchema } from '../../../src/domain/schemas';
const catalogueSchema = z.array(z.object({ id: idSchema, title: z.string(), source: z.string() }));
function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}
export default function Memories() {
  const { id = '', memory: linkedMemory } = useLocalSearchParams<{ id: string; memory?: string }>();
  const { session } = useAuth();
  const child = useChild(id),
    access = useAccess(id);
  const allowed = !!access.data?.purposes.memories && !!access.data?.capabilities['memories.read'];
  const memories = useMemories(id, allowed);
  const [limit, setLimit] = useState(60);
  const visible = (memories.data ?? []).slice(0, limit);
  const photos = useMemoryPhotos(
    visible.map((m) => m.storage_path),
    allowed,
  );
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Memory | null>(null);
  const [caption, setCaption] = useState('');
  const [taken, setTaken] = useState('');
  const [people, setPeople] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canTag =
    !!access.data?.purposes.milestones && !!access.data?.capabilities['milestones.write'];
  const catalogue = useQuery({
    queryKey: ['milestone-catalogue'],
    enabled: canTag,
    queryFn: async () => {
      const r = await db()
        .from('milestone_catalog')
        .select('id,title,source')
        .order('window_start_months');
      if (r.error) throw r.error;
      return catalogueSchema.parse(r.data);
    },
  });
  const reload = async () => {
    await queryClient.invalidateQueries({ queryKey: ['memories', id] });
    queryClient.removeQueries({ queryKey: ['memory-photos'] });
  };
  async function upload(items: UploadItem[]) {
    setBusy(true);
    setError(null);
    try {
      await uploadMemories(items, id, idSchema.parse(session?.user.id), (updated) =>
        setQueue((previous) => previous.map((p) => (p.id === updated.id ? updated : p))),
      );
      await reload();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function choose() {
    setNotice(null);
    setError(null);
    try {
      const items = await pickMemories();
      if (!items.length) return;
      setQueue(items);
      await upload(items);
    } catch {
      setError('Choose up to 50 supported images, then try again.');
    }
  }
  async function discard() {
    setBusy(true);
    for (const item of queue.filter((q) => q.state === 'failed' && q.path)) {
      const removed = await db().functions.invoke('memory-actions', {
        body: { action: 'discard', childId: id, path: item.path },
      });
      if (removed.error) {
        setError('Some uploads could not be cleared. Try again shortly.');
        setBusy(false);
        return;
      }
    }
    setQueue([]);
    setBusy(false);
  }
  function edit(m: Memory) {
    setSelected(m);
    setCaption(m.caption);
    setTaken(new Date(m.taken_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    setPeople(m.people_tags.join(', '));
    setDeleting(false);
    setTagging(false);
    setChosen(null);
    setError(null);
  }
  useEditorFocus('memory-editor', selected?.id);
  const openedLink = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!linkedMemory || openedLink.current === linkedMemory) return;
    const index = memories.data?.findIndex((m) => m.id === linkedMemory) ?? -1;
    if (index >= 0) {
      openedLink.current = linkedMemory;
      setLimit((n) => Math.max(n, index + 1));
      edit(memories.data![index]!);
    }
  }, [linkedMemory, memories.data]);
  const save = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const fields = memoryEditSchema.parse({
        caption,
        taken_at:
          taken ===
          new Date(selected.taken_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
            ? selected.taken_at
            : new Date(`${taken}T12:00:00+05:30`).toISOString(),
        people_tags: people
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      const r = await db()
        .from('memories')
        .update(fields)
        .eq('id', selected.id)
        .select('id')
        .single();
      if (r.error) throw r.error;
    },
    onSuccess: async () => {
      setSelected(null);
      await reload();
    },
    onError: (e) => setError(friendlyError(e)),
  });
  const remove = useMutation({
    mutationFn: async () => {
      const r = await db().functions.invoke('memory-actions', {
        body: { action: 'remove', memoryId: selected?.id },
      });
      if (r.error) throw r.error;
      return z
        .object({ removed: z.boolean(), cleanup: z.enum(['complete', 'queued']) })
        .parse(r.data);
    },
    onSuccess: async (r) => {
      setSelected(null);
      setNotice(
        r.cleanup === 'complete'
          ? 'Memory and photo removed.'
          : 'Memory removed. Photo cleanup is queued and will retry automatically.',
      );
      await reload();
    },
    onError: (e) => setError(friendlyError(e)),
  });
  const tag = useMutation({
    mutationFn: async () => {
      const r = await db().rpc('confirm_memory_milestone', {
        mid: idSchema.parse(selected?.id),
        milestone: idSchema.parse(chosen),
      });
      if (r.error) throw r.error;
    },
    onSuccess: async () => {
      setSelected(null);
      setNotice('This first is now part of their milestone story.');
      await reload();
      await queryClient.invalidateQueries({ queryKey: ['child-milestones', id] });
    },
    onError: (e) => setError(friendlyError(e)),
  });
  const mayEdit = (m: Memory) =>
    !!access.data?.capabilities['memories.edit_all'] ||
    (m.uploaded_by === session?.user.id && !!access.data?.capabilities['memories.edit_own']);
  const mayDelete = (m: Memory) =>
    !!access.data?.capabilities['memories.delete_all'] ||
    (m.uploaded_by === session?.user.id && !!access.data?.capabilities['memories.delete_own']);
  if (child.isPending || access.isPending)
    return (
      <Guard>
        <Screen>
          <Loading />
        </Screen>
      </Guard>
    );
  if (!child.data || !access.data)
    return (
      <Guard>
        <Screen>
          <ErrorNotice message="This family space is unavailable." />
        </Screen>
      </Guard>
    );
  return (
    <Guard>
      <Screen wide back>
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <View className="flex-1 min-w-[220px] gap-2">
            <Heading>Memories</Heading>
            <Body muted>{child.data.name}’s photos, arranged by age.</Body>
          </View>
          {allowed && !!memories.data?.length ? (
            <Button
              title="Create a keepsake"
              icon="color-palette-outline"
              variant="secondary"
              onPress={() => router.push(`/children/${id}/studio`)}
            />
          ) : null}
        </View>
        {!allowed ? (
          <Card>
            <Heading small>Your memories are paused.</Heading>
            <Body>Check your memories consent and family access to open this timeline.</Body>
            <Button
              title="Privacy choices"
              onPress={() => router.push(`/children/${id}/privacy`)}
            />
          </Card>
        ) : (
          <>
            <Card>
              <View className="flex-col md:flex-row md:items-center justify-between gap-4">
                <View className="flex-1 gap-1">
                  <Text className="text-base font-semibold text-ink">
                    {memories.data?.length
                      ? `${memories.data.length} memories, kept close`
                      : 'Add your first photos'}
                  </Text>
                  <Body muted>Up to 50 at a time. Private to your family.</Body>
                </View>
                <View className="self-start">
                  {access.data.capabilities['memories.add'] ? (
                    <Button
                      title="Add photos"
                      icon="images-outline"
                      loading={busy}
                      disabled={queue.some((q) => q.state === 'failed')}
                      onPress={() => void choose()}
                    />
                  ) : (
                    <Body muted>Your access lets you view this family’s memories.</Body>
                  )}
                </View>
              </View>
              {queue.length > 0 ? (
                <View accessibilityLiveRegion="polite" className="gap-3">
                  <Text className="font-semibold text-forest">
                    {queue.filter((q) => q.state === 'saved').length} of {queue.length} saved
                  </Text>
                  <View className="h-2 bg-paper rounded-full overflow-hidden">
                    <View
                      className="h-2 bg-forest"
                      style={{
                        width: `${(100 * queue.filter((q) => q.state === 'saved').length) / queue.length}%`,
                      }}
                    />
                  </View>
                  <Body muted>
                    {busy
                      ? 'Keep this page open while your photos upload.'
                      : queue.some((q) => q.state === 'failed')
                        ? 'Some photos could not upload. Saved photos are safe; retry the remaining ones.'
                        : 'Your memories are ready. Is one of them a first?'}
                  </Body>
                  {!busy && queue.some((q) => q.state === 'failed') ? (
                    <View className="flex-row flex-wrap gap-3">
                      <Button title="Retry remaining photos" onPress={() => void upload(queue)} />
                      <Button
                        title="Discard unsuccessful uploads"
                        variant="quiet"
                        onPress={() => void discard()}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Card>
            <ErrorNotice
              message={
                error ??
                (memories.isError
                  ? 'Your memories could not load. Please try again.'
                  : photos.isError
                    ? 'Some photos could not open. Refresh their access and try again.'
                    : null)
              }
            />
            {memories.isError || photos.isError ? (
              <Button
                title="Try loading again"
                variant="secondary"
                onPress={() => {
                  void memories.refetch();
                  void photos.refetch();
                }}
              />
            ) : null}
            {notice ? (
              <Card>
                <Body>{notice}</Body>
              </Card>
            ) : null}
            {selected ? (
              <Card anchor="memory-editor">
                <Eyebrow>A little moment</Eyebrow>
                {photos.data?.[selected.storage_path] ? (
                  <Image
                    source={{ uri: photos.data[selected.storage_path] }}
                    accessibilityLabel="Selected private memory"
                    style={{ width: '100%', height: 300, borderRadius: 20, resizeMode: 'contain' }}
                  />
                ) : null}
                {mayEdit(selected) ? (
                  <>
                    <Field
                      label="Caption"
                      value={caption}
                      onChangeText={setCaption}
                      multiline
                      maxLength={2000}
                    />
                    <Field
                      label="Photo date"
                      hint="YYYY-MM-DD"
                      value={taken}
                      onChangeText={setTaken}
                    />
                    <Field
                      label="Who’s in this memory?"
                      hint="Optional names, separated by commas. These stay in your family space."
                      value={people}
                      onChangeText={setPeople}
                    />
                    <Button
                      title="Save memory"
                      loading={save.isPending}
                      onPress={() => save.mutate()}
                    />
                  </>
                ) : (
                  <Body>{selected.caption || 'An everyday moment, worth keeping.'}</Body>
                )}
                {canTag && mayEdit(selected) ? (
                  <Button
                    title="This was a first"
                    variant="secondary"
                    onPress={() => setTagging(!tagging)}
                  />
                ) : null}
                {tagging ? (
                  <View className="gap-3">
                    <Body>Choose the first you want to remember.</Body>
                    <Body muted>
                      Source verified; not individually reviewed by a paediatrician. Open the
                      milestone tracker for the source and age context.
                    </Body>
                    {catalogue.data?.length ? (
                      catalogue.data.map((m) => (
                        <Button
                          key={m.id}
                          title={`${chosen === m.id ? '✓ ' : ''}${m.title}`}
                          variant={chosen === m.id ? 'primary' : 'secondary'}
                          onPress={() => setChosen(m.id)}
                        />
                      ))
                    ) : (
                      <Body muted>No published milestone entries are available yet.</Body>
                    )}
                    {chosen ? (
                      <>
                        <Body>
                          This records the selected milestone as achieved on{' '}
                          {dateLabel(selected.taken_at)} and links this photo. It replaces a
                          previously recorded date for the same milestone.
                        </Body>
                        <Button
                          title="Confirm this first"
                          loading={tag.isPending}
                          onPress={() => tag.mutate()}
                        />
                      </>
                    ) : null}
                  </View>
                ) : null}
                {mayDelete(selected) ? (
                  deleting ? (
                    <View className="gap-3">
                      <Body>
                        Remove this memory and its stored photo? A linked milestone keeps its
                        recorded date. This cannot be undone.
                      </Body>
                      <Button
                        title="Yes, remove this memory"
                        variant="danger"
                        loading={remove.isPending}
                        onPress={() => remove.mutate()}
                      />
                      <Button
                        title="Keep memory"
                        variant="quiet"
                        onPress={() => setDeleting(false)}
                      />
                    </View>
                  ) : (
                    <Button
                      title="Remove memory"
                      variant="quiet"
                      onPress={() => setDeleting(true)}
                    />
                  )
                ) : null}
                <Button
                  title="Close memory"
                  variant="quiet"
                  disabled={save.isPending || remove.isPending || tag.isPending}
                  onPress={() => setSelected(null)}
                />
              </Card>
            ) : null}
            {memories.isPending ? (
              <Loading />
            ) : !visible.length ? (
              <Card>
                <Heading small>The first page is yours.</Heading>
                <Body>
                  Add a handful of photos to see their story take shape. Big occasions and ordinary
                  afternoons both belong here.
                </Body>
              </Card>
            ) : (
              groupMemories(visible, child.data.dob).map((group) => (
                <View key={group.months} className="gap-4">
                  <Heading small>
                    {group.months < 0
                      ? 'Before the first hello'
                      : group.months === 0
                        ? 'Their first month'
                        : `${group.months} ${group.months === 1 ? 'month' : 'months'} old`}
                  </Heading>
                  <View className="flex-row flex-wrap gap-4">
                    {group.items.map((memory) => (
                      <View key={memory.id} style={{ flexBasis: 280, flexGrow: 1, maxWidth: 440 }}>
                        <View className="bg-paper border border-line rounded-card overflow-hidden">
                          {photos.data?.[memory.storage_path] ? (
                            <Image
                              source={{ uri: photos.data[memory.storage_path] }}
                              accessibilityLabel={`Private memory from ${dateLabel(memory.taken_at)}`}
                              style={{
                                width: '100%',
                                height: 250,
                                resizeMode: 'cover',
                              }}
                            />
                          ) : (
                            <View className="h-64 bg-sage rounded-card items-center justify-center">
                              <Body muted>Opening private photo…</Body>
                            </View>
                          )}
                          <View className="p-4 gap-3">
                            <Text className="text-xs text-muted">{dateLabel(memory.taken_at)}</Text>
                            {memory.caption ? <Body>{memory.caption}</Body> : null}
                            {memory.milestone_id ? <Eyebrow>A little first</Eyebrow> : null}
                            {memory.people_tags.length ? (
                              <Body muted>{memory.people_tags.join(' · ')}</Body>
                            ) : null}
                            <Button
                              title={mayEdit(memory) ? 'Edit memory' : 'Open memory'}
                              accessibilityLabel={`${mayEdit(memory) ? 'Edit' : 'Open'} memory from ${dateLabel(memory.taken_at)}`}
                              variant="quiet"
                              onPress={() => edit(memory)}
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
            {(memories.data?.length ?? 0) > limit ? (
              <Button
                title="Show more memories"
                variant="secondary"
                onPress={() => setLimit(limit + 60)}
              />
            ) : null}
          </>
        )}
      </Screen>
    </Guard>
  );
}
