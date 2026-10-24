import { useState } from 'react';
import { View, Text } from 'react-native';
import { profileSchema, parseInterests, type Profile } from '../domain/schemas';
import { Field, Button, ErrorNotice } from './ui';
export function ProfileForm({
  initial,
  onSave,
  pending,
  label = 'Create private profile',
}: {
  initial?: Profile;
  onSave: (profile: Profile) => void;
  pending: boolean;
  label?: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [dob, setDob] = useState(initial?.dob ?? '');
  const [city, setCity] = useState(initial?.city ?? 'Bangalore');
  const [interests, setInterests] = useState(initial?.interests.join(', ') ?? '');
  const [sex, setSex] = useState<Profile['sex']>(initial?.sex ?? null);
  const [error, setError] = useState<string | null>(null);
  function submit() {
    const result = profileSchema.safeParse({
      name,
      dob,
      city,
      sex,
      interests: parseInterests(interests),
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Check your details.');
      return;
    }
    setError(null);
    onSave(result.data);
  }
  return (
    <View className="gap-5">
      <Field
        label="Child’s name"
        value={name}
        onChangeText={setName}
        placeholder="Their first name"
        maxLength={80}
        autoComplete="off"
      />
      <Field
        label="Date of birth"
        value={dob}
        onChangeText={setDob}
        placeholder="YYYY-MM-DD"
        hint="For example, 2025-06-15. Aged 0 to 5 at sign-up."
        maxLength={10}
        keyboardType="numbers-and-punctuation"
      />
      <Field label="City" value={city} onChangeText={setCity} maxLength={100} />
      <Field
        label="A few things they love (optional)"
        value={interests}
        onChangeText={setInterests}
        placeholder="Music, splashing, picture books"
        hint="Separate interests with a comma."
        maxLength={1200}
      />
      <View className="gap-2">
        <Text className="font-semibold text-ink text-sm">Sex (optional)</Text>
        <Text className="text-sm leading-5 text-muted">
          Only for future growth charts. It will never determine activity suggestions.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {([null, 'female', 'male', 'intersex'] as const).map((value) => (
            <Button
              key={value ?? 'none'}
              title={value === null ? 'Not specified' : value[0]!.toUpperCase() + value.slice(1)}
              variant={sex === value ? 'primary' : 'secondary'}
              onPress={() => setSex(value)}
            />
          ))}
        </View>
      </View>
      <ErrorNotice message={error} />
      <Button title={label} loading={pending} onPress={submit} />
    </View>
  );
}
