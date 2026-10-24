import { useState } from 'react';
import { View, Text, Linking } from 'react-native';
import { z } from 'zod';
import { Card, Heading, Body, Button, Field, Eyebrow } from './ui';
import source from '../content/education.json';
const schema = z.array(
  z.object({
    id: z.string(),
    stage: z.enum(['all', 'planning', 'expecting', 'baby', 'toddler', 'preschool']),
    topic: z.string(),
    title: z.string(),
    summary: z.string(),
    source_name: z.string(),
    source_url: z
      .url()
      .refine((u) =>
        ['www.who.int', 'www.cdc.gov', 'www.pib.gov.in'].includes(new URL(u).hostname),
      ),
    verified_on: z.iso.date(),
    source_review_status: z.literal('verified'),
    clinical_review_status: z.literal('not_individually_reviewed'),
  }),
);
export const education = schema.parse(source);
export function Education() {
  const [stage, setStage] = useState('all'),
    [search, setSearch] = useState('');
  const entries = education.filter(
    (e) =>
      (stage === 'all' || e.stage === stage || e.stage === 'all') &&
      `${e.title} ${e.topic} ${e.summary}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <View className="gap-6">
      <Eyebrow>A little knowledge, clearly sourced</Eyebrow>
      <Heading>Care, with a source.</Heading>
      <Body>
        General education from WHO, CDC and India’s public health sources. Each card links to the
        original guidance.
      </Body>
      <Card tint>
        <Body>
          Source verified; not individually reviewed by a paediatrician. This library provides
          general education, not diagnosis, dosing or personalised medical advice. For symptoms or
          decisions about your family’s care, contact a qualified healthcare professional.
        </Body>
      </Card>
      <Field
        label="Search educational topics"
        value={search}
        onChangeText={setSearch}
        placeholder="Sleep, food, play…"
      />
      <View className="flex-row flex-wrap gap-2">
        {[
          ['all', 'Every chapter'],
          ['planning', 'Planning'],
          ['expecting', 'Expecting'],
          ['baby', 'First year'],
          ['toddler', '1–3 years'],
          ['preschool', '3–5 years'],
        ].map(([value, label]) => (
          <Button
            key={value}
            title={label!}
            variant={stage === value ? 'primary' : 'secondary'}
            onPress={() => setStage(value!)}
          />
        ))}
      </View>
      {!entries.length ? (
        <Card>
          <Body>No matching articles. Try another topic or choose every chapter.</Body>
        </Card>
      ) : (
        entries.map((e) => (
          <Card key={e.id}>
            <Eyebrow>{e.topic}</Eyebrow>
            <Heading small>{e.title}</Heading>
            <Body>{e.summary}</Body>
            <Button
              title={`Read original: ${e.source_name}`}
              variant="secondary"
              onPress={() => void Linking.openURL(e.source_url)}
            />
            <Text className="text-sm text-muted">
              Source verified {e.verified_on} · Not individually reviewed by a paediatrician
            </Text>
          </Card>
        ))
      )}
    </View>
  );
}
