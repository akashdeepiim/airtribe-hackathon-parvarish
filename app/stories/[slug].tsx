import { stories } from '../../src/content/marketing/journey';
export { JournalArticle as default } from '../../src/screens/Journal';
export function generateStaticParams() {
  return stories.map(({ slug }) => ({ slug }));
}
