import type { PropsWithChildren } from 'react';
export function AppFrame({ children }: PropsWithChildren<{ back?: boolean; wide?: boolean }>) {
  return <>{children}</>;
}
export function WelcomeArt() {
  return null;
}
export function FamilyRibbon() {
  return null;
}
