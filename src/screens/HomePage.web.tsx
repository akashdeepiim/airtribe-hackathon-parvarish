import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { stages, stories, questions } from '../content/marketing/journey';
import { Person, Arrow, Sparkle, GrowthBranch } from '../components/marketing/Illustrations.web';
import {
  PageMeta,
  SiteHeader,
  SiteFooter,
  useGentleMotion,
} from '../components/marketing/WebShell.web';
import { useAuth } from '../lib/auth';
export default function HomePage() {
  const { session } = useAuth();
  const [selected, setSelected] = useState(3);
  const [direction, setDirection] = useState(1);
  const stage = stages[selected]!;
  const { motion, toggleMotion } = useGentleMotion();
  const main = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!main.current || !('IntersectionObserver' in window)) return;
    const elements = main.current.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.1 },
    );
    main.current.classList.add('p-observed');
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  const begin = session ? '/family' : '/sign-in';
  function chooseChapter(next: number) {
    setDirection(next > selected ? 1 : -1);
    setSelected(next);
  }
  function keyboard(event: KeyboardEvent, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % stages.length;
    else if (event.key === 'ArrowLeft') next = (index + stages.length - 1) % stages.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = stages.length - 1;
    else return;
    event.preventDefault();
    chooseChapter(next);
    tabs.current[next]?.focus();
  }
  return (
    <div
      className="parvarish-web"
      data-motion={motion ? 'on' : 'off'}
      style={
        {
          '--stage-color': stage.color,
          '--stage-paper': stage.paper,
          '--chapter-direction': direction,
        } as CSSProperties
      }
    >
      <PageMeta />
      <a className="p-skip" href="#main-content">
        Skip to content
      </a>
      <SiteHeader motion={motion} onMotion={toggleMotion} />
      <main id="main-content" ref={main}>
        <section className="p-hero p-container" aria-labelledby="hero-heading">
          <div className="p-hero-copy">
            <div className="p-eyebrow">
              <span className="p-live-dot" /> FOR EVERY VERSION OF YOU, AS A PARENT
            </div>
            <h1 id="hero-heading">
              They grow.
              <br />
              You grow,{' '}
              <span className="p-italic">
                too
                <svg viewBox="0 0 190 22" aria-hidden="true">
                  <path
                    d="M5 16Q92-5 181 11M25 20q72-13 130-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              .
            </h1>
            <p className="p-hero-description">
              From the first “what if” to the fifth birthday.
              <br className="p-desktop-break" /> A little space to find your feet, keep your
              memories
              <br className="p-desktop-break" /> and grow into this beautiful, messy thing called
              family.
            </p>
            <div className="p-hero-actions">
              <a className="p-button p-button-dark" href="#journey">
                Find your chapter
                <Arrow />
              </a>
              <a className="p-text-link" href="/stories/the-ordinary-days">
                A little story first
                <Arrow diagonal />
              </a>
            </div>
            <div className="p-hero-footnote">
              <span className="p-mini-flower" aria-hidden="true">
                ✳
              </span>
              <span>No perfect parents. Just your kind of family.</span>
            </div>
          </div>
          <div className="p-world-wrap">
            <div
              className="p-world"
              ref={scene}
              onPointerMove={(event) => {
                if (!motion || event.pointerType === 'touch') return;
                const rect = event.currentTarget.getBoundingClientRect();
                event.currentTarget.style.setProperty(
                  '--turn-x',
                  `${((event.clientY - rect.top) / rect.height - 0.5) * -12}deg`,
                );
                event.currentTarget.style.setProperty(
                  '--turn-y',
                  `${((event.clientX - rect.left) / rect.width - 0.5) * 16}deg`,
                );
              }}
              onPointerLeave={() => {
                scene.current?.style.setProperty('--turn-x', '0deg');
                scene.current?.style.setProperty('--turn-y', '0deg');
              }}
            >
              <div className="p-world-orbit" />
              <div className="p-world-arch" />
              <div className="p-world-halo" aria-hidden="true" />
              <div className="p-chapter-stamp" aria-hidden="true">
                <span>THE LITTLE YEARS</span>
                <b>0{selected + 1}</b>
                <span>OF YOUR STORY</span>
              </div>
              <div className="p-sun">
                <span />
              </div>
              <div className="p-cloud p-cloud-one" />
              <div className="p-cloud p-cloud-two" />
              <Sparkle className="p-spark p-spark-one" />
              <Sparkle className="p-spark p-spark-two" />
              {stages.map((item, index) => (
                <div
                  className={`p-world-character ${index === selected ? 'is-current' : ''}`}
                  key={item.id}
                  aria-hidden={index !== selected}
                  style={
                    {
                      '--chapter-offset': Math.max(-1, Math.min(1, index - selected)),
                    } as CSSProperties
                  }
                >
                  <Person stage={item.id} />
                </div>
              ))}
              <div className="p-ground">
                <span />
              </div>
              <div className="p-block p-block-one">a</div>
              <div className="p-block p-block-two">b</div>
              <div className="p-sprout">
                <GrowthBranch />
              </div>
              <div className="p-paper-note p-note-top">
                <span className="p-tape" />
                <span className="p-note-icon">♡</span>
                <span>
                  little moments,
                  <br />
                  <b>big feelings.</b>
                </span>
              </div>
              <div className="p-paper-note p-note-bottom">
                <span className="p-note-spark">✷</span>
                <span key={stage.id}>{stage.short}</span>
              </div>
              <div className="p-world-caption">a world that grows with you</div>
            </div>
            <div className="p-chapter-controller">
              <button
                aria-label="Previous chapter"
                disabled={selected === 0}
                onClick={() => chooseChapter(selected - 1)}
              >
                <Arrow />
              </button>
              <div className="p-chapter-current" aria-live="polite" aria-atomic="true">
                <span>CHAPTER 0{selected + 1} / 05</span>
                <strong key={stage.id}>{stage.label}</strong>
              </div>
              <button
                aria-label="Next chapter"
                disabled={selected === stages.length - 1}
                onClick={() => chooseChapter(selected + 1)}
              >
                <Arrow />
              </button>
            </div>
            <div className="p-hero-stage-controls" aria-label="Preview a life stage">
              {stages.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => chooseChapter(index)}
                  aria-label={`Preview ${item.label}`}
                  aria-pressed={selected === index}
                  className={selected === index ? 'is-selected' : ''}
                >
                  <span />
                </button>
              ))}
            </div>
          </div>
        </section>
        <div className="p-value-strip">
          <div className="p-container">
            <span>YOUR PACE. YOUR PEOPLE. YOUR PARVARISH.</span>
            <span>
              <i>✳</i> Little things worth keeping
            </span>
            <span>
              <i>✳</i> A circle that’s yours
            </span>
            <span>
              <i>✳</i> Room to grow together
            </span>
          </div>
        </div>
        <section
          id="journey"
          className="p-journey p-container"
          aria-labelledby="journey-heading"
          data-reveal
        >
          <div className="p-section-heading">
            <div>
              <span className="p-eyebrow">01 / WHEREVER YOU ARE</span>
              <h2 id="journey-heading">
                Every chapter has
                <br />a little <em>wonder.</em>
              </h2>
            </div>
            <p>
              There isn’t one way to be a parent.
              <br />
              Start where you are. We’ll meet you there.
            </p>
          </div>
          <div className="p-stage-path" aria-hidden="true">
            <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
              <path d="M0 30C160 0 190 60 300 30S470 0 600 30s200 30 300 0 200-30 300 0" />
            </svg>
          </div>
          <div role="tablist" aria-label="Your family chapter" className="p-stage-tabs">
            {stages.map((item, index) => (
              <button
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                key={item.id}
                id={`stage-${item.id}`}
                role="tab"
                aria-selected={selected === index}
                aria-controls="stage-panel"
                aria-label={`${item.label} — ${item.age}`}
                tabIndex={selected === index ? 0 : -1}
                onKeyDown={(event) => keyboard(event, index)}
                onClick={() => chooseChapter(index)}
                className={`p-stage-tab ${selected === index ? 'is-active' : ''}`}
                style={{ '--card-color': item.color } as CSSProperties}
              >
                <span className="p-stage-number">0{index + 1}</span>
                <span className="p-stage-figure" aria-hidden="true">
                  <Person stage={item.id} />
                </span>
                <span className="p-stage-name">{item.label}</span>
                <span className="p-stage-age">{item.age}</span>
                <span className="p-stage-selected" aria-hidden="true">
                  {selected === index ? '↗' : '+'}
                </span>
              </button>
            ))}
          </div>
          <div
            className="p-stage-panel"
            id="stage-panel"
            role="tabpanel"
            aria-labelledby={`stage-${stage.id}`}
            tabIndex={0}
          >
            <div key={stage.id} className="p-stage-panel-copy">
              <span className="p-eyebrow">YOUR CHAPTER / {stage.age}</span>
              <h3>{stage.title}</h3>
              <p>{stage.copy}</p>
              <a className="p-text-link" href={`/stories/${stage.story}`}>
                A story for this chapter
                <Arrow />
              </a>
            </div>
            <div className="p-reflection" key={`${stage.id}-reflection`}>
              <span className="p-reflection-label">A LITTLE THOUGHT TO TAKE WITH YOU</span>
              <span className="p-handdrawn-star" aria-hidden="true">
                ✳
              </span>
              <p>{stage.prompt}</p>
              <span>Just for you. No answer to submit.</span>
            </div>
          </div>
          <p className="p-stage-privacy">
            <span aria-hidden="true">↳</span> Explore freely. Your stage choice isn’t saved. Child
            profiles begin after birth.
          </p>
        </section>
        <section id="how-it-grows" className="p-product-section" aria-labelledby="product-heading">
          <div className="p-container">
            <div className="p-section-heading" data-reveal>
              <div>
                <span className="p-eyebrow">02 / A LITTLE WORLD, ALL YOURS</span>
                <h2 id="product-heading">
                  Less scattered.
                  <br />
                  <em>More connected.</em>
                </h2>
              </div>
              <p>
                The memories. The little firsts. The people.
                <br />
                We’re bringing your family’s world together.
              </p>
            </div>
            <div className="p-product-grid">
              <article className="p-product-card p-memory-card" data-reveal>
                <div className="p-feature-art p-photo-stack" aria-hidden="true">
                  <div className="p-mini-photo p-photo-back">
                    <Person stage="baby" />
                  </div>
                  <div className="p-mini-photo p-photo-front">
                    <div>
                      <Person stage="toddler" />
                    </div>
                    <span>our favourite little days ♡</span>
                  </div>
                  <span className="p-sticker">
                    keep
                    <br />
                    this feeling
                  </span>
                </div>
                <span className="p-status">COMING NEXT</span>
                <h3>
                  A home for the
                  <br />
                  “remember when”.
                </h3>
                <p>
                  Photos, tiny stories and everyday magic. A memory timeline that grows along with
                  them.
                </p>
                <span className="p-feature-tag">01 — Memories</span>
              </article>
              <article className="p-product-card p-milestone-card" data-reveal>
                <div className="p-feature-art p-growth-art" aria-hidden="true">
                  <GrowthBranch />
                  <span className="p-growth-label">at their own pace</span>
                  <span className="p-growth-dot">✧</span>
                </div>
                <span className="p-status">COMING NEXT · REVIEWED CONTENT ONLY</span>
                <h3>
                  Little firsts.
                  <br />
                  Their own rhythm.
                </h3>
                <p>
                  A gentler way to connect memories with milestones, then discover ideas for time
                  together.
                </p>
                <span className="p-feature-tag">02 — Milestones & activities</span>
              </article>
              <article className="p-product-card p-family-card" data-reveal>
                <div className="p-feature-art p-circle-art" aria-hidden="true">
                  <span className="p-circle-line" />
                  <div className="p-family-bubble p-bubble-one">
                    <Person stage="planning" />
                  </div>
                  <div className="p-family-bubble p-bubble-two">
                    <Person stage="preschool" />
                  </div>
                  <div className="p-family-bubble p-bubble-three">
                    <Person stage="expecting" />
                  </div>
                  <span className="p-circle-heart">♡</span>
                </div>
                <span className="p-status p-status-ready">READY FOR YOUR FAMILY</span>
                <h3>
                  Your people.
                  <br />
                  Your little village.
                </h3>
                <p>
                  Invite the people you love. Choose what each person can see and do in your private
                  family space.
                </p>
                <a className="p-text-link" href={begin}>
                  Make room for your people
                  <Arrow />
                </a>
              </article>
            </div>
          </div>
        </section>
        <section className="p-manifesto p-container" data-reveal>
          <span className="p-daisy" aria-hidden="true">
            ✳
          </span>
          <span className="p-eyebrow">A SMALL REMINDER</span>
          <p>
            You don’t have to remember
            <br />
            <em>everything.</em>
            <br />
            Just how it <span>felt.</span>
          </p>
          <span className="p-manifesto-caption">
            We’re here for the parent in the picture, too.
          </span>
          <svg className="p-heart-doodle" viewBox="0 0 100 100" aria-hidden="true">
            <path
              d="M51 85C-20 36 14-12 50 27 81-11 120 32 51 85Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </section>
        <section className="p-journal-section p-container" aria-labelledby="journal-heading">
          <div className="p-section-heading" data-reveal>
            <div>
              <span className="p-eyebrow">03 / LETTERS FROM THE LITTLE YEARS</span>
              <h2 id="journal-heading">
                A pause for
                <br />
                <em>the parent.</em>
              </h2>
            </div>
            <div>
              <p>
                Small reads about the things that make a family.
                <br />A little company for the journey.
              </p>
              <a className="p-text-link" href="/stories">
                Visit the journal
                <Arrow diagonal />
              </a>
            </div>
          </div>
          <div className="p-story-grid">
            {stories.map((story, index) => (
              <a
                className={`p-story-card p-story-${index}`}
                href={`/stories/${story.slug}`}
                key={story.slug}
                data-reveal
              >
                <div className="p-story-art">
                  <Person stage={story.art} />
                  <span aria-hidden="true">
                    {index === 0
                      ? 'the little things'
                      : index === 1
                        ? 'dear little one,'
                        : 'our people ♡'}
                  </span>
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
          <p className="p-editorial-note">
            Original reflections from Parvarish. Not medical or developmental guidance.
          </p>
        </section>
        <section className="p-promise-section" id="our-promise">
          <div className="p-container p-promise-grid" data-reveal>
            <div className="p-promise-art" aria-hidden="true">
              <div className="p-lock-body">
                <span>♡</span>
              </div>
              <div className="p-lock-shackle" />
              <Sparkle className="p-lock-spark" />
              <span className="p-handwritten">
                close to your heart.
                <br />
                close to home.
              </span>
            </div>
            <div>
              <span className="p-eyebrow">04 / CLOSE, AND KEPT CLOSE</span>
              <h2>
                Their little world.
                <br />
                <em>In your hands.</em>
              </h2>
              <p>
                A family story is personal. You choose your circle, their access and how your
                child’s information is used. Your choices can change as your family does.
              </p>
              <div className="p-promise-points">
                <span>Private photos</span>
                <span>Purpose-by-purpose consent</span>
                <span>Access you control</span>
              </div>
              <a className="p-text-link" href="/privacy">
                Read our privacy promise
                <Arrow />
              </a>
            </div>
          </div>
        </section>
        <section className="p-faq p-container" aria-labelledby="faq-heading">
          <div data-reveal>
            <span className="p-eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</span>
            <h2 id="faq-heading">
              Before you
              <br />
              <em>settle in.</em>
            </h2>
            <p>
              Take a look around.
              <br />
              There’s no rush to begin.
            </p>
          </div>
          <div className="p-faq-list" data-reveal>
            {questions.map((item, index) => (
              <details key={item.q}>
                <summary>
                  <span className="p-faq-number">0{index + 1}</span>
                  <span>{item.q}</span>
                  <span className="p-faq-plus" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="p-final-invite">
          <div className="p-container" data-reveal>
            <Sparkle className="p-final-spark" />
            <span className="p-eyebrow">YOU DON’T NEED TO HAVE IT ALL FIGURED OUT.</span>
            <h2>
              Let’s grow
              <br />
              <em>into it. Together.</em>
            </h2>
            <a className="p-button p-button-dark" href={begin}>
              Create your family space
              <Arrow />
            </a>
            <p>Start with a private profile and your favourite people.</p>
            <span className="p-final-loop" aria-hidden="true" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
