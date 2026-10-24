import '../global.css';
import { Slot, Stack, usePathname } from 'expo-router';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/lib/auth';
import { queryClient } from '../src/lib/query';
export default function Layout() {
  const pathname = usePathname();
  useEffect(() => {
    if (Platform.OS === 'web' && !window.location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname]);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          {Platform.OS === 'web' ? (
            <Slot />
          ) : (
            <Stack
              screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FBF8F2' } }}
            />
          )}
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
