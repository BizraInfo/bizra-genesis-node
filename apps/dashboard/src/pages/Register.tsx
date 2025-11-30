// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - REGISTER PAGE                                  ║
// ║  Enterprise-grade user registration with validation and security     ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { RegisterData } from '../types/auth'

const Register: React.FC = () => {
  const { register, isLoading, error, clearError } = useAuth()
  const navigate = useNavigate()

  // Parse invite token from URL params
  const [inviteToken, setInviteToken] = useState<string | null>(null)

  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: '',
    acceptTerms: false,
    acceptPrivacy: false
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [passwordStrength, setPasswordStrength] = useState(0)

  // ═══════════════════════════════════════════════════════════════════════════
  // PASSWORD STRENGTH CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0
    if (password.length >= 8) {strength += 25}
    if (/[A-Z]/.test(password)) {strength += 25}
    if (/[a-z]/.test(password)) {strength += 25}
    if (/[0-9]/.test(password)) {strength += 15}
    if (/[^A-Za-z0-9]/.test(password)) {strength += 10}
    return Math.min(strength, 100)
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

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }))

    // Update password strength
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value))
    }

    // Clear field-specific error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }

    // Clear general error when user interacts with form
    if (error) {
      clearError()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      // Include invite token in registration data if present
      const registrationData = inviteToken
        ? { ...formData, inviteToken }
        : formData

      await register(registrationData)

      // If registered with invite, show a success message before redirecting
      if (inviteToken) {
        navigate('/login?from=invite')
      } else {
        navigate('/onboarding')
      }
    } catch (error) {
      // Error is handled by AuthContext and displayed in UI
      console.error('Registration failed:', error)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Parse invite token from URL on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('invite')
      if (token && token.trim().length > 0) {
        setInviteToken(token.trim())
      }
    } catch (err) {
      console.error('Failed to parse invite token:', err)
    }
  }, [])

  useEffect(() => {
    clearError()
  }, [clearError])

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const getInputClassName = (fieldName: string) => {
    return `form-input ${formErrors[fieldName] ? 'error' : ''} ${error ? 'error' : ''}`
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) {return 'var(--color-error)'}
    if (passwordStrength < 70) {return 'var(--color-warning)'}
    return 'var(--color-success)'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) {return 'Weak'}
    if (passwordStrength < 70) {return 'Fair'}
    return 'Strong'
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Background Elements */}
        <div className="auth-bg">
          <div className="bg-shape shape-1"></div>
          <div className="bg-shape shape-2"></div>
          <div className="bg-shape shape-3"></div>
        </div>

        <motion.div
          className="auth-card register-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="auth-header">
            <motion.div
              className="auth-logo"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <UserPlus size={32} />
            </motion.div>
            <h1 className="auth-title">Join BIZRA</h1>
            <p className="auth-subtitle">Create your account to start synthesizing with AI</p>
          </div>

          {/* Invite Token Banner */}
          {inviteToken && (
            <motion.div
              className="invite-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <div className="invite-badge">
                <CheckCircle size={18} />
                <span>Alpha-100 Invite</span>
              </div>
              <p className="invite-text">
                You're joining via a private invite. This account will be linked
                to the Alpha-100 program with exclusive early access.
              </p>
            </motion.div>
          )}

          {/* Error Display */}
          {(error || Object.keys(formErrors).length > 0) && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AlertCircle size={20} />
              <span>
                {error?.message ||
                 Object.values(formErrors)[0] ||
                 'An error occurred during registration'}
              </span>
            </motion.div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Name Fields */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName" className="form-label">
                  First Name
                </label>
                <div className="input-wrapper">
                  <User size={20} className="input-icon" />
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={getInputClassName('firstName')}
                    placeholder="John"
                    autoComplete="given-name"
                    disabled={isLoading}
                  />
                </div>
                {formErrors.firstName && (
                  <span className="field-error">{formErrors.firstName}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="lastName" className="form-label">
                  Last Name
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={getInputClassName('lastName')}
                    placeholder="Doe"
                    autoComplete="family-name"
                    disabled={isLoading}
                  />
                </div>
                {formErrors.lastName && (
                  <span className="field-error">{formErrors.lastName}</span>
                )}
              </div>
            </div>

            {/* Username and Email */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <div className="input-wrapper">
                  <User size={20} className="input-icon" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={getInputClassName('username')}
                    placeholder="johndoe"
                    autoComplete="username"
                    disabled={isLoading}
                  />
                </div>
                {formErrors.username && (
                  <span className="field-error">{formErrors.username}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <Mail size={20} className="input-icon" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={getInputClassName('email')}
                    placeholder="john@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
                {formErrors.email && (
                  <span className="field-error">{formErrors.email}</span>
                )}
              </div>
            </div>

            {/* Password Fields */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-wrapper">
                <Lock size={20} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={getInputClassName('password')}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <motion.div
                      className="strength-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${passwordStrength}%` }}
                      style={{ backgroundColor: getPasswordStrengthColor() }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span
                    className="strength-text"
                    style={{ color: getPasswordStrengthColor() }}
                  >
                    {getPasswordStrengthText()}
                  </span>
                </div>
              )}

              {formErrors.password && (
                <span className="field-error">{formErrors.password}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <div className="input-wrapper">
                <Lock size={20} className="input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={getInputClassName('confirmPassword')}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <span className="field-error">{formErrors.confirmPassword}</span>
              )}
            </div>

            {/* Terms and Privacy */}
            <div className="form-group">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <span className="checkbox-mark"></span>
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </a>
                </label>
                {formErrors.acceptTerms && (
                  <span className="field-error">{formErrors.acceptTerms}</span>
                )}
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="acceptPrivacy"
                    checked={formData.acceptPrivacy}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <span className="checkbox-mark"></span>
                  I agree to the{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                </label>
                {formErrors.acceptPrivacy && (
                  <span className="field-error">{formErrors.acceptPrivacy}</span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner small"></div>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </motion.button>
          </form>

          {/* Sign In Link */}
          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </div>

          {/* Security Notice */}
          <div className="security-notice">
            <CheckCircle size={16} />
            <span>Your data is encrypted and secure</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Register
