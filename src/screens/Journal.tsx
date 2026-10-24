import { useLocalSearchParams, router } from 'expo-router';
import { stories } from '../content/marketing/journey';
import { Screen, Heading, Body, Button } from '../components/ui';
export function JournalIndex() {
  return (
    <Screen back>
      <Heading>The little years journal.</Heading>
      {stories.map((story) => (
        <Button
          key={story.slug}
          title={story.title}
          variant="secondary"
          onPress={() => router.push(`/stories/${story.slug}`)}
        />
      ))}
    </Screen>
  );
}
export function JournalArticle() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const story = stories.find((s) => s.slug === slug);
  return (
    <Screen back>
      <Heading>{story?.title ?? 'Story unavailable.'}</Heading>
      {story?.paragraphs.map((p) => (
        <Body key={p}>{p}</Body>
      ))}
    </Screen>
  );
}
