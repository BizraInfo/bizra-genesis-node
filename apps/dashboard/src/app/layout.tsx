import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'BIZRA Node0 | Genesis Synapse Dashboard',
  description: 'Sovereign AI Infrastructure - PAT Console & Genesis Monitor',
  keywords: ['BIZRA', 'Node0', 'AI', 'Sovereign', 'PAT', 'Genesis Synapse'],
  authors: [{ name: 'BIZRA Network' }],
  themeColor: '#D4AF37',
  viewport: 'width=device-width, initial-scale=1',
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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen bg-bizra-black antialiased">
        {/* Genesis Grid Background */}
        <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
        
        {/* Main Content */}
        <main className="relative z-10">
          {children}
        </main>
        
        {/* Ambient Glow Effect */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-bizra-gold/5 blur-[120px] rounded-full pointer-events-none" />
      </body>
    </html>
  );
}
