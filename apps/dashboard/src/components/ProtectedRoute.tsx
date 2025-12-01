// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - PROTECTED ROUTE                                ║
// ║  Enterprise-grade route protection with authentication checks        ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string[]
  redirectTo?: string
  fallback?: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo = '/login',
  fallback
}) => {
  const { isAuthenticated, user, isLoading } = useAuth()
  const location = useLocation()
  const [authChecked, setAuthChecked] = useState(false)

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isLoading) {
      setAuthChecked(true)
    }
  }, [isLoading])

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  if (isLoading || !authChecked) {
    return (
      <div className="protected-route-loading">
        <motion.div
          className="loading-container"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="loading-spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Shield size={48} />
          </motion.div>
          <h3>Verifying Access</h3>
          <p>Please wait while we check your permissions...</p>
        </motion.div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isAuthenticated) {
    // Redirect to login with return URL
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE-BASED ACCESS CONTROL
  // ═══════════════════════════════════════════════════════════════════════════

  if (requiredRole && user) {
    const userRole = user.role
    const hasRequiredRole = requiredRole.includes(userRole)

    if (!hasRequiredRole) {
      // Show access denied if fallback not provided
      if (!fallback) {
        return (
          <motion.div
            className="access-denied"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="access-denied-container">
              <motion.div
                className="access-denied-icon"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <AlertTriangle size={64} />
              </motion.div>

              <h1>Access Denied</h1>
              <p>You don&apos;t have permission to access this resource.</p>

              <div className="access-details">
                <div className="detail-item">
                  <strong>Required Role:</strong> {requiredRole.join(' or ')}
                </div>
                <div className="detail-item">
                  <strong>Your Role:</strong> {userRole}
                </div>
              </div>

              <div className="access-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  Go to Dashboard
                </button>
              </div>

              <div className="access-help">
                <p>
                  If you believe this is an error, please contact your administrator
                  or <a href="mailto:support@bizra.com">contact support</a>.
                </p>
              </div>
            </div>
          </motion.div>
        )
      }

      return <>{fallback}</>
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER PROTECTED CONTENT
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}

export default ProtectedRoute
