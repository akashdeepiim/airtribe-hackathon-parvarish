import { useState, useEffect, useMemo } from 'react';
import { View, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
  Loading,
  ErrorNotice,
} from '../../../src/components/ui';
import { useChild, useAccess } from '../../../src/lib/data';
import { useMemories, useMemoryPhotos } from '../../../src/lib/memories';
import { templates, themes, type Crop, type RenderInput } from '../../../src/domain/templates';
import { ageMonths } from '../../../src/domain/memories';
import { renderTemplate } from '../../../src/lib/template-renderer';
import { hasShareNotice, markShareNotice, shareImage } from '../../../src/lib/share-image';
const center: Crop = { zoom: 1, x: 0, y: 0 };
export default function Studio() {
  const {
      id = '',
      memory,
      recap,
    } = useLocalSearchParams<{ id: string; memory?: string; recap?: string }>(),
    child = useChild(id),
    access = useAccess(id);
  const canRead = !!access.data?.capabilities['memories.read'] && !!access.data?.purposes.memories;
  const memories = useMemories(id, canRead);
  const [templateId, setTemplateId] = useState(recap ? 'recap' : 'month'),
    [theme, setTheme] = useState<keyof typeof themes>('sage'),
    [size, setSize] = useState<'story' | 'square'>('story');
  const [title, setTitle] = useState(''),
    [subtitle, setSubtitle] = useState('The little things, remembered.'),
    [watermark, setWatermark] = useState(true),
    [slots, setSlots] = useState<(string | null)[]>([]),
    [crops, setCrops] = useState<Crop[]>(Array.from({ length: 6 }, () => ({ ...center }))),
    [slot, setSlot] = useState(0),
    [month, setMonth] = useState('');
  const [preview, setPreview] = useState(''),
    [exported, setExported] = useState(''),
    [rendering, setRendering] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(false),
    [noticeSeen, setNoticeSeen] = useState(false),
    [exporting, setExporting] = useState(false);
  const template = useMemo(() => {
    const base = templates.find((t) => t.id === templateId)!;
    return templateId === 'recap' && slots.length > 0 && slots.length < 6
      ? { ...base, slots: base.slots.slice(0, slots.length) }
      : base;
  }, [templateId, slots.length]);
  const monthGroups = useMemo(
    () => [...new Set((memories.data ?? []).map((m) => m.taken_at.slice(0, 7)))],
    [memories.data],
  );
  useEffect(() => {
    void hasShareNotice()
      .then(setNoticeSeen)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!child.data || !memories.data?.length || slots.length) return;
    const selected = memory ? memories.data.find((m) => m.id === memory) : null;
    const recentMonth = memories.data[0]!.taken_at.slice(0, 7);
    setMonth(recentMonth);
    const items = recap
      ? memories.data.filter((m) => m.taken_at.startsWith(recentMonth))
      : memories.data;
    setSlots([
      selected?.id ?? items[0]!.id,
      ...items
        .filter((m) => m.id !== (selected?.id ?? items[0]!.id))
        .slice(0, 5)
        .map((m) => m.id),
    ]);
    setTitle(
      recap
        ? `${child.data.name} · ${recentMonth}`
        : `${child.data.name}, ${Math.max(0, ageMonths(child.data.dob, new Date().toISOString()))} months`,
    );
  }, [child.data, memories.data, memory, recap, slots.length]);
  const visible = (memories.data ?? []).slice(0, 100);
  const paths = [
    ...new Set(
      [...visible, ...(memories.data ?? []).filter((m) => slots.includes(m.id))].map(
        (m) => m.storage_path,
      ),
    ),
  ];
  const photos = useMemoryPhotos(paths, canRead);
  const input = useMemo<RenderInput>(
    () => ({
      template,
      theme,
      title,
      subtitle,
      watermark,
      size,
      photos: template.slots.map((_, i) => {
        const m = memories.data?.find((m) => m.id === slots[i]);
        const url = m ? photos.data?.[m.storage_path] : null;
        return url ? { url, crop: crops[i] ?? center } : null;
      }),
    }),
    [template, theme, title, subtitle, watermark, size, memories.data, slots, photos.data, crops],
  );
  useEffect(() => {
    setExported('');
    if (!canRead || !photos.data) return;
    let active = true;
    const t = setTimeout(() => {
      setRendering(true);
      void renderTemplate(input, true)
        .then((p) => {
          if (active) {
            setPreview(p);
            setError('');
          }
        })
        .catch((e: unknown) => {
          if (active)
            setError('The preview could not render. Try another photo or reload the studio.');
        })
        .finally(() => {
          if (active) setRendering(false);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [input, canRead, photos.data]);
  const chooseRecap = (m: string) => {
    setMonth(m);
    setTemplateId('recap');
    setSlots(
      (memories.data ?? [])
        .filter((p) => p.taken_at.startsWith(m))
        .slice(0, 6)
        .map((p) => p.id),
    );
    setCrops(Array.from({ length: 6 }, () => ({ ...center })));
    setTitle(
      `${child.data?.name ?? ''} · ${new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
    );
  };
  const makeExport = async () => {
    setExporting(true);
    setError('');
    try {
      setExported(await renderTemplate(input));
    } catch {
      setError('Export could not finish. Check the photo connection and try again.');
    } finally {
      setExporting(false);
    }
  };
  const adjust = (field: keyof Crop, delta: number) =>
    setCrops((old) =>
      old.map((c, i) =>
        i !== slot
          ? c
          : {
              ...c,
              [field]: Math.max(
                field === 'zoom' ? 1 : -1,
                Math.min(field === 'zoom' ? 3 : 1, c[field] + delta),
              ),
            },
      ),
    );
  return (
    <Guard>
      <Screen back wide>
        <Eyebrow>Little moments. Made to keep.</Eyebrow>
        <Heading>Your memory studio.</Heading>
        <Body>Choose a layout, make it yours, and keep a little piece of this chapter.</Body>
        {access.isPending || memories.isPending ? (
          <Loading />
        ) : !canRead ? (
          <Card>
            <Body>Memory consent and access are needed to open the studio.</Body>
          </Card>
        ) : !memories.data?.length ? (
          <Card>
            <Heading small>Start with a memory.</Heading>
            <Button
              title="Add your first photos"
              onPress={() => router.push(`/children/${id}/memories`)}
            />
          </Card>
        ) : (
          <>
            <Card>
              <Heading small>A month, already made.</Heading>
              <Body muted>
                Your recap picks up to six photos from that month. Change any photo or caption
                before sharing.
              </Body>
              <View className="flex-row flex-wrap gap-2">
                {monthGroups.map((m) => (
                  <Button
                    key={m}
                    title={`${month === m && templateId === 'recap' ? 'Selected · ' : ''}${m}`}
                    variant="secondary"
                    onPress={() => chooseRecap(m)}
                  />
                ))}
              </View>
            </Card>
            <View className="flex-col lg:flex-row gap-6">
              <View className="flex-1 gap-4">
                <Card>
                  <Heading small>1. Pick a feeling</Heading>
                  <View className="flex-row flex-wrap gap-2">
                    {templates.map((t) => (
                      <Button
                        key={t.id}
                        title={`${templateId === t.id ? 'Selected · ' : ''}${t.name}`}
                        variant={templateId === t.id ? 'primary' : 'secondary'}
                        onPress={() => {
                          setTemplateId(t.id);
                          setSlot(0);
                        }}
                      />
                    ))}
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {Object.keys(themes).map((t) => (
                      <Button
                        key={t}
                        title={`${t} theme${theme === t ? ' · selected' : ''}`}
                        variant="quiet"
                        onPress={() => setTheme(t as keyof typeof themes)}
                      />
                    ))}
                  </View>
                  <View className="flex-row gap-2">
                    <Button
                      title={`Story · 1080 × 1920${size === 'story' ? ' · selected' : ''}`}
                      variant="secondary"
                      onPress={() => setSize('story')}
                    />
                    <Button
                      title={`Post · 1080 × 1080${size === 'square' ? ' · selected' : ''}`}
                      variant="secondary"
                      onPress={() => setSize('square')}
                    />
                  </View>
                </Card>
                <Card>
                  <Heading small>2. Make it yours</Heading>
                  <Field label="Headline" value={title} maxLength={60} onChangeText={setTitle} />
                  <Field
                    label="A little note"
                    value={subtitle}
                    maxLength={90}
                    onChangeText={setSubtitle}
                  />
                  <View className="flex-row flex-wrap gap-2">
                    {template.slots.map((_, i) => (
                      <Button
                        key={i}
                        title={`Photo ${i + 1}${slot === i ? ' · editing' : ''}`}
                        variant={slot === i ? 'primary' : 'secondary'}
                        onPress={() => setSlot(i)}
                      />
                    ))}
                  </View>
                  <Body muted>
                    Select a memory below for this slot. Zoom and pan adjust the crop.
                  </Body>
                  <View className="flex-row flex-wrap gap-2">
                    {(['zoom', 'x', 'y'] as const).flatMap((f) =>
                      [-1, 1].map((d) => (
                        <Button
                          key={f + d}
                          title={
                            f === 'zoom'
                              ? d > 0
                                ? 'Zoom in'
                                : 'Zoom out'
                              : f === 'x'
                                ? d > 0
                                  ? 'Pan right'
                                  : 'Pan left'
                                : d > 0
                                  ? 'Pan down'
                                  : 'Pan up'
                          }
                          variant="quiet"
                          onPress={() => adjust(f, d * 0.15)}
                        />
                      )),
                    )}
                    <Button
                      title="Reset crop"
                      variant="quiet"
                      onPress={() =>
                        setCrops((v) => v.map((c, i) => (i === slot ? { ...center } : c)))
                      }
                    />
                  </View>
                  <View className="flex-row flex-wrap gap-3">
                    {visible.map((m) => (
                      <View key={m.id} style={{ width: 100 }}>
                        {photos.data?.[m.storage_path] ? (
                          <Image
                            source={{ uri: photos.data[m.storage_path] }}
                            style={{ width: 100, height: 90, borderRadius: 16 }}
                            accessibilityLabel={`Memory from ${m.taken_at.slice(0, 10)}`}
                          />
                        ) : null}
                        <Button
                          title={`Use ${m.taken_at.slice(0, 10)}`}
                          variant="quiet"
                          onPress={() => {
                            setSlots((v) =>
                              Array.from({ length: 6 }, (_, i) =>
                                i === slot ? m.id : (v[i] ?? null),
                              ),
                            );
                            setCrops((v) => v.map((c, i) => (i === slot ? { ...center } : c)));
                          }}
                        />
                      </View>
                    ))}
                  </View>
                  <Toggle title="Parvarish watermark" value={watermark} onChange={setWatermark} />
                </Card>
              </View>
              <View className="flex-1 gap-4">
                <Card>
                  <Heading small>A little preview</Heading>
                  {preview ? (
                    <Image
                      source={{ uri: preview }}
                      style={{
                        width: '100%',
                        aspectRatio: size === 'story' ? 1080 / 1920 : 1,
                        borderRadius: 20,
                      }}
                      accessibilityLabel="Preview of your personalised memory card"
                    />
                  ) : (
                    <Loading />
                  )}
                  {rendering ? <Body muted>Updating your card…</Body> : null}
                  <ErrorNotice
                    message={
                      error ||
                      (photos.isError ? 'Photos could not be opened. Reload to try again.' : null)
                    }
                  />
                  {notice ? (
                    <>
                      <Body>
                        This image will be visible to anyone you share it with. Check names, faces
                        and private details before continuing.
                      </Body>
                      <Button
                        title="I understand — prepare image"
                        onPress={() => {
                          void markShareNotice().catch(() => {});
                          setNoticeSeen(true);
                          setNotice(false);
                          void makeExport();
                        }}
                      />
                      <Button
                        title="Keep editing"
                        variant="quiet"
                        onPress={() => setNotice(false)}
                      />
                    </>
                  ) : (
                    <Button
                      title="Prepare full-size PNG"
                      loading={exporting}
                      disabled={rendering || !preview || input.photos.some((p) => !p)}
                      onPress={() => (noticeSeen ? void makeExport() : setNotice(true))}
                    />
                  )}
                  {input.photos.some((p) => !p) ? (
                    <Body muted>
                      Choose a photo for each slot, or select a layout with fewer slots.
                    </Body>
                  ) : null}
                  {exported ? (
                    <>
                      <Body>
                        Your {size === 'story' ? '1080 × 1920' : '1080 × 1080'} PNG is ready.
                      </Body>
                      <Button
                        title="Share image"
                        onPress={() =>
                          void shareImage(exported).catch((e) => {
                            if (e?.name !== 'AbortError')
                              setError('Sharing did not finish. You can save the PNG instead.');
                          })
                        }
                      />
                      <Button
                        title="Save PNG"
                        variant="secondary"
                        onPress={() =>
                          void shareImage(exported, true).catch(() =>
                            setError('The image could not be saved. Try again.'),
                          )
                        }
                      />
                    </>
                  ) : null}
                </Card>
              </View>
            </View>
          </>
        )}
      </Screen>
    </Guard>
  );
}
