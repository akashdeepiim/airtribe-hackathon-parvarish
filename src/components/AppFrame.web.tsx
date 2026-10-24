import { useState, type PropsWithChildren } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { BrandLink, PageMeta } from './marketing/WebShell.web';
import { Person, Sparkle, Arrow } from './marketing/Illustrations.web';
export function AppFrame({
  children,
  back = false,
  wide = false,
}: PropsWithChildren<{ back?: boolean; wide?: boolean }>) {
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  return (
    <div className="parvarish-web p-app">
      <PageMeta title="Your private family space — Parvarish" privatePage />
      <a className="p-skip" href="#family-content">
        Skip to content
      </a>
      <header className="p-header">
        <div className="p-container p-nav">
          <BrandLink />
          <div className="p-app-nav">
            <a href="/stories">A little reading</a>
            {session ? (
              <>
                <a href="/family">My family</a>
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
              </>
            ) : (
              <span className="p-private-label">♡ A private little world</span>
            )}
          </div>
        </div>
      </header>
      <main
        id="family-content"
        className={`p-container p-app-content ${wide ? '' : 'p-app-narrow'}`}
      >
        {back ? (
          <button
            className="p-app-back"
            onClick={() => (router.canGoBack() ? router.back() : router.replace('/family'))}
          >
            ← <span>Back</span>
          </button>
        ) : null}
        <div className="p-app-children">{children}</div>
      </main>
      <footer className="p-container p-app-footer">
        <span>Take your time. You’re growing, too.</span>
        <a href="/privacy">Your family. Your choices.</a>
        <span>Bangalore · With love, as you grow.</span>
      </footer>
    </div>
  );
}
export function WelcomeArt() {
  return (
    <div className="p-welcome-art" aria-hidden="true">
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
  return (
    <div className="p-family-ribbon">
      <div>
        <span className="p-eyebrow">THE LITTLE YEARS</span>
        <p>
          They’re finding their feet.
          <br />
          <em>And so are you.</em>
        </p>
        <a className="p-text-link" href="/stories">
          A pause for the parent
          <Arrow />
        </a>
      </div>
      <Person stage="toddler" />
      <Sparkle className="p-ribbon-spark" />
    </div>
  );
}
