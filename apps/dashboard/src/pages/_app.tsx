// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA DASHBOARD - APP ENTRY POINT                                         ║
// ║  Global style imports and layout configuration                             ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import '../styles/globals.css';
import '../styles/themes.css';
import '../styles/index.css';
import '../styles/auth.css';
import '../styles/invite.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { ConsciousnessProvider } from '../hooks/useConsciousness';
import dynamic from 'next/dynamic';

// Disable SSR for the entire app to avoid hydration issues with client-only hooks
const NoSSRWrapper = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const DynamicNoSSR = dynamic(() => Promise.resolve(NoSSRWrapper), {
  ssr: false,
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <DynamicNoSSR>
      <AuthProvider>
        <WebSocketProvider>
          <ConsciousnessProvider>
            <Component {...pageProps} />
          </ConsciousnessProvider>
        </WebSocketProvider>
      </AuthProvider>
    </DynamicNoSSR>
  );
}
