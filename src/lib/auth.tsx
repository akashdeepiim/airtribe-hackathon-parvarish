import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { queryClient } from './query';
import { extractInviteToken } from '../domain/invites';
type AuthState = {
  session: Session | null;
  loading: boolean;
  pendingInvite: string | null;
  clearInvite: () => void;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);
  const userId = useRef<string | undefined>(undefined);
  useEffect(() => {
    let active = true;
    const receive = (url: string) => {
      const token = extractInviteToken(url);
      if (token) setPendingInvite(token);
    };
    void Linking.getInitialURL().then((url) => {
      if (active && url) receive(url);
    });
    const link = Linking.addEventListener('url', ({ url }) => receive(url));
    if (!supabase) {
      setLoading(false);
      return () => {
        active = false;
        link.remove();
      };
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (userId.current !== next?.user.id) {
        queryClient.clear();
        userId.current = next?.user.id;
      }
      if (active) {
        setSession(next);
        setLoading(false);
      }
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        setSession(error ? null : data.session);
        setLoading(false);
      }
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (Platform.OS !== 'web') {
        if (state === 'active') supabase?.auth.startAutoRefresh();
        else supabase?.auth.stopAutoRefresh();
      }
      if (state === 'active') void queryClient.invalidateQueries();
    });
    return () => {
      active = false;
      link.remove();
      subscription.unsubscribe();
      appState.remove();
    };
  }, []);
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    setPendingInvite(null);
    await supabase?.auth.signOut({ scope: 'local' });
    setSession(null);
  }
  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        pendingInvite,
        clearInvite: () => setPendingInvite(null),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
