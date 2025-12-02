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
  Globe
} from 'lucide-react';

import { BizraLogoAnimated, SacredGeometryBackground } from '@/components/brand';
import { useI18n, LANGUAGES, type LanguageCode } from '@/lib/i18n';

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

// Seed Test Questions based on blueprint
const seedQuestions = [
  {
    id: 'goal',
    question: "What's your primary goal with AI assistance?",
    options: [
      { value: 'productivity', label: 'Boost Productivity', icon: Target },
      { value: 'learning', label: 'Learn New Skills', icon: BookOpen },
      { value: 'creative', label: 'Creative Projects', icon: Palette },
      { value: 'analysis', label: 'Data Analysis', icon: BarChart2 },
    ]
  },
  {
    id: 'style',
    question: 'How do you prefer to receive information?',
    options: [
      { value: 'detailed', label: 'Detailed Explanations', icon: BookOpen },
      { value: 'concise', label: 'Brief & Direct', icon: MessageCircle },
      { value: 'visual', label: 'Visual Examples', icon: Palette },
      { value: 'interactive', label: 'Interactive Dialogue', icon: Brain },
    ]
  },
  {
    id: 'pace',
    question: 'What pace works best for you?',
    options: [
      { value: 'fast', label: 'Fast & Efficient', icon: Target },
      { value: 'thorough', label: 'Thorough & Complete', icon: Check },
      { value: 'adaptive', label: 'Adaptive to Context', icon: Brain },
      { value: 'patient', label: 'Patient & Supportive', icon: Shield },
    ]
  },
  {
    id: 'domain',
    question: 'Which domain interests you most?',
    options: [
      { value: 'tech', label: 'Technology & Code', icon: Brain },
      { value: 'business', label: 'Business & Strategy', icon: BarChart2 },
      { value: 'creative', label: 'Arts & Design', icon: Palette },
      { value: 'research', label: 'Research & Learning', icon: BookOpen },
    ]
  },
];

// PAT Agent definitions matching backend
const patAgents: { id: PatAgent; name: string; description: string; icon: React.ElementType; color: string }[] = [
  { 
    id: 'MasterReasoner', 
    name: 'Master Reasoner', 
    description: 'Deep analytical thinking, complex problem decomposition, logical synthesis',
    icon: Brain,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  },
  { 
    id: 'MemoryArchitect', 
    name: 'Memory Architect', 
    description: 'Personal context management, knowledge retention, preference learning',
    icon: BookOpen,
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  },
  { 
    id: 'CreativeSynthesizer', 
    name: 'Creative Synthesizer', 
    description: 'Creative ideation, content generation, artistic exploration',
    icon: Palette,
    color: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  },
  { 
    id: 'DataAnalyzer', 
    name: 'Data Analyzer', 
    description: 'Data processing, pattern recognition, statistical insights',
    icon: BarChart2,
    color: 'bg-green-500/20 text-green-400 border-green-500/30'
  },
  { 
    id: 'Communicator', 
    name: 'Communicator', 
    description: 'Natural conversation, email composition, professional writing',
    icon: MessageCircle,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  { 
    id: 'ExecutionPlanner', 
    name: 'Execution Planner', 
    description: 'Task orchestration, schedule optimization, resource allocation',
    icon: Target,
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  },
  { 
    id: 'EthicsGuardian', 
    name: 'Ethics Guardian', 
    description: 'Ethical alignment, bias detection, value consistency',
    icon: Shield,
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  },
];

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
  
  // Lazy-loaded covenant axioms
  const [axioms, setAxioms] = useState<readonly CovenantAxiom[]>([]);
  
  // Load axioms when entering covenant step
  useEffect(() => {
    if (step === 'covenant' && axioms.length === 0) {
      loadSystemAxioms().then(setAxioms);
    }
  }, [step, axioms.length]);
  
  const handleAnswerSelect = useCallback((value: string) => {
    const question = seedQuestions[questionIndex];
    setAnswers(prev => ({ ...prev, [question.id]: value }));
    
    if (questionIndex < seedQuestions.length - 1) {
      setTimeout(() => setQuestionIndex(prev => prev + 1), 300);
    } else {
      setTimeout(() => setStep('pat-selection'), 500);
    }
  }, [questionIndex]);
  
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
  
  const handleComplete = async () => {
    if (!selectedPat || !profileData.displayName) {
      setError('Please complete all fields');
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
                  Choose Your Language
                </h1>
                <p className="text-lg text-white/70 mb-2">
                  اختر لغتك
                </p>
                <p className="text-sm text-white/50 mb-8">
                  Select the language for your BIZRA experience
                </p>
                
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-8">
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
                
                <button
                  onClick={() => setStep('intro')}
                  className="btn-sovereign w-full max-w-md mx-auto flex items-center justify-center gap-2"
                >
                  {locale === 'ar' ? 'استمرار' : 'Continue'}
                  <ChevronRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
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
                  {locale === 'ar' ? 'مرحباً في رحلتك' : 'Welcome to Your Genesis'}
                </h1>
                
                <p className="text-lg text-white/70 mb-8 text-center">
                  {locale === 'ar' 
                    ? 'أنت على وشك أن تصبح مهندساً للذكاء الاصطناعي السيادي. هذه الرحلة ستربط عقلك بالشبكة.'
                    : 'You are about to become an Architect of sovereign AI. This ritual will align your mind with the network.'
                  }
                </p>
                
                <div className="space-y-3 text-left mb-8">
                  <StepPreview 
                    number={1} 
                    label={locale === 'ar' ? 'الميثاق' : 'The Covenant'} 
                    description={locale === 'ar' ? 'اقبل قوانين البداية' : 'Accept the Genesis Laws'} 
                    isRTL={isRTL}
                  />
                  <StepPreview 
                    number={2} 
                    label={locale === 'ar' ? 'اختبار البذرة' : 'Seed Test'} 
                    description={locale === 'ar' ? '4 أسئلة عن جوهرك' : '4 questions about your essence'} 
                    isRTL={isRTL}
                  />
                  <StepPreview 
                    number={3} 
                    label={locale === 'ar' ? 'اختيار PAT' : 'PAT Selection'} 
                    description={locale === 'ar' ? 'اختر وكيل الذكاء الرئيسي' : 'Choose your primary AI agent'} 
                    isRTL={isRTL}
                  />
                  <StepPreview 
                    number={4} 
                    label={locale === 'ar' ? 'الهوية' : 'Identity'} 
                    description={locale === 'ar' ? 'ختم ملفك السيادي' : 'Seal your sovereign profile'} 
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
                    {locale === 'ar' ? 'ابدأ الرحلة' : 'Begin The Ritual'}
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
              className="glass-panel p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <ScrollText className="w-8 h-8 text-bizra-gold" />
                <h2 className="text-2xl font-bold">The Genesis Covenant</h2>
              </div>
              
              <p className="text-white/60 mb-6">
                These are the sacred laws that govern the BIZRA Network.
                Read them carefully. They define your relationship with sovereign AI.
              </p>
              
              {/* Axioms Display */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-sovereign pr-2 mb-6">
                {axioms.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-bizra-gold" />
                  </div>
                ) : axioms.map((axiom, index) => (
                  <motion.div
                    key={axiom.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-start gap-3">
                      <Eye className="w-5 h-5 text-bizra-gold flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
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
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={covenantAccepted}
                    onChange={(e) => setCovenantAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-bizra-gold/50 bg-transparent checked:bg-bizra-gold"
                  />
                  <span className="text-sm text-white/80">
                    I have read and accept the Genesis Covenant. I understand that these principles
                    guide all interactions within the BIZRA Network, and I commit to upholding them
                    as an Architect of sovereign AI.
                  </span>
                </label>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('intro')}
                  className="btn-glass flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep('seed-test')}
                  disabled={!covenantAccepted}
                  className="btn-sovereign flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  I Accept The Covenant
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
              className="glass-panel p-8"
            >
              {/* Progress */}
              <div className="flex items-center gap-2 mb-8">
                <span className="text-sm text-white/50">Question {questionIndex + 1} of {seedQuestions.length}</span>
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-bizra-gold"
                    initial={{ width: 0 }}
                    animate={{ width: `${((questionIndex + 1) / seedQuestions.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={questionIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="text-2xl font-bold mb-6">
                    {seedQuestions[questionIndex].question}
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {seedQuestions[questionIndex].options.map((option) => {
                      const isSelected = answers[seedQuestions[questionIndex].id] === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleAnswerSelect(option.value)}
                          className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                            isSelected
                              ? 'border-bizra-gold bg-bizra-gold/10'
                              : 'border-white/10 hover:border-bizra-gold/50 hover:bg-white/5'
                          }`}
                        >
                          <option.icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-bizra-gold' : 'text-white/50'}`} />
                          <span className={`font-medium ${isSelected ? 'text-bizra-gold' : ''}`}>
                            {option.label}
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
                  className="mt-6 text-white/50 hover:text-white flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
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
              className="glass-panel p-8"
            >
              <h2 className="text-2xl font-bold mb-2">Select Your Primary PAT Agent</h2>
              <p className="text-white/50 mb-6">
                Based on your answers, we recommend <span className="text-bizra-gold font-medium">
                {patAgents.find(a => a.id === recommendedAgent())?.name}
                </span>. You can always switch later.
              </p>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-sovereign pr-2">
                {patAgents.map((agent) => {
                  const isRecommended = agent.id === recommendedAgent();
                  const isSelected = selectedPat === agent.id;
                  
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedPat(agent.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-start gap-4 ${
                        isSelected
                          ? 'border-bizra-gold bg-bizra-gold/10'
                          : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${agent.color}`}>
                        <agent.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isSelected ? 'text-bizra-gold' : ''}`}>
                            {agent.name}
                          </span>
                          {isRecommended && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-bizra-gold/20 text-bizra-gold border border-bizra-gold/30">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/50 mt-1">{agent.description}</p>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-bizra-gold flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setStep('seed-test');
                    setQuestionIndex(seedQuestions.length - 1);
                  }}
                  className="btn-glass flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep('profile')}
                  disabled={!selectedPat}
                  className="btn-sovereign flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Continue
                  <ChevronRight className="w-5 h-5" />
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
              className="glass-panel p-8"
            >
              <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
              <p className="text-white/50 mb-6">
                Set up your sovereign identity in the BIZRA network.
              </p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Enter your name"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-bizra-gold focus:outline-none focus:ring-1 focus:ring-bizra-gold/50 transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="ihsan-range" className="block text-sm font-medium mb-2">
                    Starting Ihsan Score: <span className="text-bizra-gold">{profileData.ihsan}</span>
                  </label>
                  <p className="text-xs text-white/40 mb-3">
                    Ihsan (إحسان) measures your ethical excellence and contribution quality. 
                    Start at 75 and grow through positive impact.
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
                  />
                  <div className="flex justify-between text-xs text-white/30 mt-1">
                    <span>50</span>
                    <span>75 (Default)</span>
                    <span>100</span>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-bizra-gold/5 border border-bizra-gold/20">
                  <h4 className="font-medium text-bizra-gold mb-2">Your Selection Summary</h4>
                  <div className="text-sm text-white/70 space-y-1">
                    <p>Primary PAT: <span className="text-white">{patAgents.find(a => a.id === selectedPat)?.name}</span></p>
                    <p>Goals: <span className="text-white capitalize">{answers.goal || 'Not set'}</span></p>
                    <p>Style: <span className="text-white capitalize">{answers.style || 'Not set'}</span></p>
                  </div>
                </div>
                
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep('pat-selection')}
                  className="btn-glass flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isSubmitting || !profileData.displayName}
                  className="btn-sovereign flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      Complete Setup
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
                <h2 className="text-2xl font-bold mb-2 text-gradient-gold">Genesis Complete!</h2>
                <p className="text-white/70 mb-6">
                  Your sovereign AI profile has been created. Preparing your Node installation...
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
