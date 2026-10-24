import { useState, type PropsWithChildren, type AnchorHTMLAttributes } from 'react';
import { router, usePathname, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../lib/auth';
import { useAccess, useChild } from '../lib/data';
import { BrandLink, PageMeta } from './marketing/WebShell.web';
import { Person, Sparkle } from './marketing/Illustrations.web';
import './app.css';

function AppLink({
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        router.push(href as Href);
      }}
    >
      {children}
    </a>
  );
}

export function AppFrame({
  children,
  back = false,
  wide = false,
}: PropsWithChildren<{ back?: boolean; wide?: boolean }>) {
  const { session, signOut } = useAuth();
  const pathname = usePathname();
  const childId = pathname.match(/^\/children\/([0-9a-f-]{36})(?:\/|$)/i)?.[1] ?? '';
  const child = useChild(childId);
  const access = useAccess(childId);
  const [signingOut, setSigningOut] = useState(false);
  const sections = [
    { path: '', label: 'Overview', icon: 'grid-outline' as const, visible: true },
    {
      path: '/memories',
      label: 'Memories',
      icon: 'images-outline' as const,
      visible: access.data?.capabilities['memories.read'],
    },
    {
      path: '/milestones',
      label: 'Milestones',
      icon: 'sparkles-outline' as const,
      visible: access.data?.capabilities['milestones.read'],
    },
    {
      path: '/activities',
      label: 'Activities',
      icon: 'sunny-outline' as const,
      visible: access.data?.capabilities['activities.read'],
    },
    {
      path: '/health',
      label: 'Health',
      icon: 'heart-outline' as const,
      visible: access.data?.capabilities['health.read'],
    },
    {
      path: '/studio',
      label: 'Create a keepsake',
      icon: 'color-palette-outline' as const,
      visible: access.data?.capabilities['memories.read'] && access.data?.purposes.memories,
    },
  ].filter((item) => item.visible);
  const currentLabel = [
    ...sections,
    { path: '/family', label: 'Family access' },
    { path: '/privacy', label: 'Privacy & settings' },
  ].find((item) => pathname === `/children/${childId}${item.path}`)?.label;
  const navigation = (
    path: string,
    label: string,
    icon: (typeof sections)[number]['icon'] | 'people-outline' | 'settings-outline',
  ) => {
    const href = `/children/${childId}${path}`;
    return (
      <AppLink
        key={path}
        href={href}
        className="p-section-link"
        aria-current={pathname === href ? 'page' : undefined}
      >
        <Ionicons name={icon} size={20} aria-hidden={true} />
        <span>{label}</span>
      </AppLink>
    );
  };
  return (
    <div className={`parvarish-web p-app ${childId ? 'p-has-child' : ''}`}>
      <PageMeta title={`${currentLabel ?? 'Your family'} — Parvarish`} privatePage />
      <a className="p-skip" href="#family-content">
        Skip to content
      </a>
      <header className="p-header p-app-header">
        <div className="p-container p-nav">
          <BrandLink />
          <nav className="p-app-nav" aria-label="Main navigation">
            {session ? (
              <AppLink href="/family" aria-current={pathname === '/family' ? 'page' : undefined}>
                My family
              </AppLink>
            ) : (
              <span className="p-private-label">Your private family space</span>
            )}
            <AppLink href="/guidance" className="p-global-resource">
              Health education
            </AppLink>
            <details className="p-app-menu">
              <summary>
                More <Ionicons name="chevron-down" size={14} aria-hidden={true} />
              </summary>
              <div className="p-app-menu-panel">
                {childId ? (
                  <div className="p-mobile-settings">
                    <AppLink href={`/children/${childId}/family`}>Family access</AppLink>
                    <AppLink href={`/children/${childId}/privacy`}>Privacy & settings</AppLink>
                  </div>
                ) : null}
                <a href="/guidance">Health education</a>
                <a href="/community">Parent communities</a>
                <a href="/stories">Stories for parents</a>
                <a href="/privacy">Privacy & support</a>
                {session ? (
                  <button
                    disabled={signingOut}
                    onClick={async () => {
                      setSigningOut(true);
                      try {
                        await signOut();
                        router.replace('/');
                      } finally {
                        setSigningOut(false);
                      }
                    }}
                  >
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                ) : null}
              </div>
            </details>
          </nav>
        </div>
      </header>
      <div className={`p-container p-workspace ${childId ? 'p-workspace-child' : ''}`}>
        {childId ? (
          <aside className="p-child-sidebar" aria-label="Child workspace">
            <div className="p-sidebar-heading">
              <AppLink href="/family" className="p-switch-family">
                <Ionicons name="arrow-back" size={16} aria-hidden={true} />
                All children
              </AppLink>
              <div className="p-child-context">
                <span className="p-child-initial" aria-hidden={true}>
                  {child.data?.name.slice(0, 1).toUpperCase() ?? '♡'}
                </span>
                <div>
                  <strong>{child.data?.name ?? 'Family space'}</strong>
                  <span>Private family space</span>
                </div>
              </div>
            </div>
            <nav className="p-child-navigation" aria-label="Child sections">
              {sections.map((item) => navigation(item.path, item.label, item.icon))}
            </nav>
            <nav className="p-child-settings" aria-label="Family settings">
              {navigation('/family', 'Family access', 'people-outline')}
              {navigation('/privacy', 'Privacy & settings', 'settings-outline')}
            </nav>
          </aside>
        ) : null}
        <main id="family-content" className={`p-app-content ${wide ? '' : 'p-app-narrow'}`}>
          {back && !childId ? (
            <button
              className="p-app-back"
              onClick={() => (router.canGoBack() ? router.back() : router.replace('/family'))}
            >
              ← Back
            </button>
          ) : null}
          <div className="p-app-children" key={pathname}>
            {children}
          </div>
        </main>
      </div>
      <footer className="p-container p-app-footer">
        <span>A little space to grow together.</span>
        <a href="/privacy">Privacy & support</a>
      </footer>
    </div>
  );
}
export function WelcomeArt() {
  return (
    <div className="p-welcome-art" aria-hidden={true}>
      <div className="p-welcome-arch" />
      <Person stage="expecting" />
      <div className="p-welcome-child">
        <Person stage="preschool" />
      </div>
      <Sparkle className="p-welcome-spark" />
      <span className="p-welcome-note">
        a little world,
        <br />
        <em>all yours.</em>
      </span>
    </div>
  );
}
export function FamilyRibbon() {
  return null;
}
