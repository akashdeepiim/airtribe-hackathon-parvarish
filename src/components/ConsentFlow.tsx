import { useState } from 'react';
import { View, Text } from 'react-native';
import {
  purposes,
  notices,
  choicesSchema,
  type ConsentChoices,
  type Purpose,
} from '../domain/consent';
import { Body, Button, Card, Eyebrow, Heading, SensitiveNotice, Toggle } from './ui';
export function ConsentFlow({
  family = false,
  busy = false,
  onComplete,
}: {
  family?: boolean;
  busy?: boolean;
  onComplete: (choices: ConsentChoices) => void;
}) {
  const [step, setStep] = useState(0);
  const [adult, setAdult] = useState(false);
  const [choices, setChoices] = useState<Partial<Record<Purpose, boolean>>>({});
  const purpose = purposes[step - 1];
  const progress = Math.min(step, 5);
  function next(granted: boolean) {
    if (!purpose || busy) return;
    const updated = { ...choices, [purpose]: granted };
    setChoices(updated);
    if (step === 5) onComplete(choicesSchema.parse(updated));
    else setStep(step + 1);
  }
  return (
    <>
      <View className="flex-row gap-2">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <View
            key={n}
            className={`h-1.5 flex-1 rounded-full ${n <= progress ? 'bg-forest' : 'bg-line'}`}
          />
        ))}
      </View>
      <Text className="text-sm text-muted">
        {step === 0 ? 'Before we begin' : `Your choices · ${step} of 5`}
      </Text>
      {purpose ? (
        <Card>
          <Eyebrow>
            {notices[purpose].eyebrow} · {purpose === 'memories' ? 'Required' : 'Optional'}
          </Eyebrow>
          <Heading small>{notices[purpose].title}</Heading>
          <Body>{notices[purpose].copy}</Body>
          <Body muted>{notices[purpose].detail}</Body>
          {purpose === 'health' ? <SensitiveNotice /> : null}
          <Button
            title={purpose === 'memories' ? 'Agree and continue' : 'Yes, enable this'}
            loading={busy}
            onPress={() => next(true)}
          />
          {purpose !== 'memories' ? (
            <Button
              title="Not now"
              disabled={busy}
              variant="secondary"
              onPress={() => next(false)}
            />
          ) : null}
          <Button
            title="Previous"
            disabled={busy}
            variant="quiet"
            onPress={() => setStep(step - 1)}
          />
        </Card>
      ) : (
        <Card>
          <Eyebrow>Your family, your choices</Eyebrow>
          <Heading>A little care,{'\n'}before we begin.</Heading>
          <Body>
            We’ll explain each way Parvarish uses information, one at a time. You choose what feels
            right for your family.
          </Body>
          <SensitiveNotice />
          <Toggle
            title={
              family
                ? 'I am an adult joining this family space.'
                : 'I am an adult and this child’s parent or lawful guardian.'
            }
            value={adult}
            onChange={setAdult}
          />
          <Button title="Review my choices" disabled={!adult} onPress={() => setStep(1)} />
          <Text className="text-sm text-muted">You can review or withdraw your choices later.</Text>
        </Card>
      )}
    </>
  );
}
