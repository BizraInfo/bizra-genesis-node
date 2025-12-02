import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Playfair_Display } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#C9A962',
};

export const metadata: Metadata = {
  title: 'BIZRA Node0 | Genesis Synapse Dashboard',
  description: 'Sovereign AI Infrastructure - PAT Console & Genesis Monitor',
  keywords: ['BIZRA', 'Node0', 'AI', 'Sovereign', 'PAT', 'Genesis Synapse'],
  authors: [{ name: 'BIZRA Network' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable} dark`}>
      <body className="min-h-screen bg-bizra-black antialiased font-sans">
        {/* Genesis Grid Background */}
        <div className="fixed inset-0 grid-pattern opacity-40 pointer-events-none" />
        
        {/* Main Content */}
        <main className="relative z-10">
          {children}
        </main>
        
        {/* Ambient Glow Effects */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-bizra-gold/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="fixed bottom-0 right-0 w-[600px] h-[300px] bg-bizra-teal/3 blur-[100px] rounded-full pointer-events-none" />
      </body>
    </html>
  );
}

