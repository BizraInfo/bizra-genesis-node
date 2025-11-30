import React, { useState, useEffect } from 'react'
import { GlassCard } from '../../components/ui/GlassCard'
import { SacredButton } from '../../components/ui/SacredButton'
import { SacredInput } from '../../components/ui/SacredInput'
import { useAuth } from '../../contexts/AuthContext'
import { User, Bell, Shield, Key } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '../../services/api'

interface ProfileData {
    firstName: string;
    lastName: string;
    email: string;
}

interface PasswordData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export const Settings: React.FC = () => {
    const { user, token, logout } = useAuth()
    const [activeTab, setActiveTab] = useState('profile')
    const [isLoading, setIsLoading] = useState(false)
    const [isPasswordLoading, setIsPasswordLoading] = useState(false)

    // Profile state
    const [profile, setProfile] = useState<ProfileData>({
        firstName: '',
        lastName: '',
        email: '',
    })

    // Password state
    const [passwordData, setPasswordData] = useState<PasswordData>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })

    // Load profile on mount
    useEffect(() => {
        if (token) {
            loadProfile()
        }
    }, [token])

    const loadProfile = async () => {
        if (!token) {return}
        try {
            const response = await api.getProfile(token)
            if (response.success) {
                setProfile({
                    firstName: response.user.firstName,
                    lastName: response.user.lastName,
                    email: response.user.email,
                })
            }
        } catch (error) {
            // Use local user data as fallback
            if (user) {
                setProfile({
                    firstName: user.firstName || 'Initiate',
                    lastName: user.lastName || 'One',
                    email: user.email || '',
                })
            }
        }
    }

    const handleSave = async () => {
        if (!token) {
            toast.error('Please log in to save changes')
            return
        }

        setIsLoading(true)
        try {
            const response = await api.updateProfile(token, {
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
            })

            if (response.success) {
                toast.success('Profile updated successfully')
            } else {
                toast.error('Failed to update profile')
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update profile'
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePasswordChange = async () => {
        if (!token) {
            toast.error('Please log in to change password')
            return
        }

        // Validate passwords match
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match')
            return
        }

        // Validate password strength
        if (passwordData.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }

        setIsPasswordLoading(true)
        try {
            const response = await api.changePassword(token, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            })

            if (response.success) {
                toast.success(response.message || 'Password changed successfully')
                // Clear form
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                })
                // Log out user since tokens are invalidated
                setTimeout(() => {
                    logout()
                }, 2000)
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to change password'
            toast.error(message)
        } finally {
            setIsPasswordLoading(false)
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                    <p className="text-gray-400">Manage your account and preferences.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-3 space-y-2">
                    {[
                        { id: 'profile', label: 'Profile', icon: User },
                        { id: 'notifications', label: 'Notifications', icon: Bell },
                        { id: 'security', label: 'Security', icon: Shield },
                        { id: 'api', label: 'API Keys', icon: Key },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeTab === tab.id
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <tab.icon size={18} />
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="lg:col-span-9">
                    <GlassCard className="p-8 min-h-[600px] border-purple-500/20">
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-bold text-white mb-6">Profile Settings</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <SacredInput
                                        label="Username"
                                        value={user?.username || ''}
                                        disabled
                                        placeholder="Username"
                                    />
                                    <SacredInput
                                        label="Email"
                                        value={profile.email}
                                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="Email"
                                    />
                                    <SacredInput
                                        label="First Name"
                                        value={profile.firstName}
                                        onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                                        placeholder="First Name"
                                    />
                                    <SacredInput
                                        label="Last Name"
                                        value={profile.lastName}
                                        onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                                        placeholder="Last Name"
                                    />
                                </div>
                                <div className="pt-4">
                                    <SacredButton onClick={handleSave} loading={isLoading}>
                                        Save Changes
                                    </SacredButton>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-bold text-white mb-6">Notification Preferences</h2>
                                <div className="space-y-4">
                                    {['System Alerts', 'Agent Updates', 'Market Signals', 'Security Alerts'].map((item) => (
                                        <div key={item} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                                            <span className="text-gray-300">{item}</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" defaultChecked title={item} />
                                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-bold text-white mb-6">Security Settings</h2>

                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-6">
                                    <h4 className="text-yellow-500 font-medium mb-1">Two-Factor Authentication</h4>
                                    <p className="text-sm text-yellow-500/70">Recommended for enhanced security.</p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white">Change Password</h3>
                                    <p className="text-sm text-gray-400">
                                        After changing your password, you will be logged out and need to sign in again.
                                    </p>

                                    <div className="grid grid-cols-1 gap-4 max-w-md">
                                        <SacredInput
                                            label="Current Password"
                                            type="password"
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData(prev => ({
                                                ...prev,
                                                currentPassword: e.target.value
                                            }))}
                                            placeholder="Enter current password"
                                        />
                                        <SacredInput
                                            label="New Password"
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData(prev => ({
                                                ...prev,
                                                newPassword: e.target.value
                                            }))}
                                            placeholder="Enter new password (min 8 characters)"
                                        />
                                        <SacredInput
                                            label="Confirm New Password"
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData(prev => ({
                                                ...prev,
                                                confirmPassword: e.target.value
                                            }))}
                                            placeholder="Confirm new password"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <SacredButton
                                            onClick={handlePasswordChange}
                                            loading={isPasswordLoading}
                                            disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                                        >
                                            Update Password
                                        </SacredButton>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'api' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-bold text-white mb-6">API Management</h2>
                                <p className="text-gray-400 text-sm">Manage your API keys for external integrations.</p>
                                <div className="p-4 bg-black/50 rounded-lg border border-gray-800 font-mono text-sm text-gray-400 break-all">
                                    sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
                                </div>
                                <SacredButton variant="secondary" className="w-full md:w-auto">
                                    Generate New Key
                                </SacredButton>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}

export default Settings
