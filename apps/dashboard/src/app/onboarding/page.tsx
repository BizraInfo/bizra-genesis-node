'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

// Import only the icons we need (tree-shakeable with modularizeImports in next.config.js)
import {
  Sparkles,
  Brain,
  BookOpen,
  Palette,
  BarChart2,
  MessageCircle,
  Target,
  Shield,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  User,
  ScrollText,
  Eye,
  Globe,
  Key,
  ExternalLink,
  PartyPopper,
  Users,
  Crown,
  Star,
  Gift,
  Heart
} from 'lucide-react';

import { BizraLogoAnimated, SacredGeometryBackground } from '@/components/brand';
import { useI18n, LANGUAGES, type LanguageCode } from '@/lib/i18n';
import { 
  validateInvitationCode, 
  useInvitationCode as applyInvitationCode, 
  hasValidInvitation, 
  isPublicPhase,
  getInvitationStats,
  getCurrentInvitation,
  getPioneerTitle,
  getFounderMessage,
  getPioneerPerks,
  type InvitationCode
} from '@/lib/invitation';

// Types for lazy-loaded modules
interface CovenantAxiom {
  id: string;
  title: string;
  arabic: string;
  description: string;
  principle: string;
}

// Import covenant axioms lazily - only loaded when covenant step is reached (~3KB savings)
const loadSystemAxioms = () => import('@/lib/GenesisCovenant').then(mod => mod.SYSTEM_AXIOMS as readonly CovenantAxiom[]);

// Lazy load API - only needed at final submission (~5KB savings)
const loadApi = () => import('@/lib/api').then(mod => mod.bizraApi);

// Lazy load Starfield (Three.js) to reduce initial bundle (~330KB savings)
const Starfield = dynamic(() => import('@/components/Starfield'), {
  ssr: false,
  loading: () => (
    <div 
      className="fixed inset-0 -z-10"
      style={{ background: 'radial-gradient(ellipse at center, #0a0a0f 0%, #000000 100%)' }}
    />
  ),
});

type PatAgent = 'MasterReasoner' | 'MemoryArchitect' | 'CreativeSynthesizer' | 'DataAnalyzer' | 'Communicator' | 'ExecutionPlanner' | 'EthicsGuardian';

// Question IDs for translation mapping
const QUESTION_IDS = ['goal', 'style', 'pace', 'domain'] as const;
type QuestionId = typeof QUESTION_IDS[number];

// Option values for each question
const QUESTION_OPTIONS: Record<QuestionId, string[]> = {
  goal: ['productivity', 'learning', 'creative', 'analysis'],
  style: ['detailed', 'concise', 'visual', 'interactive'],
  pace: ['fast', 'thorough', 'adaptive', 'patient'],
  domain: ['tech', 'business', 'creative', 'research'],
};

// Icons for each option
const OPTION_ICONS: Record<string, React.ElementType> = {
  productivity: Target,
  learning: BookOpen,
  creative: Palette,
  analysis: BarChart2,
  detailed: BookOpen,
  concise: MessageCircle,
  visual: Palette,
  interactive: Brain,
  fast: Target,
  thorough: Check,
  adaptive: Brain,
  patient: Shield,
  tech: Brain,
  business: BarChart2,
  research: BookOpen,
};

type Step = 'language' | 'intro' | 'covenant' | 'seed-test' | 'pat-selection' | 'profile' | 'complete';

export default function OnboardingPage() {
  const router = useRouter();
  const { locale, setLocale, isRTL, t } = useI18n();
  const [step, setStep] = useState<Step>('language');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedPat, setSelectedPat] = useState<PatAgent | null>(null);
  const [covenantAccepted, setCovenantAccepted] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: '',
    ihsan: '75'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Invitation state
  const [invitationCode, setInvitationCode] = useState('');
  const [invitationValidated, setInvitationValidated] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [userNumber, setUserNumber] = useState<number | null>(null);
  const [userTier, setUserTier] = useState<InvitationCode['tier'] | null>(null);
  const [invitationStats, setInvitationStats] = useState<ReturnType<typeof getInvitationStats> | null>(null);
  const [publicPhase, setPublicPhase] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [specialTitle, setSpecialTitle] = useState<string | null>(null);
  const [privileges, setPrivileges] = useState<string[]>([]);
  
  // Lazy-loaded covenant axioms
  const [axioms, setAxioms] = useState<readonly CovenantAxiom[]>([]);
  
  // Check invitation status on mount
  useEffect(() => {
    const checkInvitation = () => {
      const isPublic = isPublicPhase();
      setPublicPhase(isPublic);
      setInvitationStats(getInvitationStats());
      
      if (isPublic || hasValidInvitation()) {
        setInvitationValidated(true);
        const existing = getCurrentInvitation();
        if (existing) {
          setUserNumber(existing.userNumber || null);
          setUserTier(existing.tier || null);
          // Load special experience if available
          if (existing.welcomeMessage) setWelcomeMessage(existing.welcomeMessage);
          if (existing.specialTitle) setSpecialTitle(existing.specialTitle);
          if (existing.privileges) setPrivileges(existing.privileges);
        }
      }
    };
    checkInvitation();
  }, []);
  
  // Load axioms when entering covenant step
  useEffect(() => {
    if (step === 'covenant' && axioms.length === 0) {
      loadSystemAxioms().then(setAxioms);
    }
  }, [step, axioms.length]);
  
  // Validate invitation code
  const handleValidateCode = useCallback(async () => {
    if (!invitationCode.trim()) {
      setInvitationError(t('invitation.errors.required'));
      return;
    }
    
    setIsValidating(true);
    setInvitationError(null);
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));
    
    const result = applyInvitationCode(invitationCode.trim(), profileData.displayName || 'Anonymous');
    
    if (result.success) {
      setInvitationValidated(true);
      setUserNumber(result.userNumber || null);
      setUserTier(result.tier || null);
      setInvitationStats(getInvitationStats());
      // Set special experience data
      if (result.welcomeMessage) setWelcomeMessage(result.welcomeMessage);
      if (result.specialTitle) setSpecialTitle(result.specialTitle);
      if (result.privileges) setPrivileges(result.privileges);
    } else {
      setInvitationError(t(result.error || 'invitation.errors.invalidCode'));
    }
    
    setIsValidating(false);
  }, [invitationCode, profileData.displayName, t]);
  
  // Get current question ID
  const currentQuestionId = QUESTION_IDS[questionIndex];
  
  const handleAnswerSelect = useCallback((value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestionId]: value }));
    
    if (questionIndex < QUESTION_IDS.length - 1) {
      setTimeout(() => setQuestionIndex(prev => prev + 1), 300);
    } else {
      setTimeout(() => setStep('pat-selection'), 500);
    }
  }, [questionIndex, currentQuestionId]);
  
  const recommendedAgent = useCallback((): PatAgent => {
    // Simple recommendation logic based on seed test answers
    const { goal, style, domain } = answers;
    
    if (goal === 'creative' || domain === 'creative') return 'CreativeSynthesizer';
    if (goal === 'analysis' || domain === 'tech') return 'DataAnalyzer';
    if (goal === 'learning' || style === 'detailed') return 'MemoryArchitect';
    if (goal === 'productivity' || style === 'concise') return 'ExecutionPlanner';
    if (domain === 'business') return 'MasterReasoner';
    
    return 'Communicator';
  }, [answers]);
  
  // PAT Agent definitions with translations
  const patAgents: { id: PatAgent; icon: React.ElementType; color: string }[] = [
    { 
      id: 'MasterReasoner', 
      icon: Brain,
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    },
    { 
      id: 'MemoryArchitect', 
      icon: BookOpen,
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    },
    { 
      id: 'CreativeSynthesizer', 
      icon: Palette,
      color: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
    },
    { 
      id: 'DataAnalyzer', 
      icon: BarChart2,
      color: 'bg-green-500/20 text-green-400 border-green-500/30'
    },
    { 
      id: 'Communicator', 
      icon: MessageCircle,
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    },
    { 
      id: 'ExecutionPlanner', 
      icon: Target,
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    },
    { 
      id: 'EthicsGuardian', 
      icon: Shield,
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    },
  ];
  
  const handleComplete = async () => {
    if (!selectedPat || !profileData.displayName) {
      setError(t('common.error'));
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Lazy load API only when needed
      const api = await loadApi();
      
      // Create user profile via API
      await api.createProfile({
        seed_state: answers.goal || 'dreamer',
        primary_pat_role: selectedPat || 'Communicator',
        goals: Object.values(answers),
        time_available_weekly: 20
      });
      
      setStep('complete');
      setTimeout(() => router.push('/installer'), 2000);
    } catch (err) {
      // If API fails, still proceed (local-first)
      console.log('Profile creation failed, proceeding anyway:', err);
      setStep('complete');
      setTimeout(() => router.push('/installer'), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Starfield Background */}
      <Starfield nodeCount={100} connectionDistance={100} speed={0.2} />
      
      <div className="w-full max-w-2xl relative z-10">
        <AnimatePresence mode="wait">
          {/* Language Selection Step - FIRST STEP */}
          {step === 'language' && (
            <motion.div
              key="language"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-panel-gold p-8 text-center relative overflow-hidden"
            >
              <SacredGeometryBackground intensity="subtle" />
              
              <div className="relative z-10">
                <BizraLogoAnimated size="lg" className="mx-auto mb-6" />
                
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-bizra-gold/20 flex items-center justify-center">
                  <Globe className="w-8 h-8 text-bizra-gold" />
                </div>
                
                <h1 className="text-3xl font-bold mb-2 text-gradient-sovereign">
                  {t('onboarding.language.title')}
                </h1>
                <p className="text-lg text-white/70 mb-2">
                  {t('onboarding.language.titleAr')}
                </p>
                <p className="text-sm text-white/50 mb-6">
                  {t('onboarding.language.subtitle')}
                </p>
                
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-6">
                  {(Object.entries(LANGUAGES) as [LanguageCode, typeof LANGUAGES[LanguageCode]][]).map(([code, lang]) => (
                    <button
                      key={code}
                      onClick={() => setLocale(code)}
                      className={`
                        p-4 rounded-xl border transition-all duration-300
                        flex flex-col items-center gap-2
                        ${locale === code
                          ? 'border-bizra-gold bg-bizra-gold/20 shadow-lg shadow-bizra-gold/20'
                          : 'border-white/10 hover:border-bizra-gold/50 hover:bg-white/5'
                        }
                      `}
                    >
                      <span className="text-3xl">{lang.flag}</span>
                      <span className={`font-medium ${locale === code ? 'text-bizra-gold' : 'text-white'}`}>
                        {lang.nativeName}
                      </span>
                      <span className="text-xs text-white/40">{lang.name}</span>
                      {locale === code && (
                        <Check className="w-4 h-4 text-bizra-gold" />
                      )}
                    </button>
                  ))}
                </div>
                
                {/* Invitation Section */}
                <div className="border-t border-white/10 pt-6 mt-6">
                  {publicPhase ? (
                    // Public phase - no invitation needed
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                        <PartyPopper className="w-5 h-5" />
                        <span className="font-semibold">{t('invitation.publicPhase')}</span>
                      </div>
                      <p className="text-sm text-white/50">{t('invitation.publicPhaseDesc')}</p>
                    </motion.div>
                  ) : invitationValidated ? (
                    // Invitation validated - show premium success experience
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative"
                    >
                      {/* Celebration effects for Genesis tier */}
                      {userTier === 'genesis' && (
                        <motion.div 
                          className="absolute inset-0 pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {[...Array(12)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute w-2 h-2 rounded-full bg-bizra-gold"
                              initial={{ 
                                x: '50%', 
                                y: '50%',
                                scale: 0,
                                opacity: 1 
                              }}
                              animate={{ 
                                x: `${50 + (Math.random() - 0.5) * 200}%`,
                                y: `${50 + (Math.random() - 0.5) * 200}%`,
                                scale: [0, 1, 0],
                                opacity: [1, 1, 0]
                              }}
                              transition={{ 
                                duration: 2,
                                delay: i * 0.1,
                                repeat: Infinity,
                                repeatDelay: 3
                              }}
                            />
                          ))}
                        </motion.div>
                      )}
                      
                      {/* Main success card */}
                      <div className={`p-6 rounded-2xl border ${
                        userTier === 'genesis' 
                          ? 'bg-gradient-to-br from-bizra-gold/20 via-amber-500/10 to-yellow-500/20 border-bizra-gold/50 shadow-lg shadow-bizra-gold/20' 
                          : userTier === 'early'
                          ? 'bg-gradient-to-br from-purple-500/20 via-indigo-500/10 to-blue-500/20 border-purple-500/40 shadow-lg shadow-purple-500/10'
                          : 'bg-green-500/10 border-green-500/30'
                      }`}>
                        
                        {/* Special Title with icon */}
                        {specialTitle && (
                          <motion.div 
                            className="flex items-center justify-center gap-2 mb-4"
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Crown className={`w-6 h-6 ${userTier === 'genesis' ? 'text-bizra-gold' : 'text-purple-400'}`} />
                            <span className={`text-xl font-bold ${userTier === 'genesis' ? 'text-bizra-gold' : 'text-purple-300'}`}>
                              {specialTitle}
                            </span>
                          </motion.div>
                        )}
                        
                        {/* Welcome message */}
                        {welcomeMessage && (
                          <motion.p 
                            className="text-center text-white/90 text-lg mb-4 italic"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                          >
                            &ldquo;{welcomeMessage}&rdquo;
                          </motion.p>
                        )}
                        
                        {/* Success indicator */}
                        <motion.div 
                          className="flex items-center justify-center gap-2 text-green-400 mb-3"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                        >
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Check className="w-5 h-5" />
                          </div>
                          <span className="font-semibold">{t('invitation.success')}</span>
                        </motion.div>
                        
                        {/* User number with special styling */}
                        {userNumber && (
                          <motion.div 
                            className="text-center mb-4"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                          >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                              <Star className="w-4 h-4 text-bizra-gold" />
                              <span className="text-white/70">
                                {t('invitation.successDesc', { number: String(userNumber) })}
                              </span>
                              {userNumber <= 100 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-bizra-gold/20 text-bizra-gold font-semibold">
                                  First 100! 🎉
                                </span>
                              )}
                            </div>
                            
                            {/* Dynamic title based on number */}
                            <p className="mt-2 text-sm text-white/50">
                              {getPioneerTitle(userNumber)}
                            </p>
                            <p className="text-xs text-bizra-gold/70 mt-1 italic">
                              {getFounderMessage(userNumber, userTier ?? 'standard')}
                            </p>
                          </motion.div>
                        )}
                        
                        {/* Tier badge */}
                        {userTier && (
                          <motion.div 
                            className="flex justify-center mb-4"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1 }}
                          >
                            <div className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
                              userTier === 'genesis'
                                ? 'bg-gradient-to-r from-bizra-gold/30 to-amber-500/30 border border-bizra-gold/50 text-bizra-gold'
                                : userTier === 'early'
                                ? 'bg-gradient-to-r from-purple-500/30 to-indigo-500/30 border border-purple-500/50 text-purple-300'
                                : 'bg-white/10 border border-white/20 text-white/70'
                            }`}>
                              {userTier === 'genesis' && <Crown className="w-4 h-4" />}
                              {userTier === 'early' && <Star className="w-4 h-4" />}
                              {t(`invitation.tier.${userTier}`)}
                            </div>
                          </motion.div>
                        )}
                        
                        {/* Privileges list */}
                        {privileges.length > 0 && (
                          <motion.div 
                            className="mt-4 pt-4 border-t border-white/10"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2 }}
                          >
                            <div className="flex items-center justify-center gap-2 mb-3 text-white/70">
                              <Gift className="w-4 h-4" />
                              <span className="text-sm font-semibold">{t('invitation.yourPrivileges')}</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
                              {privileges.map((priv, idx) => (
                                <motion.div
                                  key={idx}
                                  className={`flex items-center gap-2 text-sm py-1 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                                  initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 1.4 + idx * 0.1 }}
                                >
                                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                                  <span className="text-white/80">{priv}</span>
                                </motion.div>
                              ))}
                            </div>
                            
                            {/* Pioneer perks */}
                            {userNumber && (
                              <div className="mt-4 pt-3 border-t border-white/5">
                                <p className="text-xs text-white/40 text-center mb-2">+ Your Pioneer Perks:</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                  {getPioneerPerks(userNumber).slice(0, 3).map((perk, idx) => (
                                    <span key={idx} className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/60">
                                      {perk}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                        
                        {/* Thank you note for early supporters */}
                        <motion.div 
                          className="mt-4 pt-4 border-t border-white/10 text-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 2 }}
                        >
                          <div className={`flex items-center justify-center gap-1 text-sm text-white/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Heart className="w-4 h-4 text-red-400" />
                            <span>Thank you for believing in BIZRA</span>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  ) : (
                    // Need invitation - show input
                    <div className="max-w-md mx-auto">
                      <div className={`flex items-center gap-2 mb-3 justify-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Key className="w-5 h-5 text-bizra-gold" />
                        <h3 className="font-semibold text-lg">{t('invitation.title')}</h3>
                      </div>
                      <p className="text-sm text-white/50 mb-4">{t('invitation.subtitle')}</p>
                      
                      {invitationStats && (
                        <div className={`flex justify-center gap-4 text-xs text-white/40 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Users className="w-3 h-3" />
                            {t('invitation.stats.pioneers', { count: String(invitationStats.totalUsers) })}
                          </span>
                          <span>
                            {t('invitation.stats.remaining', { count: String(invitationStats.maxPhase1Users - invitationStats.totalUsers) })}
                          </span>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <div className="relative">
                          <Key className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 ${isRTL ? 'right-4' : 'left-4'}`} />
                          <input
                            type="text"
                            value={invitationCode}
                            onChange={(e) => {
                              setInvitationCode(e.target.value.toUpperCase());
                              setInvitationError(null);
                            }}
                            placeholder={t('invitation.placeholder')}
                            className={`w-full py-3 rounded-xl bg-white/5 border transition-all font-mono tracking-wider text-center ${
                              invitationError 
                                ? 'border-red-500/50 focus:border-red-500' 
                                : 'border-white/10 focus:border-bizra-gold'
                            } focus:outline-none focus:ring-1 focus:ring-bizra-gold/50 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                            dir="ltr"
                            onKeyDown={(e) => e.key === 'Enter' && handleValidateCode()}
                          />
                        </div>
                        
                        {invitationError && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm"
                          >
                            {invitationError}
                          </motion.p>
                        )}
                        
                        <button
                          onClick={handleValidateCode}
                          disabled={isValidating || !invitationCode.trim()}
                          className={`w-full btn-sovereign py-3 flex items-center justify-center gap-2 disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          {isValidating ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              {t('invitation.validating')}
                            </>
                          ) : (
                            <>
                              <Key className="w-5 h-5" />
                              {t('invitation.validate')}
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* No code hint */}
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-sm text-white/40 mb-2">{t('invitation.noCode')}</p>
                        <a
                          href="https://github.com/BizraInfo"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-2 text-bizra-gold hover:text-bizra-gold/80 text-sm transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                          {t('invitation.requestAccess')}
                        </a>
                        <p className="text-xs text-white/30 mt-1">{t('invitation.requestHint')}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Continue button - only show if invitation validated or public phase */}
                {(invitationValidated || publicPhase) && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setStep('intro')}
                    className={`mt-6 btn-sovereign w-full max-w-md mx-auto flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    {t('onboarding.language.continue')}
                    <ChevronRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Intro Step */}
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-panel-gold p-8 text-center relative overflow-hidden"
            >
              <SacredGeometryBackground intensity="subtle" />
              
              <div className={`relative z-10 ${isRTL ? 'text-right' : ''}`}>
                <BizraLogoAnimated size="xl" className="mx-auto mb-6" />
                
                <h1 className="text-3xl font-bold mb-4 text-gradient-sovereign text-center">
                  {t('onboarding.welcome.title')}
                </h1>
                
                <p className="text-lg text-white/70 mb-8 text-center">
                  {t('onboarding.welcome.subtitle')} {t('onboarding.welcome.description')}
                </p>
                
                <div className="space-y-3 text-left mb-8">
                  <StepPreview 
                    number={1} 
                    label={t('onboarding.steps.covenant')} 
                    description={t('onboarding.steps.covenantDesc')} 
                    isRTL={isRTL}
                  />
                  <StepPreview 
                    number={2} 
                    label={t('onboarding.steps.seedTest')} 
                    description={t('onboarding.steps.seedTestDesc')} 
                    isRTL={isRTL}
                  />
                  <StepPreview 
                    number={3} 
                    label={t('onboarding.steps.patSelection')} 
                    description={t('onboarding.steps.patSelectionDesc')} 
                    isRTL={isRTL}
                  />
                  <StepPreview 
                    number={4} 
                    label={t('onboarding.steps.identity')} 
                    description={t('onboarding.steps.identityDesc')} 
                    isRTL={isRTL}
                  />
                </div>
                
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={() => setStep('language')}
                    className="btn-glass flex items-center gap-1"
                  >
                    <Globe className="w-4 h-4" />
                    {LANGUAGES[locale].flag}
                  </button>
                  <button
                    onClick={() => setStep('covenant')}
                    className="btn-sovereign flex-1 flex items-center justify-center gap-2"
                  >
                    {t('onboarding.welcome.cta')}
                    <ChevronRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Covenant Step - THE GENESIS RITUAL */}
          {step === 'covenant' && (
            <motion.div
              key="covenant"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`glass-panel p-8 ${isRTL ? 'text-right' : ''}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className={`flex items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <ScrollText className="w-8 h-8 text-bizra-gold" />
                <h2 className="text-2xl font-bold">{t('onboarding.covenant.title')}</h2>
              </div>
              
              <p className="text-white/60 mb-6">
                {t('onboarding.covenant.description')}
              </p>
              
              {/* Axioms Display */}
              <div className={`space-y-4 max-h-[300px] overflow-y-auto scrollbar-sovereign mb-6 ${isRTL ? 'pl-2' : 'pr-2'}`}>
                {axioms.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-bizra-gold" />
                  </div>
                ) : axioms.map((axiom, index) => (
                  <motion.div
                    key={axiom.id}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Eye className="w-5 h-5 text-bizra-gold flex-shrink-0 mt-0.5" />
                      <div>
                        <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <h4 className="font-semibold text-bizra-gold">{axiom.title}</h4>
                          <span className="text-xs text-white/40 font-arabic">{axiom.arabic}</span>
                        </div>
                        <p className="text-sm text-white/70">{axiom.description}</p>
                        <p className="text-xs text-white/40 mt-1 italic">{axiom.principle}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Acceptance Checkbox */}
              <div className="p-4 rounded-xl bg-bizra-gold/5 border border-bizra-gold/20 mb-6">
                <label className={`flex items-start gap-3 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="checkbox"
                    checked={covenantAccepted}
                    onChange={(e) => setCovenantAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-bizra-gold/50 bg-transparent checked:bg-bizra-gold"
                  />
                  <span className="text-sm text-white/80">
                    {t('onboarding.covenant.checkbox')}
                  </span>
                </label>
              </div>
              
              <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setStep('intro')}
                  className={`btn-glass flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  {t('common.back')}
                </button>
                <button
                  onClick={() => setStep('seed-test')}
                  disabled={!covenantAccepted}
                  className={`btn-sovereign flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {t('onboarding.covenant.accept')}
                  <Shield className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
          
          {/* Seed Test Step */}
          {step === 'seed-test' && (
            <motion.div
              key="seed-test"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`glass-panel p-8 ${isRTL ? 'text-right' : ''}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Progress */}
              <div className={`flex items-center gap-2 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm text-white/50">
                  {t('onboarding.seedTest.questionOf', { 
                    current: String(questionIndex + 1), 
                    total: String(QUESTION_IDS.length) 
                  })}
                </span>
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-bizra-gold"
                    initial={{ width: 0 }}
                    animate={{ width: `${((questionIndex + 1) / QUESTION_IDS.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    style={{ [isRTL ? 'marginRight' : 'marginLeft']: 0 }}
                  />
                </div>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={questionIndex}
                  initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                >
                  <h2 className="text-2xl font-bold mb-6">
                    {t(`onboarding.seedTest.questions.${currentQuestionId}.question`)}
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {QUESTION_OPTIONS[currentQuestionId].map((optionValue) => {
                      const isSelected = answers[currentQuestionId] === optionValue;
                      const Icon = OPTION_ICONS[optionValue] || Sparkles;
                      return (
                        <button
                          key={optionValue}
                          onClick={() => handleAnswerSelect(optionValue)}
                          className={`p-4 rounded-xl border transition-all duration-200 ${isRTL ? 'text-right' : 'text-left'} ${
                            isSelected
                              ? 'border-bizra-gold bg-bizra-gold/10'
                              : 'border-white/10 hover:border-bizra-gold/50 hover:bg-white/5'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-bizra-gold' : 'text-white/50'}`} />
                          <span className={`font-medium ${isSelected ? 'text-bizra-gold' : ''}`}>
                            {t(`onboarding.seedTest.questions.${currentQuestionId}.${optionValue}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
              
              {questionIndex > 0 && (
                <button
                  onClick={() => setQuestionIndex(prev => prev - 1)}
                  className={`mt-6 text-white/50 hover:text-white flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  {t('onboarding.seedTest.previous')}
                </button>
              )}
            </motion.div>
          )}
          
          {/* PAT Selection Step */}
          {step === 'pat-selection' && (
            <motion.div
              key="pat-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`glass-panel p-8 ${isRTL ? 'text-right' : ''}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <h2 className="text-2xl font-bold mb-2">{t('onboarding.patSelection.title')}</h2>
              <p className="text-white/50 mb-6">
                {t('onboarding.patSelection.description', { 
                  agent: t(`agents.roles.${recommendedAgent()}.name`) 
                })}
              </p>
              
              <div className={`space-y-3 max-h-[400px] overflow-y-auto scrollbar-sovereign ${isRTL ? 'pl-2' : 'pr-2'}`}>
                {patAgents.map((agent) => {
                  const isRecommended = agent.id === recommendedAgent();
                  const isSelected = selectedPat === agent.id;
                  
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedPat(agent.id)}
                      className={`w-full p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'} ${
                        isSelected
                          ? 'border-bizra-gold bg-bizra-gold/10'
                          : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${agent.color}`}>
                        <agent.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className={`font-semibold ${isSelected ? 'text-bizra-gold' : ''}`}>
                            {t(`agents.roles.${agent.id}.name`)}
                          </span>
                          {isRecommended && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-bizra-gold/20 text-bizra-gold border border-bizra-gold/30">
                              {t('onboarding.patSelection.recommended')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/50 mt-1">
                          {t(`agents.roles.${agent.id}.description`)}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-bizra-gold flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => {
                    setStep('seed-test');
                    setQuestionIndex(QUESTION_IDS.length - 1);
                  }}
                  className={`btn-glass flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  {t('common.back')}
                </button>
                <button
                  onClick={() => setStep('profile')}
                  disabled={!selectedPat}
                  className={`btn-sovereign flex-1 flex items-center justify-center gap-2 disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {t('common.next')}
                  <ChevronRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </motion.div>
          )}
          
          {/* Profile Step */}
          {step === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`glass-panel p-8 ${isRTL ? 'text-right' : ''}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <h2 className="text-2xl font-bold mb-2">{t('onboarding.profile.title')}</h2>
              <p className="text-white/50 mb-6">
                {t('onboarding.profile.description')}
              </p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('onboarding.profile.displayName')}</label>
                  <div className="relative">
                    <User className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 ${isRTL ? 'right-3' : 'left-3'}`} />
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder={t('onboarding.profile.displayNamePlaceholder')}
                      className={`w-full py-3 rounded-xl bg-white/5 border border-white/10 focus:border-bizra-gold focus:outline-none focus:ring-1 focus:ring-bizra-gold/50 transition-all ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="ihsan-range" className="block text-sm font-medium mb-2">
                    {t('onboarding.profile.ihsanScore')}: <span className="text-bizra-gold">{profileData.ihsan}</span>
                  </label>
                  <p className="text-xs text-white/40 mb-3">
                    {t('onboarding.profile.ihsanDescription')}
                  </p>
                  <input
                    id="ihsan-range"
                    type="range"
                    min="50"
                    max="100"
                    value={profileData.ihsan}
                    onChange={(e) => setProfileData(prev => ({ ...prev, ihsan: e.target.value }))}
                    className="w-full accent-bizra-gold"
                    aria-label="Ihsan score slider"
                    dir="ltr"
                  />
                  <div className={`flex justify-between text-xs text-white/30 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-bizra-gold/5 border border-bizra-gold/20">
                  <h4 className="font-medium text-bizra-gold mb-2">{t('onboarding.profile.summary')}</h4>
                  <div className="text-sm text-white/70 space-y-1">
                    <p>
                      {t('onboarding.profile.primaryPat')}: <span className="text-white">
                        {selectedPat ? t(`agents.roles.${selectedPat}.name`) : t('onboarding.profile.notSet')}
                      </span>
                    </p>
                    <p>
                      {t('onboarding.profile.goals')}: <span className="text-white capitalize">
                        {answers.goal ? t(`onboarding.seedTest.questions.goal.${answers.goal}`) : t('onboarding.profile.notSet')}
                      </span>
                    </p>
                    <p>
                      {t('onboarding.profile.style')}: <span className="text-white capitalize">
                        {answers.style ? t(`onboarding.seedTest.questions.style.${answers.style}`) : t('onboarding.profile.notSet')}
                      </span>
                    </p>
                  </div>
                </div>
                
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
              </div>
              
              <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setStep('pat-selection')}
                  className={`btn-glass flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  {t('common.back')}
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isSubmitting || !profileData.displayName}
                  className={`btn-sovereign flex-1 flex items-center justify-center gap-2 disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('onboarding.profile.creatingProfile')}
                    </>
                  ) : (
                    <>
                      {t('onboarding.profile.completeSetup')}
                      <Check className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
          
          {/* Complete Step */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel-gold p-8 text-center relative overflow-hidden"
            >
              <SacredGeometryBackground intensity="medium" />
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="relative z-10"
              >
                <BizraLogoAnimated size="lg" className="mx-auto mb-6" />
              </motion.div>
              
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2 text-gradient-gold">{t('onboarding.complete.title')}</h2>
                <p className="text-white/70 mb-6">
                  {t('onboarding.complete.description')}
                </p>
                
                <div className="flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-bizra-gold" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepPreview({ number, label, description, isRTL = false }: { number: number; label: string; description: string; isRTL?: boolean }) {
  return (
    <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
      <div className="w-8 h-8 rounded-lg bg-bizra-gold/20 flex items-center justify-center text-bizra-gold font-bold text-sm">
        {number}
      </div>
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-white/50">{description}</p>
      </div>
    </div>
  );
}
