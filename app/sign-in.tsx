import { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { db, isConfigured } from '../src/lib/supabase';
import { emailSchema, otpSchema } from '../src/domain/schemas';
import { friendlyError } from '../src/lib/errors';
import { WelcomeArt } from '../src/components/AppFrame';
import {
  Screen,
  Heading,
  Body,
  Button,
  Card,
  Eyebrow,
  Field,
  ErrorNotice,
  Icon,
  Loading,
} from '../src/components/ui';
export default function SignIn() {
  const { session, loading, pendingInvite } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown > 0]);
  async function send() {
    setError(null);
    const input = emailSchema.safeParse(email.trim());
    if (!input.success) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const { error: failure } = await db().auth.signInWithOtp({
        email: input.data,
        options: { shouldCreateUser: true },
      });
      if (failure) throw failure;
      setEmail(input.data);
      setSent(true);
      setCooldown(60);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    setError(null);
    const input = otpSchema.safeParse(code);
    if (!input.success) {
      setError('Enter the six-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      const { error: failure } = await db().auth.verifyOtp({
        email: emailSchema.parse(email),
        token: input.data,
        type: 'email',
      });
      if (failure) throw failure;
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (session) return <Redirect href={pendingInvite ? '/invite' : '/family'} />;
  return (
    <Screen wide>
      <View className="flex-col md:flex-row gap-10 md:gap-16 items-stretch">
        <View className="flex-1 gap-7 py-4 md:py-8">
          <Eyebrow>For the little things that become everything</Eyebrow>
          <Heading>They grow in moments.{'\n'}Keep them close.</Heading>
          <Body muted>
            A private place for your child’s memories, their firsts, and the people cheering them
            on.
          </Body>
          {Platform.OS === 'web' ? (
            <WelcomeArt />
          ) : (
            <View className="bg-sage rounded-card p-7 gap-5 overflow-hidden">
              <View className="flex-row gap-4 items-start">
                <View className="bg-paper rounded-2xl p-4">
                  <Icon name="flower-outline" size={46} />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-ink text-xl font-semibold">
                    Small moments. A whole childhood.
                  </Text>
                  <Text className="text-muted leading-6">
                    Made for the everyday magic of ages 0–5.
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-3">
                {['Memories', 'Milestones', 'Together'].map((label, i) => (
                  <View
                    key={label}
                    className="bg-paper rounded-full px-4 py-2 flex-row gap-2 items-center"
                  >
                    <Icon
                      name={
                        i === 0 ? 'images-outline' : i === 1 ? 'sparkles-outline' : 'people-outline'
                      }
                      size={16}
                    />
                    <Text className="text-forest text-sm">{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          <View className="flex-row gap-3 items-center">
            <Icon name="heart-outline" size={18} />
            <Text className="text-sm text-muted">Your family’s story, shared on your terms.</Text>
          </View>
        </View>
        <View className="flex-1 md:max-w-md justify-center">
          <Card>
            <Eyebrow>{pendingInvite ? 'You’re invited' : 'Welcome to Parvarish'}</Eyebrow>
            <Heading small>
              {sent ? 'A little code, then you’re in.' : 'Your family’s space starts here.'}
            </Heading>
            <Body muted>
              {sent
                ? 'Enter the six-digit code we sent to your email. It’s valid for 10 minutes.'
                : 'Sign in or create an account with your email. No password to remember.'}
            </Body>
            {!isConfigured ? (
              <ErrorNotice message="This version isn’t connected yet. Please contact the person who shared it with you." />
            ) : null}
            {!sent ? (
              <>
                <Field
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  onSubmitEditing={() => void send()}
                />
                <Button
                  title="Send me a code"
                  icon="arrow-forward"
                  disabled={!isConfigured}
                  loading={busy}
                  onPress={() => void send()}
                />
              </>
            ) : (
              <>
                <Text className="text-sm text-ink">Sent to {email}</Text>
                <Field
                  label="Email code"
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  maxLength={6}
                  onSubmitEditing={() => void verify()}
                />
                <Button title="Verify and continue" loading={busy} onPress={() => void verify()} />
                <Button
                  title={cooldown ? `Send another code in ${cooldown}s` : 'Send another code'}
                  disabled={cooldown > 0 || busy}
                  variant="quiet"
                  onPress={() => void send()}
                />
                <Button
                  title="Use a different email"
                  variant="quiet"
                  disabled={busy}
                  onPress={() => {
                    setSent(false);
                    setCode('');
                    setError(null);
                  }}
                />
              </>
            )}
            <ErrorNotice message={error} />
            <View className="border-t border-line pt-5 flex-row gap-3">
              <Icon name="lock-closed-outline" size={17} />
              <Text className="text-xs leading-5 text-muted flex-1">
                Your photos stay private. You decide who joins, what they can access, and how your
                child’s information is used.
              </Text>
            </View>
          </Card>
        </View>
      </View>
    </Screen>
  );
}
