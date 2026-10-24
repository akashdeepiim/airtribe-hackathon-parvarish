import { router } from 'expo-router';
import { Screen, Heading, Body, Button } from '../src/components/ui';
export default function NotFound() {
  return (
    <Screen>
      <Heading>This page has wandered off.</Heading>
      <Body>Let’s take you back to your family space.</Body>
      <Button title="Go home" onPress={() => router.replace('/')} />
    </Screen>
  );
}
