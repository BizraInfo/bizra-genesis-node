/**
 * BIZRA Genesis Node - Login Page (Next.js)
 * Enterprise-grade authentication interface
 */

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // For demo, accept any email/password
    setTimeout(() => {
      localStorage.setItem('bizra-token', 'demo-token');
      void router.push('/dashboard');
      setIsLoading(false);
    }, 1000);
  };

  return (
    <>
      <Head>
        <title>Login | BIZRA</title>
        <meta name="description" content="Sign in to your BIZRA account" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@400;600&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background-color: #050B14; font-family: 'Inter', sans-serif; min-height: 100vh; }
      `}</style>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, #050B14 0%, #0A1628 100%);
          position: relative;
          overflow: hidden;
        }
        .bg-glow {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.15;
        }
        .bg-glow-1 { top: -200px; right: -200px; background: #C9A962; }
        .bg-glow-2 { bottom: -200px; left: -200px; background: #2A9D8F; }
        .login-card {
          background: rgba(10, 22, 40, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(201, 169, 98, 0.2);
          border-radius: 1.5rem;
          padding: 3rem;
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 10;
        }
        .logo-section { text-align: center; margin-bottom: 2rem; }
        .logo { width: 60px; height: 60px; margin: 0 auto 1rem; }
        .title { font-family: 'Playfair Display', serif; font-size: 1.75rem; color: white; margin-bottom: 0.5rem; }
        .subtitle { color: rgba(255, 255, 255, 0.5); font-size: 0.875rem; }
        .error-box {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          margin-bottom: 1.5rem;
          color: #EF4444;
          font-size: 0.875rem;
        }
        .form-group { margin-bottom: 1.5rem; }
        .form-label { display: block; color: rgba(255, 255, 255, 0.7); font-size: 0.875rem; margin-bottom: 0.5rem; }
        .input-wrapper { position: relative; }
        .form-input {
          width: 100%;
          padding: 0.875rem 1rem;
          padding-left: 2.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          color: white;
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        .form-input:focus { outline: none; border-color: #C9A962; background: rgba(255, 255, 255, 0.08); }
        .form-input::placeholder { color: rgba(255, 255, 255, 0.3); }
        .input-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: rgba(255, 255, 255, 0.4); }
        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
        }
        .btn-submit {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #C9A962 0%, #B08D45 100%);
          border: none;
          border-radius: 0.5rem;
          color: #050B14;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-submit:hover:not(:disabled) { box-shadow: 0 0 30px rgba(201, 169, 98, 0.4); transform: translateY(-2px); }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .footer-text { text-align: center; margin-top: 2rem; color: rgba(255, 255, 255, 0.5); font-size: 0.875rem; }
        .footer-text a { color: #C9A962; text-decoration: none; }
        .back-link { display: block; text-align: center; margin-top: 1.5rem; color: rgba(255, 255, 255, 0.4); font-size: 0.875rem; text-decoration: none; }
        .back-link:hover { color: #C9A962; }
      `}</style>

      <div className="login-page">
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
        <div className="login-card">
          <div className="logo-section">
            <svg className="logo" viewBox="0 0 100 100">
              <g stroke="#C9A962" strokeWidth="2" fill="none">
                <circle cx="50" cy="50" r="20" />
                <circle cx="50" cy="30" r="20" />
                <circle cx="67.3" cy="40" r="20" />
                <circle cx="67.3" cy="60" r="20" />
                <circle cx="50" cy="70" r="20" />
                <circle cx="32.7" cy="60" r="20" />
                <circle cx="32.7" cy="40" r="20" />
              </g>
            </svg>
            <h1 className="title">Welcome Back</h1>
            <p className="subtitle">Sign in to access your BIZRA account</p>
          </div>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input type="email" className="form-input" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="footer-text">Don't have an account? <Link href="/register">Create one</Link></p>
          <Link href="/" className="back-link">← Back to Home</Link>
        </div>
      </div>
    </>
  );
}
