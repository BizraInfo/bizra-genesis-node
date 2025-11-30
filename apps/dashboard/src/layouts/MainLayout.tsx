// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - MAIN LAYOUT                                    ║
// ║  Enterprise-grade responsive application shell with navigation       ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import React, { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Users,
  Zap,
  BarChart3,
  Trophy,
  Settings,
  Shield,
  Menu,
  X,
  Bell,
  Search,
  User,
  LogOut,
  Moon,
  Sun,
  Monitor
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useOnboarding } from '../contexts/OnboardingContext'

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    description: 'Overview and key metrics'
  },
  {
    id: 'agents',
    label: 'Agents',
    path: '/agents',
    icon: Users,
    description: 'Manage AI agents and interactions'
  },
  {
    id: 'synthesis',
    label: 'Synthesis',
    path: '/synthesis',
    icon: Zap,
    description: 'AI-powered content synthesis'
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    path: '/monitoring',
    icon: BarChart3,
    description: 'System performance and analytics'
  },
  {
    id: 'achievements',
    label: 'Achievements',
    path: '/achievements',
    icon: Trophy,
    description: 'Track your progress and rewards'
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    description: 'Application preferences'
  },
  {
    id: 'admin',
    label: 'Admin',
    path: '/admin',
    icon: Shield,
    description: 'System administration',
    adminOnly: true
  }
]

// ═══════════════════════════════════════════════════════════════════════════
// THEME MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'auto', label: 'Auto', icon: Monitor }
]

const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(() => {
    const saved = localStorage.getItem('bizra_theme')
    return (saved as 'light' | 'dark' | 'auto') || 'auto'
  })

  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }

  useEffect(() => {
    const effectiveTheme = getEffectiveTheme()
    document.documentElement.setAttribute('data-theme', effectiveTheme)
    localStorage.setItem('bizra_theme', theme)
  }, [theme])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'auto') {
        const effectiveTheme = mediaQuery.matches ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', effectiveTheme)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return { theme, setTheme, effectiveTheme: getEffectiveTheme() }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LAYOUT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const MainLayout: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const { isComplete: onboardingComplete } = useOnboarding()
  const location = useLocation()
  const navigate = useNavigate()

  const { theme, setTheme, effectiveTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifications] = useState(3) // Mock notification count

  // ═══════════════════════════════════════════════════════════════════════════
  // RESPONSIVE BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const filteredNavItems = NAVIGATION_ITEMS.filter(item => {
    if (item.adminOnly && user?.role !== 'admin' && user?.role !== 'super_admin') {
      return false
    }
    return true
  })

  const isActiveRoute = (path: string): boolean => {
    return location.pathname === path
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  const renderNavigationItem = (item: typeof NAVIGATION_ITEMS[0]) => {
    const Icon = item.icon
    const isActive = isActiveRoute(item.path)

    return (
      <motion.button
        key={item.id}
        onClick={() => {
          navigate(item.path)
          if (window.innerWidth < 1024) {
            setSidebarOpen(false)
          }
        }}
        className={`nav-item ${isActive ? 'active' : ''}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        title={item.description}
      >
        <Icon className="nav-icon" size={20} />
        <span className="nav-label">{item.label}</span>
        {item.adminOnly && (
          <span className="nav-badge admin">Admin</span>
        )}
      </motion.button>
    )
  }

  const renderUserMenu = () => (
    <div className="user-menu">
      <div className="user-info">
        <div className="user-avatar">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.username} />
          ) : (
            <User size={20} />
          )}
        </div>
        <div className="user-details">
          <div className="user-name">
            {user?.firstName} {user?.lastName}
          </div>
          <div className="user-role">
            {user?.role?.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      </div>

      <div className="user-actions">
        <button
          className="user-action"
          onClick={() => navigate('/settings')}
        >
          <Settings size={16} />
          Settings
        </button>
        <button
          className="user-action logout"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  )

  const renderThemeSelector = () => (
    <div className="theme-selector">
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon
        return (
          <button
            key={option.value}
            className={`theme-option ${theme === option.value ? 'active' : ''}`}
            onClick={() => handleThemeChange(option.value as 'light' | 'dark' | 'auto')}
            title={`Switch to ${option.label} theme`}
          >
            <Icon size={16} />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isAuthenticated) {
    return <Outlet />
  }

  return (
    <div className={`main-layout theme-${effectiveTheme}`}>
      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {sidebarOpen && window.innerWidth < 1024 && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : window.innerWidth >= 1024 ? 0 : -280
        }}
        transition={{ type: 'tween', duration: 0.3 }}
      >
        {/* Logo/Brand */}
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">⚡</div>
            <div className="brand-text">
              <div className="brand-name">BIZRA</div>
              <div className="brand-subtitle">Genesis Node</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {filteredNavItems.map(renderNavigationItem)}
        </nav>

        {/* User Section */}
        <div className="sidebar-footer">
          {renderUserMenu()}
          {renderThemeSelector()}
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="page-title">
              {filteredNavItems.find(item => isActiveRoute(item.path))?.label || 'Dashboard'}
            </div>
          </div>

          <div className="top-bar-right">
            {/* Search */}
            <button
              className="top-bar-btn"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            {/* Notifications */}
            <button className="top-bar-btn notification-btn" aria-label="Notifications">
              <Bell size={20} />
              {notifications > 0 && (
                <span className="notification-badge">{notifications}</span>
              )}
            </button>

            {/* User Menu Trigger */}
            <button
              className="user-menu-trigger"
              onClick={() => {/* Toggle user dropdown */}}
              aria-label="User menu"
            >
              <div className="user-avatar-small">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} />
                ) : (
                  <User size={20} />
                )}
              </div>
            </button>
          </div>
        </header>

        {/* Search Bar (Collapsible) */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              className="search-bar"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 60, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="search-input-container">
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Search agents, syntheses, settings..."
                  className="search-input"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <main className="page-content">
          <Outlet />
        </main>

        {/* Onboarding Reminder */}
        {!onboardingComplete && (
          <motion.div
            className="onboarding-reminder"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <div className="reminder-content">
              <span>Complete your onboarding to unlock all features</span>
              <button
                className="reminder-btn"
                onClick={() => navigate('/onboarding')}
              >
                Continue Setup
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default MainLayout
