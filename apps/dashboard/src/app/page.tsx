'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2 } from 'lucide-react';
import LandingPage from './landing/page';
import Dashboard from '@/components/Dashboard';
import { bizraApi } from '@/lib/api';

type AppState = 'loading' | 'landing' | 'dashboard';

/**
 * BIZRA Genesis Node - Traffic Controller
 * 
 * This is the main entry point that decides what to show:
 * - Loading: Initial state while checking user profile
 * - Landing: User has not completed onboarding (no profile)
 * - Dashboard: User has a profile, show the command center
 * 
 * Flow:
 * 1. Check /api/user/profile
 * 2. 404 or error → Show Landing page
 * 3. 200 with profile → Show Dashboard
 */
export default function HomePage() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [userName, setUserName] = useState<string>('Architect');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUserProfile();
  }, []);

  const checkUserProfile = async () => {
    try {
      // Give the loading screen a moment to be visible
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await bizraApi.getProfile();
      
      if (response.success && response.data) {
        // User has a profile - show dashboard
        setUserName(response.data.user_id || 'Architect');
        setAppState('dashboard');
      } else {
        // No profile found - show landing
        setAppState('landing');
      }
    } catch (err) {
      // API error or no backend - show landing
      console.log('Profile check failed, showing landing:', err);
      setAppState('landing');
    }
  };

  // Loading State - Genesis Initialization
  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bizra-black">
        {/* Background Grid */}
        <div className="fixed inset-0 grid-pattern opacity-30 pointer-events-none" />
        
        {/* Central Glow */}
        <div className="absolute w-[400px] h-[400px] bg-bizra-gold/10 blur-[100px] rounded-full" />
        
        {/* Loading Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 text-center"
        >
          {/* Logo */}
          <motion.div
            animate={{ 
              boxShadow: [
                '0 0 20px rgba(212, 175, 55, 0.3)',
                '0 0 60px rgba(212, 175, 55, 0.5)',
                '0 0 20px rgba(212, 175, 55, 0.3)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-bizra-gold to-bizra-gold-dark flex items-center justify-center"
          >
            <Shield className="w-12 h-12 text-bizra-black" />
          </motion.div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-gradient-gold">BIZRA</span>{' '}
            <span className="text-white/80">Genesis Node</span>
          </h1>
          
          <p className="text-white/50 mb-8">Initializing Sovereign AI Infrastructure</p>

          {/* Loading Spinner */}
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 text-bizra-gold animate-spin" />
            <span className="text-sm text-white/60 font-mono">
              Checking node status...
            </span>
          </div>

          {/* Progress Bar */}
          <motion.div
            className="mt-8 w-64 h-1 bg-white/10 rounded-full overflow-hidden mx-auto"
          >
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-bizra-gold to-bizra-gold-dark"
            />
          </motion.div>

          {/* Boot Messages */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-xs text-white/30 font-mono space-y-1"
          >
            <p>[GENESIS] Loading covenant protocols...</p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              [SYNAPSE] Establishing connection to Node0...
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              [PAT] Initializing agent subsystem...
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-8 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
      </div>
    );
  }

  // Landing State - Show Hero + Starfield
  if (appState === 'landing') {
    return <LandingPage />;
  }

  // Dashboard State - Show Command Center
  return <Dashboard userName={userName} />;
}
