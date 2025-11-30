import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { SacredInput } from '../../ui/SacredInput'
import { SacredButton } from '../../ui/SacredButton'
import { GlassCard } from '../../ui/GlassCard'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'

export const Register: React.FC = () => {
    const navigate = useNavigate()
    const { register } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [step, setStep] = useState(1) // 1: Account, 2: Profile, 3: Terms
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
        firstName: '',
        lastName: '',
        acceptTerms: false,
        acceptPrivacy: false,
        inviteToken: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (step < 3) {
            setStep(step + 1)
            return
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (!formData.acceptTerms || !formData.acceptPrivacy) {
            toast.error('You must accept the terms and privacy policy')
            return
        }

        setIsLoading(true)

        try {
            await register(formData)
            toast.success('Registration successful! Please log in.')
            navigate('/login')
        } catch (error) {
            console.error('Registration failed', error)
            // Error handling is already done in AuthService (throwing AuthError), 
            // but we can catch generic errors here if needed or let the global error handler catch it.
            // For now, let's just show a generic error if the service didn't throw a specific one we caught.
            toast.error('Registration failed. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black/95 p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.1),transparent_70%)]" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <GlassCard className="p-8 border-pink-500/20">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400 mb-2">
                            Join Genesis
                        </h1>
                        <p className="text-gray-400">Create your BIZRA account</p>

                        {/* Step Indicator */}
                        <div className="flex justify-center space-x-2 mt-4">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={`h-1 w-8 rounded-full transition-colors duration-300 ${step >= i ? 'bg-pink-500' : 'bg-gray-700'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {step === 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-4"
                            >
                                <SacredInput
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="Enter your email"
                                    required
                                    data-testid="register-email"
                                />
                                <SacredInput
                                    label="Password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Create a password"
                                    required
                                    data-testid="register-password"
                                />
                                <SacredInput
                                    label="Confirm Password"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="Confirm your password"
                                    required
                                    data-testid="register-confirm-password"
                                />
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-4"
                            >
                                <SacredInput
                                    label="Username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="Choose a username"
                                    required
                                    data-testid="register-username"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <SacredInput
                                        label="First Name"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        placeholder="First Name"
                                        required
                                        data-testid="register-firstname"
                                    />
                                    <SacredInput
                                        label="Last Name"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        placeholder="Last Name"
                                        required
                                        data-testid="register-lastname"
                                    />
                                </div>
                                <SacredInput
                                    label="Invite Token (Optional)"
                                    value={formData.inviteToken}
                                    onChange={(e) => setFormData({ ...formData, inviteToken: e.target.value })}
                                    placeholder="Enter Alpha-100 token"
                                    data-testid="register-token"
                                />
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <label className="flex items-start space-x-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={formData.acceptTerms}
                                            onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                                            className="mt-1 form-checkbox h-4 w-4 rounded border-pink-500/30 bg-black/50 text-pink-500 focus:ring-pink-500/50 transition-colors"
                                            data-testid="register-terms"
                                        />
                                        <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                            I accept the <a href="#" className="text-pink-400 hover:underline">Terms of Service</a> and <a href="#" className="text-pink-400 hover:underline">Community Guidelines</a>.
                                        </span>
                                    </label>

                                    <label className="flex items-start space-x-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={formData.acceptPrivacy}
                                            onChange={(e) => setFormData({ ...formData, acceptPrivacy: e.target.checked })}
                                            className="mt-1 form-checkbox h-4 w-4 rounded border-pink-500/30 bg-black/50 text-pink-500 focus:ring-pink-500/50 transition-colors"
                                            data-testid="register-privacy"
                                        />
                                        <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                            I have read and acknowledge the <a href="#" className="text-pink-400 hover:underline">Privacy Policy</a>.
                                        </span>
                                    </label>
                                </div>
                            </motion.div>
                        )}

                        <div className="flex space-x-4 pt-4">
                            {step > 1 && (
                                <SacredButton
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setStep(step - 1)}
                                    className="flex-1"
                                    data-testid="register-back"
                                >
                                    Back
                                </SacredButton>
                            )}
                            <SacredButton
                                type="submit"
                                variant="primary"
                                className="flex-1"
                                loading={isLoading}
                                data-testid="register-submit"
                            >
                                {step === 3 ? 'Create Account' : 'Continue'}
                            </SacredButton>
                        </div>

                        <div className="text-center text-sm text-gray-400 mt-6">
                            Already have an account?{' '}
                            <Link to="/login" className="text-pink-400 hover:text-pink-300 font-medium transition-colors">
                                Sign In
                            </Link>
                        </div>
                    </form>
                </GlassCard>
            </motion.div>
        </div>
    )
}
