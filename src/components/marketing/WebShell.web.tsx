import { useEffect, useState, type PropsWithChildren } from 'react';
import Head from 'expo-router/head';
import { useAuth } from '../../lib/auth';
import { Arrow, SproutMark } from './Illustrations.web';
import '../../design/web-tokens.css';
import './web.css';
const configuredUrl = process.env.EXPO_PUBLIC_SITE_URL || 'https://parvarish.akash-deep.com';
export const siteOrigin =
  configuredUrl && /^https:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(configuredUrl)
    ? configuredUrl.replace(/\/$/, '')
    : null;
export function PageMeta({
  title = 'Parvarish — growing up, together.',
  description = 'A little space for the biggest journey. Explore family life from dreaming of a child to the wonderful age of five.',
  path = '/',
  privatePage = false,
}: {
  title?: string;
  description?: string;
  path?: string;
  privatePage?: boolean;
}) {
  const index = !!siteOrigin && process.env.EXPO_PUBLIC_LAUNCH_READY === 'true' && !privatePage;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={index ? 'index,follow' : 'noindex,nofollow'} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Parvarish" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta name="twitter:card" content="summary_large_image" />
      {siteOrigin ? (
        <>
          <link rel="canonical" href={`${siteOrigin}${path}`} />
          <meta property="og:url" content={`${siteOrigin}${path}`} />
          <meta property="og:image" content={`${siteOrigin}/brand/social-preview.png`} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
        </>
      ) : null}
    </Head>
  );
}
export function BrandLink() {
  return (
    <a className="p-brand" href="/" aria-label="Parvarish home">
      <span className="p-brand-icon">
        <SproutMark />
      </span>
      parvarish<span className="p-brand-dot">.</span>
    </a>
  );
}
export function SiteHeader({ motion, onMotion }: { motion?: boolean; onMotion?: () => void }) {
  const { session } = useAuth();
  const [menu, setMenu] = useState(false);
  return (
    <header className="p-header">
      <div className="p-reading-progress" aria-hidden="true" />
      <div className="p-container p-nav">
        <BrandLink />
        <nav
          aria-label="Main navigation"
          className={menu ? 'p-nav-links is-open' : 'p-nav-links'}
          id="site-navigation"
        >
          <a href="/#journey" onClick={() => setMenu(false)}>
            Your journey
          </a>
          <a href="/#how-it-grows" onClick={() => setMenu(false)}>
            The little world
          </a>
          <a href="/stories" onClick={() => setMenu(false)}>
            Our journal
          </a>
        </nav>
        <div className="p-nav-actions">
          {onMotion && (
            <button
              className="p-motion"
              onClick={onMotion}
              aria-label={motion ? 'Pause decorative animations' : 'Play decorative animations'}
              aria-pressed={!motion}
              title={motion ? 'Pause motion' : 'Play motion'}
            >
              {motion ? 'Ⅱ' : '▷'}
            </button>
          )}
          <a className="p-nav-login" href={session ? '/family' : '/sign-in'}>
            {session ? 'My family' : 'Sign in'}
            <Arrow />
          </a>
          <button
            className="p-menu"
            aria-expanded={menu}
            aria-controls="site-navigation"
            aria-label={menu ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMenu(!menu)}
          >
            {menu ? '×' : '☰'}
          </button>
        </div>
      </div>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="p-footer">
      <div className="p-container">
        <div className="p-footer-top">
          <div>
            <BrandLink />
            <p>A little space for the biggest journey.</p>
          </div>
          <div className="p-footer-links">
            <a href="/#journey">Explore the journey</a>
            <a href="/stories">The Parvarish journal</a>
            <a href="/privacy">Our privacy promise</a>
            <a href="/about">About this little world</a>
          </div>
        </div>
        <div className="p-footer-bottom">
          <span>Rooted in Bangalore. Made for growing together.</span>
          <span>© {new Date().getFullYear()} Parvarish</span>
          <span>Take your time. You belong here.</span>
        </div>
      </div>
    </footer>
  );
}
export function PublicPage({ children }: PropsWithChildren) {
  return (
    <div className="parvarish-web">
      <a className="p-skip" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content">{children}</main>
      <SiteFooter />
    </div>
  );
}
export function useGentleMotion() {
  const [motion, setMotion] = useState(true);
  useEffect(() => {
    const pref = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setMotion(!pref.matches);
    change();
    pref.addEventListener('change', change);
    return () => pref.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = motion ? 'on' : 'off';
    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [motion]);
  return { motion, toggleMotion: () => setMotion((value) => !value) };
}
