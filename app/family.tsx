import { View, Text } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useChildren } from '../src/lib/data';
import { friendlyError } from '../src/lib/errors';
import { ageMonths } from '../src/domain/memories';
import { DataManagement } from '../src/components/DataManagement';
import {
  Screen,
  Heading,
  Body,
  Button,
  Card,
  Icon,
  Loading,
  ErrorNotice,
  Disclosure,
} from '../src/components/ui';
export default function Home() {
  const { session, loading, pendingInvite } = useAuth();
  const children = useChildren();
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!session) return <Redirect href="/sign-in" />;
  if (pendingInvite) return <Redirect href="/invite" />;
  return (
    <Screen wide>
      <View className="flex-row flex-wrap items-center justify-between gap-4">
        <View className="flex-1 min-w-[220px] gap-2">
          <Heading>Your family</Heading>
          <Body muted>A private home for everyday moments and little firsts.</Body>
        </View>
        {!!children.data?.length && (
          <Button
            title="Add a child"
            icon="add"
            variant="secondary"
            onPress={() => router.push('/children/new')}
          />
        )}
      </View>
      {children.isPending ? (
        <Loading />
      ) : children.isError ? (
        <Card>
          <ErrorNotice message={friendlyError(children.error)} />
          <Button title="Try again" onPress={() => void children.refetch()} />
        </Card>
      ) : children.data.length === 0 ? (
        <Card tint>
          <Icon name="leaf-outline" size={32} />
          <Heading small>Start with your little one</Heading>
          <Body>Create a profile, choose your privacy settings, then add your first photos.</Body>
          <View className="self-start">
            <Button
              title="Create a child profile"
              icon="add"
              onPress={() => router.push('/children/new')}
            />
          </View>
          <Body muted>About 3 minutes. You choose what to share with family.</Body>
        </Card>
      ) : (
        <>
          <View className="flex-row flex-wrap gap-5">
            {children.data.map((child) => (
              <View key={child.id} className="w-full md:w-[47%]">
                <Card>
                  <View className="flex-row items-center gap-4">
                    <View className="h-14 w-14 bg-sage rounded-2xl items-center justify-center">
                      <Text className="text-forest text-xl font-semibold">
                        {child.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1 gap-1">
                      <Heading small>{child.name}</Heading>
                      <Text className="text-muted">
                        {Math.max(0, ageMonths(child.dob, new Date().toISOString()))} months old ·{' '}
                        {child.city}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row flex-wrap gap-3">
                    <Button
                      title="View memories"
                      accessibilityLabel={`View ${child.name}’s memories`}
                      icon="images-outline"
                      onPress={() => router.push(`/children/${child.id}/memories`)}
                    />
                    <Button
                      title="Overview"
                      accessibilityLabel={`Open ${child.name}’s overview`}
                      variant="quiet"
                      onPress={() => router.push(`/children/${child.id}`)}
                    />
                  </View>
                </Card>
              </View>
            ))}
          </View>
          <View className="flex-row items-center gap-2">
            <Icon name="lock-closed-outline" size={16} />
            <Body muted>Only the people you invite can access your family space.</Body>
          </View>
        </>
      )}
      <Disclosure title="Your data & deletion receipts">
        <DataManagement />
      </Disclosure>
    </Screen>
  );
}
