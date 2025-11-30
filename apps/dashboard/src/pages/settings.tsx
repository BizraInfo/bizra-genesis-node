import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Moon,
  Sun,
  Monitor,
  Save,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react'
import { useLocalStorage } from '../hooks'
import styles from '../styles/Settings.module.css'

interface UserProfile {
  name: string
  email: string
  organization: string
  role: string
}

interface NotificationSettings {
  email: boolean
  push: boolean
  consensus: boolean
  alerts: boolean
  achievements: boolean
}

const Settings: React.FC = () => {
  // Theme settings
  const [theme, setTheme] = useLocalStorage<'light' | 'dark' | 'sacred-gold' | 'system'>('bizra-theme', 'sacred-gold')
  const [language, setLanguage] = useLocalStorage<'en' | 'ar'>('bizra-language', 'en')
  const [reducedMotion, setReducedMotion] = useLocalStorage('bizra-reduced-motion', false)

  // User profile
  const [profile, setProfile] = useState<UserProfile>({
    name: 'User Name',
    email: 'user@example.com',
    organization: 'BIZRA',
    role: 'Developer'
  })
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Notifications
  const [notifications, setNotifications] = useLocalStorage<NotificationSettings>('bizra-notifications', {
    email: true,
    push: true,
    consensus: true,
    alerts: true,
    achievements: true
  })

  // Security
  const [showPassword, setShowPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  })

  const handleThemeChange = (newTheme: typeof theme) => {
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleProfileSave = () => {
    // TODO: API call to save profile
    setIsEditingProfile(false)
  }

  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handlePasswordChange = () => {
    // TODO: API call to change password
    if (passwordData.new === passwordData.confirm) {
      console.log('Password change requested')
      setPasswordData({ current: '', new: '', confirm: '' })
    }
  }

  return (
    <div className="settings-page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1><SettingsIcon /> Settings</h1>
        <p>Customize your BIZRA experience</p>
      </motion.div>

      <div className="settings-container">
        {/* Appearance Section */}
        <motion.div
          className="settings-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="section-header">
            <Palette className="section-icon" />
            <h2>Appearance</h2>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span>Theme</span>
              <p>Choose your interface color scheme</p>
            </div>
            <div className="theme-options">
              <button
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={20} />
                Light
              </button>
              <button
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={20} />
                Dark
              </button>
              <button
                className={`theme-btn ${theme === 'sacred-gold' ? 'active' : ''}`}
                onClick={() => handleThemeChange('sacred-gold')}
              >
                <Palette size={20} />
                Sacred Gold
              </button>
              <button
                className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                onClick={() => handleThemeChange('system')}
              >
                <Monitor size={20} />
                System
              </button>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span>Language</span>
              <p>Select your preferred language</p>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
              className="setting-select"
            >
              <option value="en">English</option>
              <option value="ar">العربية (Arabic)</option>
            </select>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span>Reduce Motion</span>
              <p>Minimize animations and transitions</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          className="settings-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="section-header">
            <User className="section-icon" />
            <h2>Profile</h2>
          </div>

          <div className="profile-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                disabled={!isEditingProfile}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                disabled={!isEditingProfile}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Organization</label>
              <input
                type="text"
                value={profile.organization}
                onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                disabled={!isEditingProfile}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <input
                type="text"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                disabled={!isEditingProfile}
                className="form-input"
              />
            </div>

            <div className="form-actions">
              {isEditingProfile ? (
                <>
                  <button onClick={handleProfileSave} className="btn-primary">
                    <Save size={18} />
                    Save Changes
                  </button>
                  <button onClick={() => setIsEditingProfile(false)} className="btn-secondary">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditingProfile(true)} className="btn-secondary">
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          className="settings-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="section-header">
            <Bell className="section-icon" />
            <h2>Notifications</h2>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span>Email Notifications</span>
              <p>Receive updates via email</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={() => handleNotificationToggle('email')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span>Push Notifications</span>
              <p>Browser push notifications</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={() => handleNotificationToggle('push')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span>Consensus Updates</span>
              <p>Notify on consensus completion</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.consensus}
                onChange={() => handleNotificationToggle('consensus')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span>System Alerts</span>
              <p>Critical system notifications</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.alerts}
                onChange={() => handleNotificationToggle('alerts')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span>Achievement Unlocks</span>
              <p>Celebrate your achievements</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.achievements}
                onChange={() => handleNotificationToggle('achievements')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          className="settings-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="section-header">
            <Shield className="section-icon" />
            <h2>Security</h2>
          </div>

          <div className="security-form">
            <h3>Change Password</h3>

            <div className="form-group">
              <label>Current Password</label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  className="form-input"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                className="form-input"
                placeholder="Enter new password"
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                className="form-input"
                placeholder="Confirm new password"
              />
            </div>

            <button onClick={handlePasswordChange} className="btn-primary">
              <Lock size={18} />
              Update Password
            </button>
          </div>

          <div className="security-info">
            <p>Two-factor authentication and session management coming soon!</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Settings
