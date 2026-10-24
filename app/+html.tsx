import type { PropsWithChildren } from 'react';
export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#FAF8F1" />
        <meta name="referrer" content="no-referrer" />
        <link rel="icon" type="image/png" href="/brand/favicon.png" />
        <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
        <link
          rel="preload"
          href="/fonts/fraunces-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/dm-sans-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Web routes use the document as their scroll container. The native
            ScrollView reset locks body scrolling and traps these DOM pages. */}
        <style>{`html { height: auto; min-height: 100%; scroll-behavior: auto; }
          body { margin: 0; min-height: 100vh; overflow-y: auto; }
          #root { min-height: 100vh; height: auto; }
          @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
