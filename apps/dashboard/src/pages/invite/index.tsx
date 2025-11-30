// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - INVITE INDEX PAGE                               ║
// ║  Landing page for users who visit /invite without a code              ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Gift, ArrowRight, Mail, AlertCircle } from 'lucide-react'

const InviteIndexPage: React.FC = () => {
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const code = inviteCode.trim().toUpperCase()
    
    if (!code) {
      setError('Please enter an invite code')
      return
    }
    
    if (code.length < 8) {
      setError('Invite codes are at least 8 characters')
      return
    }

    // Navigate to the invite code page
    router.push(`/invite/${code}`)
  }

  return (
    <>
      <Head>
        <title>Enter Invite Code | BIZRA Alpha-100</title>
        <meta name="description" content="Enter your Alpha-100 invite code to join BIZRA" />
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
          <motion.div
            className="invite-state form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="form-container">
              {/* Header */}
              <div className="form-header">
                <motion.div
                  className="invite-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <Gift size={20} />
                  <span>Alpha-100</span>
                </motion.div>
                <h1>Enter Your Invite Code</h1>
                <p>
                  BIZRA is currently in private alpha. Enter your invite code below to join the Alpha-100 program.
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <motion.div
                  className="form-error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Invite Code Form */}
              <form onSubmit={handleSubmit} className="registration-form">
                <div className="form-group">
                  <label htmlFor="inviteCode">Invite Code</label>
                  <div className="input-wrapper">
                    <Gift size={18} className="input-icon" />
                    <input
                      type="text"
                      id="inviteCode"
                      value={inviteCode}
                      onChange={(e) => {
                        setInviteCode(e.target.value.toUpperCase())
                        setError('')
                      }}
                      placeholder="XXXX-XXXX-XXXX"
                      autoComplete="off"
                      autoFocus
                      className={error ? 'error' : ''}
                      style={{ 
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase'
                      }}
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="btn btn-primary btn-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Validate Invite
                  <ArrowRight size={18} />
                </motion.button>
              </form>

              {/* Info Section */}
              <div className="invite-info">
                <h3>Don't have an invite code?</h3>
                <p>
                  Invite codes are distributed to selected participants during our Alpha-100 program. 
                  Check your email or contact us to request access.
                </p>
                <div className="info-actions">
                  <a 
                    href="mailto:alpha@bizra.ai?subject=Alpha-100%20Access%20Request" 
                    className="btn btn-outline"
                  >
                    <Mail size={18} />
                    Request Access
                  </a>
                </div>
              </div>

              {/* Footer */}
              <div className="form-footer">
                <p>
                  Already have an account?{' '}
                  <Link href="/login">Sign in here</Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        .invite-info {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--invite-border, rgba(255, 255, 255, 0.1));
          text-align: center;
        }

        .invite-info h3 {
          color: var(--invite-text, #ffffff);
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .invite-info p {
          color: var(--invite-text-muted, rgba(255, 255, 255, 0.6));
          font-size: 0.875rem;
          margin: 0 0 1rem 0;
          line-height: 1.6;
        }

        .info-actions {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
        }

        .info-actions .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </>
  )
}

export default InviteIndexPage
