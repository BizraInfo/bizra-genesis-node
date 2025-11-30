/**
 * Premium Invite Experience - Genesis 100 Alpha
 * 
 * State-of-art invitation acceptance flow:
 * 1. Loading: Neural network activation (PremiumLoading)
 * 2. Form: Glass morphism registration with password strength
 * 3. Success: Onboarding journey (OnboardingJourney)
 * 4. Dashboard: Redirect to main interface
 * 
 * Uses unified constants from genesis.ts
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  Lock,
  Mail,
  User,
  ChevronRight,
} from 'lucide-react';
import { PremiumLoading, OnboardingJourney } from '../../../components/onboarding';
import { BizraLogoAnimated } from '../../../components/brand';
import { 
  SYSTEM, 
  DESIGN, 
  INVITE_TYPES, 
  calculatePasswordStrength,
  getPasswordStrengthLevel,
} from '../../../constants/genesis';

// Types
type FlowState =
  | 'loading'
  | 'validating'
  | 'invalid'
  | 'form'
  | 'submitting'
  | 'success'
  | 'onboarding'
  | 'error';

interface InviteData {
  code: string;
  type: 'genesis_100' | 'early_access' | 'beta';
  issuedAt: string;
  expiresAt: string;
  invitedBy?: string;
  tier: 'alpha' | 'beta' | 'public';
}

interface FormData {
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
}

// Password strength label helper using unified constants
const getStrengthLabel = (strength: number): { label: string; color: string } => {
  const level = getPasswordStrengthLevel(strength);
  // Map hex colors to Tailwind classes
  const colorMap: Record<string, string> = {
    '#EF4444': 'text-red-500',
    '#F97316': 'text-orange-500',
    '#EAB308': 'text-yellow-500',
    '#2A9D8F': 'text-teal-500',
    '#22C55E': 'text-green-500',
  };
  return { label: level.label, color: colorMap[level.color] || 'text-gold-500' };
};

// Form Input Component
const FormInput = ({
  icon: Icon,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  showPasswordToggle,
  onTogglePassword,
  showPassword,
}: {
  icon: React.ElementType;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
}) => (
  <div className="space-y-2">
    <label className="text-white/80 text-sm font-medium">{label}</label>
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-500/60" />
      <input
        type={showPassword ? 'text' : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white/5 border ${
          error ? 'border-red-500' : 'border-gold-500/30'
        } rounded-xl py-3 pl-12 pr-12 text-white placeholder-white/40 focus:outline-none focus:border-gold-500 transition-colors`}
      />
      {showPasswordToggle && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      )}
    </div>
    {error && (
      <motion.p
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-red-400 text-xs flex items-center gap-1"
      >
        <AlertCircle className="w-3 h-3" />
        {error}
      </motion.p>
    )}
  </div>
);

// Password Strength Meter
const PasswordStrengthMeter = ({ password }: { password: string }) => {
  const strength = calculatePasswordStrength(password);
  const { label, color } = getStrengthLabel(strength);

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-2 space-y-2"
    >
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            strength < 30
              ? 'bg-red-500'
              : strength < 60
              ? 'bg-yellow-500'
              : strength < 80
              ? 'bg-teal-500'
              : 'bg-green-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${strength}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className={color}>{label}</span>
        <span className="text-white/40">{strength}%</span>
      </div>
    </motion.div>
  );
};

// Checkbox Component
const Checkbox = ({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) => (
  <label className="flex items-start gap-3 cursor-pointer group">
    <div className="relative flex-shrink-0 mt-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`w-5 h-5 rounded border-2 transition-all ${
          checked
            ? 'bg-gold-500 border-gold-500'
            : 'border-gold-500/40 group-hover:border-gold-500/60'
        }`}
      >
        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center h-full"
          >
            <CheckCircle className="w-3 h-3 text-navy-900" />
          </motion.div>
        )}
      </div>
    </div>
    <span className="text-white/70 text-sm leading-relaxed">{children}</span>
  </label>
);

// Invite Badge Component
const InviteBadge = ({ inviteData }: { inviteData: InviteData }) => {
  const badges = {
    genesis_100: {
      label: 'Genesis 100',
      icon: Sparkles,
      gradient: 'from-gold-500 to-amber-600',
    },
    early_access: {
      label: 'Early Access',
      icon: Shield,
      gradient: 'from-teal-500 to-emerald-600',
    },
    beta: {
      label: 'Beta Tester',
      icon: Lock,
      gradient: 'from-purple-500 to-indigo-600',
    },
  };

  const badge = badges[inviteData.type];
  const Icon = badge.icon;

  return (
    <motion.div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${badge.gradient} text-white text-sm font-medium`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <Icon className="w-4 h-4" />
      <span>{badge.label}</span>
    </motion.div>
  );
};

// Main Component
export default function PremiumInvitePage() {
  const router = useRouter();
  const { code } = router.query;

  const [flowState, setFlowState] = useState<FlowState>('loading');
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    agreePrivacy: false,
  });

  // Validate invite code
  useEffect(() => {
    if (!code) return;

    const validateInvite = async () => {
      setFlowState('validating');

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Mock validation - in production, call your API
      const mockValid = (code as string).length >= 8;

      if (mockValid) {
        setInviteData({
          code: code as string,
          type: 'genesis_100',
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          invitedBy: 'BIZRA Genesis Team',
          tier: 'alpha',
        });
        setFlowState('form');
      } else {
        setFlowState('invalid');
      }
    };

    validateInvite();
  }, [code]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.displayName || formData.displayName.length < 2) {
      errors.displayName = 'Display name must be at least 2 characters';
    }

    if (!formData.password || formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeTerms) {
      errors.agreeTerms = 'You must agree to the Terms of Service' as any;
    }

    if (!formData.agreePrivacy) {
      errors.agreePrivacy = 'You must agree to the Privacy Policy' as any;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      setFlowState('submitting');

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Success - show onboarding
        setFlowState('success');
        setTimeout(() => {
          setFlowState('onboarding');
        }, 2000);
      } catch (error) {
        setFlowState('error');
      }
    },
    [validateForm]
  );

  // Update form field
  const updateField = useCallback(
    (field: keyof FormData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (formErrors[field]) {
        setFormErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [formErrors]
  );

  // Handle onboarding complete
  const handleOnboardingComplete = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  // Render states
  const renderContent = () => {
    switch (flowState) {
      case 'loading':
      case 'validating':
        return (
          <PremiumLoading
            duration={5000}
            onComplete={() => {}}
            message="Validating your invite code..."
          />
        );

      case 'submitting':
        return (
          <PremiumLoading
            duration={2000}
            onComplete={() => {}}
            message="Creating your Genesis account..."
            targetAgents={SYSTEM.TOTAL_AGENTS}
          />
        );

      case 'invalid':
        return (
          <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 rounded-2xl max-w-md text-center"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-display text-white mb-4">
                Invalid Invite Code
              </h1>
              <p className="text-white/60 mb-6 font-sans">
                This invite code is either invalid, expired, or has already been
                used. Please check your code or request a new invitation.
              </p>
              <button
                onClick={() => router.push('/invite')}
                className="w-full py-3 bg-gold-500 rounded-xl text-navy-900 font-semibold hover:bg-gold-400 transition-colors font-sans"
              >
                Try Another Code
              </button>
            </motion.div>
          </div>
        );

      case 'success':
        return (
          <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 rounded-2xl max-w-md text-center"
            >
              <motion.div
                className="w-20 h-20 mx-auto mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-navy-900" />
                </div>
              </motion.div>
              <h1 className="text-2xl font-display text-gold-500 mb-4">
                Welcome to Genesis
              </h1>
              <p className="text-white/60 mb-6 font-sans">
                Your account has been created. Prepare for the consciousness
                journey...
              </p>
              <motion.div
                className="flex items-center justify-center gap-2 text-white/40 text-sm font-sans"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span>Initiating onboarding sequence</span>
              </motion.div>
            </motion.div>
          </div>
        );

      case 'onboarding':
        return (
          <OnboardingJourney
            onComplete={handleOnboardingComplete}
            allowSkip={true}
            duration={SYSTEM.ONBOARDING_DURATION}
          />
        );

      case 'error':
        return (
          <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 rounded-2xl max-w-md text-center"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-display text-white mb-4">
                Something went wrong
              </h1>
              <p className="text-white/60 mb-6 font-sans">
                We couldn't complete your registration. Please try again.
              </p>
              <button
                onClick={() => setFlowState('form')}
                className="w-full py-3 bg-gold-500 rounded-xl text-navy-900 font-semibold hover:bg-gold-400 transition-colors font-sans"
              >
                Try Again
              </button>
            </motion.div>
          </div>
        );

      case 'form':
        return (
          <div className="min-h-screen bg-navy-900 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900" />
              <motion.div
                className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 8, repeat: Infinity }}
              />
              <motion.div
                className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"
                animate={{
                  scale: [1.2, 1, 1.2],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 10, repeat: Infinity }}
              />
            </div>

            {/* Content */}
            <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-lg"
              >
                {/* Header - unified typography */}
                <div className="text-center mb-8">
                  <motion.div
                    className="inline-block mb-6"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    <BizraLogoAnimated size="md" />
                  </motion.div>
                  <h1 className="text-3xl md:text-4xl font-display text-gold-500 mb-4">
                    Join Genesis {SYSTEM.GENESIS_SEATS}
                  </h1>
                  {inviteData && <InviteBadge inviteData={inviteData} />}
                  <p className="text-white/60 mt-4 font-sans">
                    You've been selected as a founding member
                  </p>
                </div>

                {/* Form */}
                <motion.div
                  className="glass-card p-8 rounded-2xl border-2 border-gold-500/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <FormInput
                      icon={Mail}
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={(v) => updateField('email', v)}
                      placeholder="your@email.com"
                      error={formErrors.email}
                    />

                    <FormInput
                      icon={User}
                      label="Display Name"
                      value={formData.displayName}
                      onChange={(v) => updateField('displayName', v)}
                      placeholder="How should we call you?"
                      error={formErrors.displayName}
                    />

                    <div>
                      <FormInput
                        icon={Lock}
                        label="Password"
                        type="password"
                        value={formData.password}
                        onChange={(v) => updateField('password', v)}
                        placeholder="Create a strong password"
                        error={formErrors.password}
                        showPasswordToggle
                        showPassword={showPassword}
                        onTogglePassword={() => setShowPassword(!showPassword)}
                      />
                      <PasswordStrengthMeter password={formData.password} />
                    </div>

                    <FormInput
                      icon={Lock}
                      label="Confirm Password"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(v) => updateField('confirmPassword', v)}
                      placeholder="Confirm your password"
                      error={formErrors.confirmPassword}
                      showPasswordToggle
                      showPassword={showConfirmPassword}
                      onTogglePassword={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    />

                    {/* Agreements */}
                    <div className="space-y-4 pt-2">
                      <Checkbox
                        checked={formData.agreeTerms}
                        onChange={(v) => updateField('agreeTerms', v)}
                      >
                        I agree to the{' '}
                        <a
                          href="/terms"
                          className="text-gold-500 hover:underline"
                          target="_blank"
                        >
                          Terms of Service
                        </a>
                      </Checkbox>

                      <Checkbox
                        checked={formData.agreePrivacy}
                        onChange={(v) => updateField('agreePrivacy', v)}
                      >
                        I agree to the{' '}
                        <a
                          href="/privacy"
                          className="text-gold-500 hover:underline"
                          target="_blank"
                        >
                          Privacy Policy
                        </a>
                      </Checkbox>
                    </div>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      className="w-full py-4 bg-gradient-to-r from-gold-500 to-gold-600 rounded-xl text-navy-900 font-semibold text-lg flex items-center justify-center gap-2 hover:from-gold-400 hover:to-gold-500 transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>Begin Your Journey</span>
                      <ChevronRight className="w-5 h-5" />
                    </motion.button>
                  </form>
                </motion.div>

                {/* Footer */}
                <p className="text-center text-white/40 text-sm mt-6">
                  Need help?{' '}
                  <a
                    href="mailto:genesis@bizra.io"
                    className="text-gold-500 hover:underline"
                  >
                    Contact Genesis Team
                  </a>
                </p>
              </motion.div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>;
}
