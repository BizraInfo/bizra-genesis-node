import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { SacredInput } from '../../ui/SacredInput'
import { SacredButton } from '../../ui/SacredButton'
import { GlassCard } from '../../ui/GlassCard'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'

export const Login: React.FC = () => {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            await login(formData)
            navigate('/dashboard')
        } catch (error) {
            // Error is handled by AuthContext/AuthService
            console.error('Login failed', error)
            toast.error('Login failed. Please check your credentials.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black/95 p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.1),transparent_70%)]" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <GlassCard className="p-8 border-purple-500/20">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-gray-400">Sign in to access your Genesis Node</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <SacredInput
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Enter your email"
                            required
                            data-testid="login-email"
                        />

                        <SacredInput
                            label="Password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Enter your password"
                            required
                            data-testid="login-password"
                        />

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.rememberMe}
                                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                                    className="form-checkbox h-4 w-4 rounded border-purple-500/30 bg-black/50 text-purple-500 focus:ring-purple-500/50 transition-colors"
                                    data-testid="login-remember"
                                />
                                <span className="text-gray-400 group-hover:text-gray-300 transition-colors">Remember me</span>
                            </label>
                            <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
                                Forgot password?
                            </a>
                        </div>

                        <SacredButton
                            type="submit"
                            variant="primary"
                            className="w-full"
                            loading={isLoading}
                            data-testid="login-submit"
                        >
                            Sign In
                        </SacredButton>

                        <div className="text-center text-sm text-gray-400 mt-6">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                                Register for Genesis
                            </Link>
                        </div>
                    </form>
                </GlassCard>
            </motion.div>
        </div>
    )
}
