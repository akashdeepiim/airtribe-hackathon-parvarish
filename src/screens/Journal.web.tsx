import { useLocalSearchParams } from 'expo-router';
import { stories } from '../content/marketing/journey';
import { Person, Arrow } from '../components/marketing/Illustrations.web';
import { PageMeta, PublicPage } from '../components/marketing/WebShell.web';
export function JournalIndex() {
  return (
    <PublicPage>
      <PageMeta
        title="The little years journal — Parvarish"
        description="Small reads about the things that make a family. Original reflections for parents and parents-to-be."
        path="/stories"
      />
      <div className="p-container">
        <div className="p-page-intro">
          <span className="p-eyebrow">THE PARVARISH JOURNAL</span>
          <h1>
            A pause for
            <br />
            <em>the parent.</em>
          </h1>
          <p>
            A few quiet minutes for your side of the story. Letters about the ordinary days, the
            beginnings and the people who make a family.
          </p>
        </div>
        <div className="p-story-grid p-journal-index">
          {stories.map((story, index) => (
            <a
              key={story.slug}
              href={`/stories/${story.slug}`}
              className={`p-story-card p-story-${index}`}
            >
              <div className="p-story-art">
                <Person stage={story.art} />
                <span>{story.category}</span>
                <div className="p-story-arrow">
                  <Arrow diagonal />
                </div>
              </div>
              <div className="p-story-meta">
                {story.category}
                <span>{story.reading}</span>
              </div>
              <h3>{story.title}</h3>
            </a>
          ))}
        </div>
      </div>
    </PublicPage>
  );
}
export function JournalArticle() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const story = stories.find((item) => item.slug === slug);
  if (!story)
    return (
      <PublicPage>
        <PageMeta title="Story not found — Parvarish" privatePage />
        <div className="p-container p-page-intro">
          <h1>
            This page is still
            <br />
            <em>unwritten.</em>
          </h1>
          <p>That story isn’t here. There are a few others waiting in the journal.</p>
          <a className="p-text-link" href="/stories">
            Back to the journal
            <Arrow />
          </a>
        </div>
      </PublicPage>
    );
  return (
    <PublicPage>
      <PageMeta
        title={`${story.title} — Parvarish`}
        description={story.intro}
        path={`/stories/${story.slug}`}
      />
      <article className="p-container">
        <a className="p-text-link p-back-link" href="/stories">
          ← The journal
        </a>
        <header className="p-page-intro">
          <span className="p-eyebrow">
            {story.category} / {story.reading}
          </span>
          <h1>{story.title}</h1>
          <p>{story.intro}</p>
        </header>
        <div className="p-article-layout">
          <div className="p-article-body">
            {story.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="p-article-note">
              An original Parvarish reflection, illustrated for this journal. This is not a parent
              testimonial or medical or developmental guidance.
            </p>
            <div className="p-article-end">
              <span className="p-eyebrow">YOUR CHAPTER IS YOURS TO WRITE.</span>
              <h2>A little world for your family.</h2>
              <a className="p-button p-button-dark" href="/family">
                Find your family space
                <Arrow />
              </a>
              <a className="p-text-link" href="/#journey">
                Explore another chapter
                <Arrow diagonal />
              </a>
            </div>
          </div>
          <aside className="p-article-aside">
            <div className="p-article-art">
              <Person stage={story.art} />
            </div>
            <div className="p-article-prompt">
              <span className="p-eyebrow">A THOUGHT TO TAKE WITH YOU</span>
              <p>{story.prompt}</p>
              <span>
                Keep it in a notebook. Share it with someone. Or just sit with it a while.
              </span>
            </div>
          </aside>
        </div>
      </article>
    </PublicPage>
  );
}
