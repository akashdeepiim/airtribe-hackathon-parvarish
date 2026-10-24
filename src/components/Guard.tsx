import { type PropsWithChildren } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { Screen, Loading } from './ui';
export function Guard({ children }: PropsWithChildren) {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!session) return <Redirect href="/sign-in" />;
  return <>{children}</>;
}
