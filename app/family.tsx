import { View, Text } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useChildren } from '../src/lib/data';
import { friendlyError } from '../src/lib/errors';
import { FamilyRibbon } from '../src/components/AppFrame';
import {
  Screen,
  Heading,
  Body,
  Button,
  Card,
  Eyebrow,
  Icon,
  Loading,
  ErrorNotice,
  SensitiveNotice,
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
      <FamilyRibbon />
      <View className="gap-4 mb-3">
        <Eyebrow>Your little circle</Eyebrow>
        <Heading>A home for their story.</Heading>
        <Body muted>Every child. Every chapter. All the people who love them.</Body>
      </View>
      {children.isPending ? (
        <Loading />
      ) : children.isError ? (
        <Card>
          <ErrorNotice message={friendlyError(children.error)} />
          <Button title="Try again" onPress={() => void children.refetch()} />
        </Card>
      ) : children.data.length === 0 ? (
        <View className="flex-col md:flex-row gap-6">
          <View className="flex-1">
            <Card tint>
              <View className="self-start bg-paper rounded-2xl p-5">
                <Icon name="leaf-outline" size={40} />
              </View>
              <Heading small>Let’s make room for your little one.</Heading>
              <Body>
                Create a private profile, choose how their information is used, and invite your
                family to share the journey.
              </Body>
              <Button
                title="Create a child profile"
                icon="add"
                onPress={() => router.push('/children/new')}
              />
              <Text className="text-sm text-muted">A few thoughtful choices. About 3 minutes.</Text>
            </Card>
          </View>
          <View className="flex-1">
            <Card>
              <Eyebrow>A space that grows with you</Eyebrow>
              {[
                {
                  icon: 'images-outline' as const,
                  title: 'Keep the everyday',
                  copy: 'A private home for photos and stories.',
                },
                {
                  icon: 'sparkles-outline' as const,
                  title: 'Celebrate their firsts',
                  copy: 'Memories that become meaningful milestones.',
                },
                {
                  icon: 'people-outline' as const,
                  title: 'Bring your people closer',
                  copy: 'Give each person the access that feels right.',
                },
              ].map((item) => (
                <View key={item.title} className="flex-row gap-4 py-3">
                  <Icon name={item.icon} />
                  <View className="flex-1 gap-2">
                    <Text className="text-ink text-lg font-semibold">{item.title}</Text>
                    <Body muted>{item.copy}</Body>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        </View>
      ) : (
        <>
          <SensitiveNotice />
          <View className="flex-row flex-wrap gap-5">
            {children.data.map((child) => (
              <View key={child.id} className="w-full md:w-[47%]">
                <Card>
                  <View className="flex-row items-center gap-4">
                    <View className="h-16 w-16 bg-peach rounded-full items-center justify-center">
                      <Text className="text-clay text-2xl font-semibold">
                        {child.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1 gap-1">
                      <Heading small>{child.name}</Heading>
                      <Text className="text-muted">{child.city}</Text>
                    </View>
                  </View>
                  <Button
                    title={`Open ${child.name}’s space`}
                    variant="secondary"
                    icon="arrow-forward"
                    onPress={() => router.push(`/children/${child.id}`)}
                  />
                </Card>
              </View>
            ))}
          </View>
          <View className="self-start">
            <Button
              title="Add another child"
              icon="add"
              onPress={() => router.push('/children/new')}
            />
          </View>
        </>
      )}
    </Screen>
  );
}
