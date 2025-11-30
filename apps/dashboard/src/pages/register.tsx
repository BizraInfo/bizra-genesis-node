/**
 * BIZRA Genesis Node - Register Page (Next.js)
 */

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate registration
    setTimeout(() => {
      localStorage.setItem('bizra-token', 'demo-token');
      void router.push('/dashboard');
      setIsLoading(false);
    }, 1000);
  };

  return (
    <>
      <Head>
        <title>Register | BIZRA</title>
        <meta name="description" content="Create your BIZRA account" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@400;600&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background-color: #050B14; font-family: 'Inter', sans-serif; min-height: 100vh; }
      `}</style>

      <style jsx>{`
        .register-page {
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
        .bg-glow-1 { top: -200px; left: -200px; background: #2A9D8F; }
        .bg-glow-2 { bottom: -200px; right: -200px; background: #C9A962; }
        .register-card {
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
        .form-group { margin-bottom: 1.5rem; }
        .form-label { display: block; color: rgba(255, 255, 255, 0.7); font-size: 0.875rem; margin-bottom: 0.5rem; }
        .form-input {
          width: 100%;
          padding: 0.875rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          color: white;
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        .form-input:focus { outline: none; border-color: #C9A962; background: rgba(255, 255, 255, 0.08); }
        .form-input::placeholder { color: rgba(255, 255, 255, 0.3); }
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
        .benefits { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); }
        .benefit { display: flex; align-items: center; gap: 0.75rem; color: rgba(255,255,255,0.6); font-size: 0.875rem; margin-bottom: 0.75rem; }
        .benefit svg { color: #2A9D8F; flex-shrink: 0; }
      `}</style>

      <div className="register-page">
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
        <div className="register-card">
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
            <h1 className="title">Join the Genesis</h1>
            <p className="subtitle">Create your BIZRA account today</p>
          </div>

          {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#EF4444', fontSize: '0.875rem' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="benefits">
            <div className="benefit">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              Zero inflation monetary system
            </div>
            <div className="benefit">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              Instant settlement in 0.05s
            </div>
            <div className="benefit">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              Full sovereign control
            </div>
          </div>

          <p className="footer-text">Already have an account? <Link href="/login">Sign in</Link></p>
          <Link href="/" className="back-link">← Back to Home</Link>
        </div>
      </div>
    </>
  );
}
