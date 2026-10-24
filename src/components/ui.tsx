import { type PropsWithChildren, type ComponentProps } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { tokens } from '../design/tokens';
import { useAuth } from '../lib/auth';
import { AppFrame } from './AppFrame';
type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({
  name,
  size = 22,
  color = tokens.colors.forest,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
export function Heading({ children, small = false }: PropsWithChildren<{ small?: boolean }>) {
  return (
    <Text
      accessibilityRole="header"
      className={`${small ? 'text-3xl' : 'text-4xl md:text-5xl'} text-ink`}
      style={{
        fontFamily:
          Platform.OS === 'web' ? 'Fraunces' : Platform.OS === 'android' ? 'serif' : 'Georgia',
        lineHeight: small ? 38 : 54,
      }}
    >
      {children}
    </Text>
  );
}
export function Body({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) {
  return (
    <Text className={`text-base leading-7 ${muted ? 'text-muted' : 'text-ink'}`}>{children}</Text>
  );
}
export function Eyebrow({ children }: PropsWithChildren) {
  return <Text className="text-xs font-bold uppercase tracking-[2px] text-clay">{children}</Text>;
}
export function Card({ children, tint = false }: PropsWithChildren<{ tint?: boolean }>) {
  return (
    <View
      className={`rounded-card border border-line p-6 md:p-8 gap-5 ${tint ? 'bg-sage' : 'bg-paper'}`}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  testID,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  testID?: string;
}) {
  const light = variant === 'primary' || variant === 'danger';
  // Use browser button semantics on web, including keyboard activation and
  // native disabled behavior. Native screens retain RN's Pressable responder.
  if (Platform.OS === 'web') {
    return (
      <button
        type="button"
        data-testid={testID}
        aria-label={title}
        aria-busy={loading}
        disabled={disabled || loading}
        onClick={onPress}
        className={`p-control p-control-${variant}`}
      >
        {loading ? (
          <ActivityIndicator color={light ? 'white' : tokens.colors.forest} />
        ) : icon ? (
          <Icon name={icon} color={light ? 'white' : tokens.colors.forest} size={20} />
        ) : null}
        <span>{title}</span>
      </button>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      className={`min-h-tap rounded-control px-5 py-3 flex-row gap-3 items-center justify-center ${variant === 'primary' ? 'bg-forest' : variant === 'danger' ? 'bg-error' : variant === 'secondary' ? 'bg-sage border border-line' : 'bg-transparent'} ${disabled || loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={light ? 'white' : tokens.colors.forest} />
      ) : icon ? (
        <Icon name={icon} color={light ? 'white' : tokens.colors.forest} size={20} />
      ) : null}
      <Text className={`text-base font-semibold ${light ? 'text-white' : 'text-forest'}`}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  hint,
  ...props
}: ComponentProps<typeof TextInput> & { label: string; hint?: string }) {
  return (
    <View className="gap-2">
      <Text className="font-semibold text-ink text-sm">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#7A837B"
        {...props}
        className="min-h-tap border border-line rounded-control bg-cream px-4 py-3 text-base text-ink"
      />
      {hint ? <Text className="text-sm leading-5 text-muted">{hint}</Text> : null}
    </View>
  );
}
export function SensitiveNotice({ access = false }: { access?: boolean }) {
  return (
    <View className="rounded-control bg-peach px-4 py-3 flex-row gap-3 items-start">
      <Icon name="shield-checkmark-outline" size={20} color={tokens.colors.clay} />
      <Text className="text-sm leading-5 text-ink flex-1">
        {access
          ? 'Sensitive access settings. These choices control what your family can see and change.'
          : 'Private child information. Share it only with people you trust, using your family access settings.'}
      </Text>
    </View>
  );
}
export function ErrorNotice({ message }: { message: string | null }) {
  return message ? (
    <View accessibilityRole="alert" className="rounded-control bg-peach p-4">
      <Text className="text-error leading-6">{message}</Text>
    </View>
  ) : null;
}
export function Toggle({
  title,
  detail,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  detail?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="min-h-tap flex-row items-center gap-4 py-3">
      <View className="flex-1 gap-1">
        <Text className="text-base font-medium text-ink">{title}</Text>
        {detail ? <Text className="text-sm leading-5 text-muted">{detail}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityState={{ checked: value, disabled }}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: '#C4CDC4', true: tokens.colors.forest }}
        thumbColor="white"
        style={{ minHeight: 48, minWidth: 52 }}
      />
    </View>
  );
}
export function Loading() {
  return (
    <View className="p-12 items-center gap-4">
      <ActivityIndicator color={tokens.colors.forest} />
      <Body muted>Opening your family space…</Body>
    </View>
  );
}
export function Brand() {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Parvarish home"
      onPress={() => router.push('/')}
      className="min-h-tap flex-row items-center gap-3"
    >
      <View className="w-10 h-10 rounded-2xl bg-forest items-center justify-center">
        <Icon name="leaf-outline" color="white" size={23} />
      </View>
      <Text className="text-2xl text-ink font-semibold tracking-tight">
        parvarish<Text className="text-clay">.</Text>
      </Text>
    </Pressable>
  );
}
export function Screen({
  children,
  back = false,
  wide = false,
}: PropsWithChildren<{ back?: boolean; wide?: boolean }>) {
  const { session, signOut } = useAuth();
  if (Platform.OS === 'web')
    return (
      <AppFrame back={back} wide={wide}>
        {children}
      </AppFrame>
    );
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-6xl self-center px-5 md:px-10 pt-4 pb-8">
          <View className="flex-row items-center justify-between pb-8 md:pb-12">
            <Brand />
            {session ? (
              <Button title="Sign out" variant="quiet" onPress={() => void signOut()} />
            ) : (
              <View className="flex-row items-center gap-2">
                <Icon name="lock-closed-outline" size={14} />
                <Text className="text-xs text-muted">A private little world</Text>
              </View>
            )}
          </View>
          {back ? (
            <View className="self-start mb-4">
              <Button
                title="Back"
                icon="arrow-back"
                variant="quiet"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              />
            </View>
          ) : null}
          <View className={`w-full self-center gap-6 ${wide ? '' : 'max-w-2xl'}`}>{children}</View>
          <View className="mt-14 pt-6 border-t border-line flex-row flex-wrap justify-between gap-3">
            <Text className="text-xs text-muted">
              Made for parents. Room for every little first.
            </Text>
            <Text className="text-xs text-muted">Bangalore · With love, as you grow.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
