// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA DASHBOARD - DOCUMENT HEAD                                          ║
// ║  Custom document for favicon and meta tags                                ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon - Multiple formats for browser compatibility */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        
        {/* Meta tags */}
        <meta name="theme-color" content="#0f172a" />
        <meta name="msapplication-TileColor" content="#0f172a" />
        
        {/* BIZRA Brand Identity */}
        <meta name="application-name" content="BIZRA Genesis Node" />
        <meta name="description" content="Revolutionary AI consensus system with APEX Performance Engine and SNR Intelligence" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
