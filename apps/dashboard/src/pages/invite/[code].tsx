// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - INVITE ACCEPTANCE PAGE                          ║
// ║  Alpha-100 invite code validation and registration flow               ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle,
  Loader2,
  Gift,
  Shield,
  Sparkles,
  ArrowRight,
  XCircle,
} from 'lucide-react'
import { inviteService, InviteValidationResult, InviteError } from '../../services/invite'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface FormData {
  email: string
  password: string
  confirmPassword: string
  username: string
  firstName: string
  lastName: string
  acceptTerms: boolean
  acceptPrivacy: boolean
}

type PageState = 'loading' | 'valid' | 'invalid' | 'form' | 'submitting' | 'success' | 'error'

// ═══════════════════════════════════════════════════════════════════════════
// INVITE CODE PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const InviteCodePage: React.FC = () => {
  const router = useRouter()
  const { code } = router.query

  // State
  const [pageState, setPageState] = useState<PageState>('loading')
  const [inviteData, setInviteData] = useState<InviteValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: '',
    acceptTerms: false,
    acceptPrivacy: false,
  })
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  // ═══════════════════════════════════════════════════════════════════════════
  // INVITE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  const validateInviteCode = useCallback(async (inviteCode: string) => {
    setPageState('loading')
    setError(null)
    setErrorCode(null)

    try {
      const result = await inviteService.validateInvite(inviteCode)
      
      if (result.valid && result.status !== 'accepted' && result.status !== 'expired' && result.status !== 'revoked') {
        setInviteData(result)
        // Pre-fill email if provided
        if (result.email) {
          setFormData(prev => ({ ...prev, email: result.email! }))
        }
        setPageState('valid')
        // Short delay then show form
        setTimeout(() => setPageState('form'), 1500)
      } else {
        setInviteData(result)
        setError(getStatusMessage(result.status))
        setPageState('invalid')
      }
    } catch (err) {
      const inviteError = err as InviteError
      setError(inviteError.message || 'Failed to validate invite code')
      setErrorCode(inviteError.code || 'UNKNOWN_ERROR')
      setPageState('invalid')
    }
  }, [])

  useEffect(() => {
    if (code && typeof code === 'string' && code.length > 0) {
      validateInviteCode(code)
    }
  }, [code, validateInviteCode])

  // ═══════════════════════════════════════════════════════════════════════════
  // PASSWORD STRENGTH
  // ═══════════════════════════════════════════════════════════════════════════

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/[a-z]/.test(password)) strength += 25
    if (/[0-9]/.test(password)) strength += 15
    if (/[^A-Za-z0-9]/.test(password)) strength += 10
    return Math.min(strength, 100)
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'var(--color-error, #ef4444)'
    if (passwordStrength < 70) return 'var(--color-warning, #f59e0b)'
    return 'var(--color-success, #22c55e)'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return 'Weak'
    if (passwordStrength < 70) return 'Fair'
    return 'Strong'
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    } else if (inviteData?.email && formData.email.toLowerCase() !== inviteData.email.toLowerCase()) {
      errors.email = 'Email must match the invite email'
    }

    // Username validation
    if (!formData.username) {
      errors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores'
    }

    // Name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required'
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required'
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    } else if (passwordStrength < 60) {
      errors.password = 'Password is too weak'
    }

    // Confirm password
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    // Terms and privacy
    if (!formData.acceptTerms) {
      errors.acceptTerms = 'You must accept the terms of service'
    }
    if (!formData.acceptPrivacy) {
      errors.acceptPrivacy = 'You must accept the privacy policy'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value

    setFormData(prev => ({ ...prev, [name]: newValue }))

    // Update password strength
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value))
    }

    // Clear field-specific error
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !code || typeof code !== 'string') {
      return
    }

    setPageState('submitting')
    setError(null)

    try {
      const result = await inviteService.acceptInvite(code, {
        email: formData.email,
        password: formData.password,
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
      })

      if (result.success) {
        // Store token if provided
        if (result.token) {
          localStorage.setItem('bizra_auth_tokens', JSON.stringify({
            accessToken: result.token,
            refreshToken: result.token, // Backend should provide separate refresh token
            expiresAt: Date.now() + ((result.expires_in || 3600) * 1000),
            tokenType: 'Bearer',
          }))
        }
        setPageState('success')
        // Redirect to dashboard after success
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError(result.message || 'Failed to create account')
        setPageState('error')
      }
    } catch (err) {
      const inviteError = err as InviteError
      setError(inviteError.message || 'Failed to create account')
      setErrorCode(inviteError.code || 'UNKNOWN_ERROR')
      setPageState('error')
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const getStatusMessage = (status: string): string => {
    switch (status) {
      case 'accepted':
        return 'This invite has already been used to create an account.'
      case 'expired':
        return 'This invite has expired. Please request a new invite.'
      case 'revoked':
        return 'This invite has been revoked and is no longer valid.'
      default:
        return 'This invite code is invalid.'
    }
  }

  const getErrorIcon = () => {
    switch (errorCode) {
      case 'INVITE_NOT_FOUND':
        return <XCircle className="error-icon" size={64} />
      case 'INVITE_EXPIRED':
        return <AlertCircle className="error-icon" size={64} />
      case 'INVITE_ALREADY_USED':
        return <CheckCircle className="error-icon used" size={64} />
      default:
        return <AlertCircle className="error-icon" size={64} />
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER STATES
  // ═══════════════════════════════════════════════════════════════════════════

  const renderLoading = () => (
    <motion.div
      className="invite-state loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="loading-content">
        <Loader2 className="loading-spinner" size={48} />
        <h2>Validating Invite Code</h2>
        <p>Please wait while we verify your invitation...</p>
        <div className="code-display">
          <code>{code}</code>
        </div>
      </div>
    </motion.div>
  )

  const renderValid = () => (
    <motion.div
      className="invite-state valid"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="valid-content">
        <motion.div
          className="success-icon"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <CheckCircle size={64} />
        </motion.div>
        <h2>Invite Verified!</h2>
        <p>Welcome to the Alpha-100 program</p>
        <div className="sparkles">
          <Sparkles size={24} />
        </div>
      </div>
    </motion.div>
  )

  const renderInvalid = () => (
    <motion.div
      className="invite-state invalid"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="invalid-content">
        {getErrorIcon()}
        <h2>Invite Invalid</h2>
        <p>{error}</p>
        <div className="invalid-actions">
          <Link href="/login" className="btn btn-secondary">
            Sign In Instead
          </Link>
          <Link href="/" className="btn btn-outline">
            Go Home
          </Link>
        </div>
      </div>
    </motion.div>
  )

  const renderSuccess = () => (
    <motion.div
      className="invite-state success"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="success-content">
        <motion.div
          className="success-icon"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <CheckCircle size={80} />
        </motion.div>
        <h2>Welcome to BIZRA!</h2>
        <p>Your Alpha-100 account has been created successfully.</p>
        <div className="redirect-notice">
          <Loader2 className="mini-spinner" size={16} />
          <span>Redirecting to dashboard...</span>
        </div>
      </div>
    </motion.div>
  )

  const renderForm = () => (
    <motion.div
      className="invite-state form"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="form-container">
        {/* Header */}
        <div className="form-header">
          <div className="invite-badge">
            <Gift size={20} />
            <span>Alpha-100 Invite</span>
          </div>
          <h1>Complete Your Registration</h1>
          <p>You've been invited to join BIZRA's exclusive Alpha-100 program.</p>
        </div>

        {/* Error Display */}
        {(error || Object.keys(formErrors).length > 0) && pageState !== 'submitting' && (
          <motion.div
            className="form-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle size={20} />
            <span>{error || Object.values(formErrors)[0]}</span>
          </motion.div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="registration-form">
          {/* Name Fields */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  disabled={pageState === 'submitting'}
                  className={formErrors.firstName ? 'error' : ''}
                />
              </div>
              {formErrors.firstName && <span className="field-error">{formErrors.firstName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  disabled={pageState === 'submitting'}
                  className={formErrors.lastName ? 'error' : ''}
                />
              </div>
              {formErrors.lastName && <span className="field-error">{formErrors.lastName}</span>}
            </div>
          </div>

          {/* Username & Email */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="johndoe"
                  disabled={pageState === 'submitting'}
                  className={formErrors.username ? 'error' : ''}
                />
              </div>
              {formErrors.username && <span className="field-error">{formErrors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  disabled={pageState === 'submitting' || !!inviteData?.email}
                  className={formErrors.email ? 'error' : ''}
                />
              </div>
              {inviteData?.email && (
                <span className="field-hint">Email is pre-filled from your invite</span>
              )}
              {formErrors.email && <span className="field-error">{formErrors.email}</span>}
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a strong password"
                disabled={pageState === 'submitting'}
                className={formErrors.password ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <motion.div
                    className="strength-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${passwordStrength}%` }}
                    style={{ backgroundColor: getPasswordStrengthColor() }}
                  />
                </div>
                <span className="strength-text" style={{ color: getPasswordStrengthColor() }}>
                  {getPasswordStrengthText()}
                </span>
              </div>
            )}
            {formErrors.password && <span className="field-error">{formErrors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                disabled={pageState === 'submitting'}
                className={formErrors.confirmPassword ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formErrors.confirmPassword && (
              <span className="field-error">{formErrors.confirmPassword}</span>
            )}
          </div>

          {/* Terms & Privacy */}
          <div className="form-group checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleInputChange}
                disabled={pageState === 'submitting'}
              />
              <span className="checkbox-mark"></span>
              <span>
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </a>
              </span>
            </label>
            {formErrors.acceptTerms && <span className="field-error">{formErrors.acceptTerms}</span>}

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="acceptPrivacy"
                checked={formData.acceptPrivacy}
                onChange={handleInputChange}
                disabled={pageState === 'submitting'}
              />
              <span className="checkbox-mark"></span>
              <span>
                I agree to the{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
              </span>
            </label>
            {formErrors.acceptPrivacy && (
              <span className="field-error">{formErrors.acceptPrivacy}</span>
            )}
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={pageState === 'submitting'}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {pageState === 'submitting' ? (
              <>
                <Loader2 className="btn-spinner" size={18} />
                Creating Account...
              </>
            ) : (
              <>
                Join Alpha-100
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <div className="form-footer">
          <p>
            Already have an account?{' '}
            <Link href="/login">Sign in here</Link>
          </p>
          <div className="security-notice">
            <Shield size={16} />
            <span>Your data is encrypted and secure</span>
          </div>
        </div>
      </div>
    </motion.div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      <Head>
        <title>Accept Invite | BIZRA Alpha-100</title>
        <meta name="description" content="Accept your Alpha-100 invite and join BIZRA" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="invite-page">
        {/* Background */}
        <div className="invite-bg">
          <div className="bg-shape shape-1"></div>
          <div className="bg-shape shape-2"></div>
          <div className="bg-shape shape-3"></div>
          <div className="bg-grid"></div>
        </div>

        {/* Content */}
        <div className="invite-content">
          <AnimatePresence mode="wait">
            {pageState === 'loading' && renderLoading()}
            {pageState === 'valid' && renderValid()}
            {pageState === 'invalid' && renderInvalid()}
            {pageState === 'form' && renderForm()}
            {pageState === 'submitting' && renderForm()}
            {pageState === 'error' && renderForm()}
            {pageState === 'success' && renderSuccess()}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}

export default InviteCodePage
