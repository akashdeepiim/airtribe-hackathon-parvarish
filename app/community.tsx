import { useEffect, useState } from 'react';
import { View, Linking } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { Guard } from '../src/components/Guard';
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
} from '../src/components/ui';
import { db } from '../src/lib/supabase';
import { useAuth } from '../src/lib/auth';
import { friendlyError } from '../src/lib/errors';
const suggestion = z.object({
  name: z.string().trim().min(2).max(150),
  city: z.string().trim().min(2).max(100),
  url: z
    .url()
    .max(1000)
    .refine(
      (u) => new URL(u).protocol === 'https:' && !new URL(u).username && !new URL(u).password,
    ),
});
const entry = z.object({
  id: z.uuid(),
  name: z.string(),
  city: z.string().nullable(),
  platform: z.string(),
  url: z.url(),
  description: z.string(),
  age_focus: z.string().nullable(),
  last_verified_at: z.string().nullable(),
});
export default function Community() {
  const { session } = useAuth();
  const [name, setName] = useState(''),
    [city, setCity] = useState('Bangalore'),
    [url, setUrl] = useState(''),
    [sent, setSent] = useState(false);
  const q = useQuery({
    queryKey: ['community', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const p = await db().from('users').select('city').eq('id', session!.user.id).single();
      if (p.error) throw p.error;
      const c = z.object({ city: z.string() }).parse(p.data).city;
      const rows = await db()
        .from('community_directory')
        .select('*')
        .eq('status', 'published')
        .order('name');
      if (rows.error) throw rows.error;
      return {
        city: c,
        items: z
          .array(entry)
          .parse(rows.data)
          .filter(
            (r) =>
              !r.city ||
              r.city.toLowerCase() === c.toLowerCase() ||
              (['bangalore', 'bengaluru'].includes(c.toLowerCase()) && r.city === 'Bangalore'),
          ),
      };
    },
  });
  useEffect(() => {
    if (q.data) setCity(q.data.city);
  }, [q.data?.city]);
  const mine = useQuery({
    queryKey: ['community-suggestions', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const r = await db()
        .from('community_suggestions')
        .select('id,name,status')
        .eq('user_id', session!.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (r.error) throw r.error;
      return z
        .array(z.object({ id: z.uuid(), name: z.string(), status: z.string() }))
        .parse(r.data);
    },
  });
  const saveCity = useMutation({
    mutationFn: async () => {
      const clean = z.string().trim().min(2).max(100).parse(city);
      const r = await db().from('users').update({ city: clean }).eq('id', session!.user.id);
      if (r.error) throw r.error;
    },
    onSuccess: () => q.refetch(),
  });
  const send = useMutation({
    mutationFn: async () => {
      const data = suggestion.parse({ name, city, url });
      const r = await db()
        .from('community_suggestions')
        .insert({ ...data, user_id: session!.user.id, status: 'pending' });
      if (r.error) throw r.error;
    },
    onSuccess: async () => {
      setSent(true);
      setName('');
      setUrl('');
      await mine.refetch();
    },
  });
  return (
    <Guard>
      <Screen back wide>
        <Eyebrow>Find your people</Eyebrow>
        <Heading>A little village.</Heading>
        <Body>
          Meet other parents, nearby or online. Listings link to independent communities; their
          posts and events are not reviewed by Parvarish.
        </Body>
        <Card>
          <Field label="Your profile city" value={city} onChangeText={setCity} />
          <Button
            title="Use this city"
            loading={saveCity.isPending}
            onPress={() => saveCity.mutate()}
          />
          <Body muted>Uses your profile city, never GPS.</Body>
        </Card>
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <Card>
            <ErrorNotice message="Communities could not load." />
            <Button title="Retry communities" onPress={() => void q.refetch()} />
          </Card>
        ) : (
          <>
            <Heading small>For {q.data?.city} & everywhere</Heading>
            <View className="gap-5">
              {q.data?.items.map((c) => (
                <Card key={c.id}>
                  <Eyebrow>
                    {c.city ?? 'Online / global'} · {c.platform}
                  </Eyebrow>
                  <Heading small>{c.name}</Heading>
                  <Body>{c.description}</Body>
                  <Body muted>
                    {c.age_focus} · Public listing checked {c.last_verified_at?.slice(0, 10)}
                  </Body>
                  <Button
                    title={`Visit ${c.name}`}
                    variant="secondary"
                    onPress={() => void Linking.openURL(c.url)}
                  />
                </Card>
              ))}
            </View>
          </>
        )}
        <Card>
          <Heading small>Know a welcoming community?</Heading>
          <Body>
            Suggest its public page. It stays private in our moderation queue until reviewed. Avoid
            private invitation links or personal contact details.
          </Body>
          <Field label="Community name" value={name} onChangeText={setName} maxLength={150} />
          <Field
            label="Public HTTPS link"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
          />
          <Button
            title="Suggest community"
            loading={send.isPending}
            onPress={() => send.mutate()}
          />
          {sent ? <Body>Thank you. Your suggestion is waiting for review.</Body> : null}
          {mine.data?.map((s) => (
            <Body key={s.id}>
              {s.name} · {s.status}
            </Body>
          ))}
        </Card>
        <ErrorNotice
          message={
            send.isError || saveCity.isError ? friendlyError(send.error ?? saveCity.error) : null
          }
        />
      </Screen>
    </Guard>
  );
}
