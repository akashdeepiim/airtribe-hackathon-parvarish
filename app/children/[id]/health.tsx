import { useState, useEffect } from 'react';
import { useEditorFocus } from '../../../src/lib/focus';
import { View, Text, Image } from 'react-native';
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
  SensitiveNotice,
  ErrorNotice,
  Loading,
} from '../../../src/components/ui';
import { VaccinationPlan } from '../../../src/components/VaccinationPlan';
import { GrowthChart } from '../../../src/components/GrowthChart';
import { useChild, useAccess } from '../../../src/lib/data';
import { useHealth, useGrowth, openCard, uploadCard, removeHealth } from '../../../src/lib/health';
import { useAuth } from '../../../src/lib/auth';
import { db } from '../../../src/lib/supabase';
import { queryClient } from '../../../src/lib/query';
import { friendlyError } from '../../../src/lib/errors';
import {
  allergyInput,
  vaccinationInput,
  growthInput,
  type Allergy,
  type Vaccination,
  type Growth,
} from '../../../src/domain/health';
type Entity = 'allergies' | 'vaccination_logs' | 'growth_measurements';
type Edit = { entity: Entity; record?: Allergy | Vaccination | Growth };
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export default function Health() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const child = useChild(id),
    access = useAccess(id);
  const canRead = !!access.data?.purposes.health && !!access.data?.capabilities['health.read'];
  const canWrite = canRead && !!access.data?.capabilities['health.write'];
  const health = useHealth(id, canRead),
    growth = useGrowth(id, canRead);
  const [edit, setEdit] = useState<Edit | null>(null),
    [removing, setRemoving] = useState<{ entity: Entity; id: string } | null>(null),
    [card, setCard] = useState<{ url: string; expiresAt: number } | null>(null);
  useEffect(() => {
    if (!card) return;
    const t = setTimeout(() => setCard(null), Math.max(0, card.expiresAt - Date.now()));
    return () => clearTimeout(t);
  }, [card]);
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['health', id] }),
      queryClient.invalidateQueries({ queryKey: ['growth', id] }),
    ]);
  };
  const remove = useMutation({
    mutationFn: async () => {
      if (removing) await removeHealth(id, removing.entity, removing.id);
    },
    onSuccess: async () => {
      setRemoving(null);
      setCard(null);
      await refresh();
    },
  });
  const photo = useMutation({
    mutationFn: async (rid: string) => setCard(await openCard(id, rid)),
  });
  const attach = useMutation({
    mutationFn: async (rid: string) => uploadCard(id, rid, session!.user.id),
    onSuccess: refresh,
  });
  return (
    <Guard>
      <Screen back wide>
        <Eyebrow>A few important details, together</Eyebrow>
        <Heading>Health & growing.</Heading>
        <Button
          title="Explore sourced health education"
          variant="secondary"
          onPress={() => router.push('/guidance')}
        />
        <SensitiveNotice />
        <Body muted>
          Health records are sensitive. Every view and change is recorded. Parents can edit; other
          family members need an explicit read grant from the owner.
        </Body>
        {access.isPending || child.isPending ? (
          <Loading />
        ) : access.isError || !child.data ? (
          <Card>
            <Body>This family space is unavailable.</Body>
          </Card>
        ) : !canRead ? (
          <Card>
            <Heading small>Health records are private.</Heading>
            <Body>Health consent and permission are needed to open this space.</Body>
            <Button
              title="Review privacy choices"
              onPress={() => router.push(`/children/${id}/privacy`)}
            />
          </Card>
        ) : (
          <>
            <ErrorNotice
              message={
                health.isError || growth.isError ? 'Records could not be opened. Try again.' : null
              }
            />
            {health.isError || growth.isError ? (
              <Button title="Try loading again" onPress={() => void refresh()} />
            ) : null}
            <ErrorNotice
              message={
                photo.isError || attach.isError || remove.isError
                  ? friendlyError(photo.error ?? attach.error ?? remove.error)
                  : null
              }
            />
            {edit ? (
              <HealthForm
                key={`${edit.entity}-${edit.record?.id ?? 'new'}`}
                edit={edit}
                childId={id}
                dob={child.data.dob}
                onDone={async () => {
                  setEdit(null);
                  await refresh();
                }}
                onCancel={() => setEdit(null)}
              />
            ) : null}
            {removing ? (
              <Card>
                <Heading small>Remove this record?</Heading>
                <Body>
                  This removes the entry and any attached card photo from your family space. This
                  cannot be undone.
                </Body>
                <Button
                  title="Confirm removal"
                  variant="danger"
                  loading={remove.isPending}
                  onPress={() => remove.mutate()}
                />
                <Button title="Keep record" variant="quiet" onPress={() => setRemoving(null)} />
              </Card>
            ) : null}
            {card ? (
              <Card>
                <Heading small>Vaccination card</Heading>
                <Image
                  source={{ uri: card.url }}
                  style={{ width: '100%', height: 400 }}
                  resizeMode="contain"
                  accessibilityLabel="Private vaccination card"
                />
                <Button title="Close card" onPress={() => setCard(null)} variant="quiet" />
              </Card>
            ) : null}
            <VaccinationPlan
              childId={id}
              dob={child.data.dob}
              canWrite={canWrite}
              logs={health.data?.vaccinations ?? []}
            />
            <View className="flex-col md:flex-row gap-5">
              <View className="flex-1">
                <Card>
                  <Heading small>Allergies</Heading>
                  <Body muted>
                    Record what your clinician has told you. This is also used as a safety filter
                    when activity personalisation is enabled.
                  </Body>
                  {canWrite ? (
                    <Button
                      title="Add allergy"
                      icon="add"
                      onPress={() => setEdit({ entity: 'allergies' })}
                    />
                  ) : null}
                  {health.isPending ? (
                    <Loading />
                  ) : !health.data?.allergies.length ? (
                    <Body>No allergies recorded.</Body>
                  ) : (
                    health.data.allergies.map((a) => (
                      <View key={a.id} className="gap-2 border-t border-line pt-4">
                        <Text className="text-xl font-semibold text-ink">{a.allergen}</Text>
                        <Body muted>
                          {a.type} · {a.severity}
                        </Body>
                        {a.notes ? <Body>{a.notes}</Body> : null}
                        {canWrite ? (
                          <View className="flex-row gap-2 flex-wrap">
                            <Button
                              title={`Edit ${a.allergen}`}
                              variant="quiet"
                              onPress={() => setEdit({ entity: 'allergies', record: a })}
                            />
                            <Button
                              title={`Remove ${a.allergen}`}
                              variant="quiet"
                              onPress={() => setRemoving({ entity: 'allergies', id: a.id })}
                            />
                          </View>
                        ) : null}
                      </View>
                    ))
                  )}
                </Card>
              </View>
              <View className="flex-1">
                <Card>
                  <Heading small>Vaccinations</Heading>
                  <Body muted>
                    A record of vaccines already given. Bring the card to appointments to confirm
                    what comes next.
                  </Body>
                  {canWrite ? (
                    <Button
                      title="Add vaccination"
                      icon="add"
                      onPress={() => setEdit({ entity: 'vaccination_logs' })}
                    />
                  ) : null}
                  {health.isPending ? (
                    <Loading />
                  ) : !health.data?.vaccinations.length ? (
                    <Body>No vaccinations recorded.</Body>
                  ) : (
                    health.data.vaccinations
                      .toSorted((a, b) => b.given_on.localeCompare(a.given_on))
                      .map((v) => (
                        <View key={v.id} className="gap-2 border-t border-line pt-4">
                          <Text className="text-xl font-semibold text-ink">{v.vaccine_name}</Text>
                          <Body>{v.given_on}</Body>
                          {v.notes ? <Body muted>{v.notes}</Body> : null}
                          <View className="flex-row gap-2 flex-wrap">
                            {v.card_photo_path ? (
                              <Button
                                title={`View card for ${v.vaccine_name}`}
                                loading={photo.isPending}
                                variant="secondary"
                                onPress={() => photo.mutate(v.id)}
                              />
                            ) : null}
                            {canWrite ? (
                              <>
                                <Button
                                  title={`Edit ${v.vaccine_name}`}
                                  variant="quiet"
                                  onPress={() => setEdit({ entity: 'vaccination_logs', record: v })}
                                />
                                <Button
                                  title={`${v.card_photo_path ? 'Replace' : 'Add'} card for ${v.vaccine_name}`}
                                  loading={attach.isPending}
                                  variant="quiet"
                                  onPress={() => attach.mutate(v.id)}
                                />
                                <Button
                                  title={`Remove ${v.vaccine_name}`}
                                  variant="quiet"
                                  onPress={() =>
                                    setRemoving({ entity: 'vaccination_logs', id: v.id })
                                  }
                                />
                              </>
                            ) : null}
                          </View>
                        </View>
                      ))
                  )}
                </Card>
              </View>
            </View>
            <Card>
              <Heading small>Growing, in their own way.</Heading>
              <Body muted>
                Keep measurements from appointments or your own records. Values stay private with
                your health records.
              </Body>
              {canWrite ? (
                <Button
                  title="Add measurement"
                  icon="add"
                  onPress={() => setEdit({ entity: 'growth_measurements' })}
                />
              ) : null}
              {growth.isPending ? (
                <Loading />
              ) : (
                <>
                  <GrowthChart
                    records={growth.data ?? []}
                    dob={child.data.dob}
                    sex={child.data.sex}
                  />
                  {!growth.data?.length ? (
                    <Body>No measurements recorded yet.</Body>
                  ) : (
                    growth.data.map((g) => (
                      <View key={g.id} className="gap-2 border-t border-line pt-4">
                        <Text className="font-semibold text-ink">{g.measured_on}</Text>
                        <Body>
                          {[
                            g.weight_kg !== null ? `${g.weight_kg} kg` : null,
                            g.height_cm !== null ? `${g.height_cm} cm ${g.height_method}` : null,
                            g.head_cm !== null ? `${g.head_cm} cm head circumference` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Body>
                        {g.notes ? <Body muted>{g.notes}</Body> : null}
                        {canWrite ? (
                          <View className="flex-row flex-wrap gap-2">
                            <Button
                              title={`Edit measurement ${g.measured_on}`}
                              variant="quiet"
                              onPress={() => setEdit({ entity: 'growth_measurements', record: g })}
                            />
                            <Button
                              title={`Remove measurement ${g.measured_on}`}
                              variant="quiet"
                              onPress={() =>
                                setRemoving({ entity: 'growth_measurements', id: g.id })
                              }
                            />
                          </View>
                        ) : null}
                      </View>
                    ))
                  )}
                </>
              )}
            </Card>
          </>
        )}
      </Screen>
    </Guard>
  );
}
function HealthForm({
  edit,
  childId,
  dob,
  onDone,
  onCancel,
}: {
  edit: Edit;
  childId: string;
  dob: string;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  useEditorFocus('health-editor', edit.entity + (edit.record?.id ?? 'new'));
  const r = edit.record;
  const a = r && 'allergen' in r ? r : null,
    v = r && 'vaccine_name' in r ? r : null,
    g = r && 'weight_kg' in r ? r : null;
  const [name, setName] = useState(a?.allergen ?? v?.vaccine_name ?? ''),
    [date, setDate] = useState(v?.given_on ?? g?.measured_on ?? today()),
    [notes, setNotes] = useState(r?.notes ?? ''),
    [type, setType] = useState<'food' | 'medicine' | 'other'>(a?.type ?? 'food'),
    [severity, setSeverity] = useState(a?.severity ?? 'Not specified');
  const [weight, setWeight] = useState(g?.weight_kg?.toString() ?? ''),
    [height, setHeight] = useState(g?.height_cm?.toString() ?? ''),
    [head, setHead] = useState(g?.head_cm?.toString() ?? ''),
    [method, setMethod] = useState<'length' | 'height'>(g?.height_method ?? 'length');
  const save = useMutation({
    mutationFn: async () => {
      if (edit.entity === 'growth_measurements') {
        const number = (s: string) => (s.trim() === '' ? null : Number(s));
        const payload = growthInput.parse({
          measured_on: date,
          weight_kg: number(weight),
          height_cm: number(height),
          head_cm: number(head),
          height_method: method,
          notes,
        });
        if (date < dob) throw new Error('Check the measurement date.');
        const res = await db().rpc('write_growth', {
          cid: childId,
          record_id: r?.id ?? (null as unknown as string),
          payload,
        });
        if (res.error) throw res.error;
      } else {
        const payload =
          edit.entity === 'allergies'
            ? allergyInput.parse({ type, allergen: name, severity, notes })
            : vaccinationInput.parse({ vaccine_name: name, given_on: date, notes });
        if (edit.entity === 'vaccination_logs' && date < dob)
          throw new Error('Check the vaccination date.');
        const res = await db().rpc('write_health', {
          cid: childId,
          entity: edit.entity,
          record_id: r?.id ?? (null as unknown as string),
          payload,
        });
        if (res.error) throw res.error;
      }
    },
    onSuccess: onDone,
  });
  return (
    <Card tint anchor="health-editor">
      <Heading small>
        {r ? 'Edit' : 'Add'}{' '}
        {edit.entity === 'allergies'
          ? 'allergy'
          : edit.entity === 'vaccination_logs'
            ? 'vaccination'
            : 'measurement'}
      </Heading>
      {edit.entity !== 'growth_measurements' ? (
        <Field
          label={edit.entity === 'allergies' ? 'Allergen' : 'Vaccine name'}
          value={name}
          onChangeText={setName}
        />
      ) : null}
      {edit.entity === 'allergies' ? (
        <>
          <Body>Type</Body>
          <View className="flex-row flex-wrap gap-2">
            {(['food', 'medicine', 'other'] as const).map((t) => (
              <Button
                key={t}
                title={t}
                variant={type === t ? 'primary' : 'secondary'}
                onPress={() => setType(t)}
              />
            ))}
          </View>
          <Body>Recorded severity</Body>
          <View className="flex-row flex-wrap gap-2">
            {['Not specified', 'Mild', 'Moderate', 'Severe'].map((s) => (
              <Button
                key={s}
                title={s}
                variant={severity === s ? 'primary' : 'secondary'}
                onPress={() => setSeverity(s)}
              />
            ))}
          </View>
        </>
      ) : (
        <Field
          label={edit.entity === 'growth_measurements' ? 'Measurement date' : 'Given on'}
          hint="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
        />
      )}
      {edit.entity === 'growth_measurements' ? (
        <>
          <Field
            label="Weight (kg)"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <Field
            label="Length or height (cm)"
            keyboardType="decimal-pad"
            value={height}
            onChangeText={setHeight}
          />
          <View className="flex-row flex-wrap gap-2">
            <Button
              title="Length — lying down"
              variant={method === 'length' ? 'primary' : 'secondary'}
              onPress={() => setMethod('length')}
            />
            <Button
              title="Height — standing"
              variant={method === 'height' ? 'primary' : 'secondary'}
              onPress={() => setMethod('height')}
            />
          </View>
          <Field
            label="Head circumference (cm)"
            keyboardType="decimal-pad"
            value={head}
            onChangeText={setHead}
          />
        </>
      ) : null}
      <Field label="Notes (optional)" multiline value={notes} onChangeText={setNotes} />
      <ErrorNotice
        message={save.isError ? 'Check the fields, units and date, then try saving again.' : null}
      />
      <Button title="Save health record" loading={save.isPending} onPress={() => save.mutate()} />
      <Button title="Cancel editing" variant="quiet" onPress={onCancel} />
    </Card>
  );
}
