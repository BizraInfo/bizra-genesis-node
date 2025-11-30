/**
 * BIZRA Genesis Node - Dashboard Page (Next.js)
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface MetricData {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('bizra-token');
    if (!token) {
      void router.push('/login');
      return;
    }
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('bizra-token');
    void router.push('/');
  };

  const metrics: MetricData[] = [
    { label: 'Total Balance', value: '$12,847.52', change: '+12.4%', positive: true },
    { label: 'Active Transactions', value: '1,284', change: '+8.2%', positive: true },
    { label: 'Settlement Speed', value: '0.05s', change: '-15%', positive: true },
    { label: 'Network Uptime', value: '99.99%', change: '0%', positive: true },
  ];

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#050B14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#C9A962', fontSize: '1.25rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard | BIZRA</title>
        <meta name="description" content="Your BIZRA dashboard" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@400;600&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background-color: #050B14; font-family: 'Inter', sans-serif; min-height: 100vh; }
      `}</style>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #050B14 0%, #0A1628 100%);
        }
        .header {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .logo { width: 40px; height: 40px; }
        .brand { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: white; }
        .nav-links {
          display: flex;
          gap: 2rem;
          list-style: none;
        }
        .nav-link {
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          font-size: 0.9rem;
          padding: 0.5rem 0;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .nav-link:hover, .nav-link.active {
          color: #C9A962;
          border-bottom-color: #C9A962;
        }
        .user-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .btn-logout {
          padding: 0.5rem 1.25rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          color: white;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-logout:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
        }
        .main {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        .welcome {
          margin-bottom: 2rem;
        }
        .welcome-title {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          color: white;
          margin-bottom: 0.5rem;
        }
        .welcome-subtitle {
          color: rgba(255, 255, 255, 0.5);
          font-size: 1rem;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .metric-card {
          background: rgba(10, 22, 40, 0.8);
          border: 1px solid rgba(201, 169, 98, 0.2);
          border-radius: 1rem;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }
        .metric-card:hover {
          border-color: rgba(201, 169, 98, 0.4);
          transform: translateY(-2px);
        }
        .metric-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }
        .metric-value {
          font-size: 2rem;
          font-weight: 600;
          color: white;
          margin-bottom: 0.5rem;
        }
        .metric-change {
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .metric-change.positive { color: #2A9D8F; }
        .metric-change.negative { color: #EF4444; }
        .content-section {
          background: rgba(10, 22, 40, 0.8);
          border: 1px solid rgba(201, 169, 98, 0.2);
          border-radius: 1rem;
          padding: 2rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .section-title {
          font-size: 1.25rem;
          color: white;
        }
        .placeholder-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
        }
        .placeholder-icon {
          width: 80px;
          height: 80px;
          margin-bottom: 1rem;
          opacity: 0.3;
        }
        .cta-button {
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #C9A962 0%, #B08D45 100%);
          border: none;
          border-radius: 0.5rem;
          color: #050B14;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .cta-button:hover {
          box-shadow: 0 0 30px rgba(201, 169, 98, 0.4);
          transform: translateY(-2px);
        }
      `}</style>

      <div className="dashboard">
        <header className="header">
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
            <span className="brand">BIZRA</span>
          </div>

          <nav>
            <ul className="nav-links">
              <li><span className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</span></li>
              <li><span className={`nav-link ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => setActiveTab('wallet')}>Wallet</span></li>
              <li><span className={`nav-link ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>Transactions</span></li>
              <li><span className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</span></li>
            </ul>
          </nav>

          <div className="user-section">
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <main className="main">
          <div className="welcome">
            <h1 className="welcome-title">Welcome to Genesis</h1>
            <p className="welcome-subtitle">Your sovereign financial dashboard</p>
          </div>

          <div className="metrics-grid">
            {metrics.map((metric, index) => (
              <div key={index} className="metric-card">
                <div className="metric-label">{metric.label}</div>
                <div className="metric-value">{metric.value}</div>
                <div className={`metric-change ${metric.positive ? 'positive' : 'negative'}`}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                    {metric.positive ? (
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                    ) : (
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    )}
                  </svg>
                  {metric.change}
                </div>
              </div>
            ))}
          </div>

          <div className="content-section">
            <div className="section-header">
              <h2 className="section-title">
                {activeTab === 'overview' && 'Account Overview'}
                {activeTab === 'wallet' && 'Your Wallet'}
                {activeTab === 'transactions' && 'Recent Transactions'}
                {activeTab === 'settings' && 'Account Settings'}
              </h2>
            </div>
            
            <div className="placeholder-content">
              <svg className="placeholder-icon" viewBox="0 0 100 100" fill="currentColor">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M35 50h30M50 35v30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <p>This section is under active development.</p>
              <p>The Genesis Node is being prepared for launch.</p>
              <button className="cta-button">
                Learn More About Genesis
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
