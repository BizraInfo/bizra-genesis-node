import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Particle Network Animation - Only on desktop
    const canvas = canvasRef.current;
    if (!canvas || window.innerWidth < 768) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();

    const particles: Array<{x: number, y: number, vx: number, vy: number, size: number}> = [];
    const numParticles = 30;

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1
      });
    }

    let animationId: number;
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(201, 169, 98, 0.3)';
        ctx.fill();

        particles.slice(i + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `rgba(201, 169, 98, ${0.1 * (1 - distance / 120)})`;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    }

    animate();
    window.addEventListener('resize', setCanvasSize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', setCanvasSize);
    };
  }, []);

  // Chart Data
  const inflationData = {
    labels: ['1971', '1980', '1990', '2000', '2010', '2020', '2024'],
    datasets: [
      {
        label: 'Fiat USD',
        data: [100, 25, 15, 12, 8, 5, 4],
        borderColor: 'rgba(138, 107, 46, 0.8)',
        backgroundColor: 'rgba(138, 107, 46, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'BIZRA',
        data: [100, 100, 100, 100, 100, 100, 100],
        borderColor: 'rgba(201, 169, 98, 1)',
        backgroundColor: 'rgba(201, 169, 98, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const flowerData = {
    labels: ['Treasury', 'Community', 'Liquidity'],
    datasets: [{
      data: [40, 35, 25],
      backgroundColor: ['rgba(201, 169, 98, 0.8)', 'rgba(42, 157, 143, 0.8)', 'rgba(248, 246, 241, 0.8)'],
      borderWidth: 0
    }]
  };

  const velocityData = {
    labels: ['Visa', 'PayPal', 'BTC', 'ETH', 'BIZRA'],
    datasets: [{
      label: 'TPS',
      data: [65000, 193, 7, 15, 1000000],
      backgroundColor: ['rgba(138, 107, 46, 0.6)', 'rgba(138, 107, 46, 0.6)', 'rgba(138, 107, 46, 0.6)', 'rgba(138, 107, 46, 0.6)', 'rgba(201, 169, 98, 0.9)'],
      borderRadius: 4
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: 'rgba(248, 246, 241, 0.7)', font: { size: 10 } } }
    },
    scales: {
      x: { ticks: { color: 'rgba(248, 246, 241, 0.6)', font: { size: 10 } }, grid: { color: 'rgba(248, 246, 241, 0.1)' } },
      y: { ticks: { color: 'rgba(248, 246, 241, 0.6)', font: { size: 10 } }, grid: { color: 'rgba(248, 246, 241, 0.1)' } }
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="page-wrapper">
      <Head>
        <title>BIZRA | Sovereign Monetary System</title>
        <meta name="description" content="The Golden Age of Digital Finance - Sovereign, Scarce, Instant" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { 
          background: #050B14;
          scroll-behavior: smooth;
        }
        body { 
          background: #050B14;
          color: #F8F6F1;
          font-family: 'Inter', -apple-system, sans-serif;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }
        .page-wrapper {
          min-height: 100vh;
          position: relative;
        }
        .gold-text { 
          background: linear-gradient(180deg, #F9F1D8, #C9A962); 
          -webkit-background-clip: text; 
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .glass { 
          background: rgba(10, 22, 40, 0.7); 
          backdrop-filter: blur(10px); 
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(201, 169, 98, 0.15);
        }
        .card {
          background: rgba(10, 22, 40, 0.5);
          border: 1px solid rgba(201, 169, 98, 0.1);
          border-radius: 16px;
          transition: all 0.3s ease;
        }
        .card:hover {
          border-color: rgba(201, 169, 98, 0.3);
          transform: translateY(-2px);
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .nav-link {
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          transition: color 0.2s;
          padding: 8px 0;
        }
        .nav-link:hover { color: #C9A962; }
        .section { padding: 80px 20px; }
        .section-alt { background: rgba(0,0,0,0.3); }
        .container { max-width: 1200px; margin: 0 auto; }
        .section-label {
          font-size: 11px;
          letter-spacing: 0.3em;
          color: #C9A962;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .section-title {
          font-size: clamp(1.8rem, 5vw, 3rem);
          font-family: 'Playfair Display', serif;
          font-weight: 400;
          margin-bottom: 16px;
        }
        .section-desc {
          color: rgba(255,255,255,0.5);
          max-width: 600px;
          margin-bottom: 40px;
          line-height: 1.7;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .section { padding: 60px 16px; }
        }
        @media (min-width: 769px) {
          .desktop-nav { display: flex !important; }
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>

      {/* Fixed Grid Background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(201, 169, 98, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201, 169, 98, 0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(5, 11, 20, 0.95)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="28" height="28" viewBox="0 0 100 100">
            <g stroke="#C9A962" strokeWidth="2" fill="none">
              <circle cx="50" cy="50" r="18" />
              <circle cx="50" cy="32" r="18" />
              <circle cx="65" cy="41" r="18" />
            </g>
          </svg>
          <span style={{ fontSize: '13px', letterSpacing: '0.2em', color: '#C9A962', fontWeight: 500 }}>BIZRA</span>
        </div>

        {/* Desktop Nav */}
        <div className="desktop-nav" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {['macro', 'allocation', 'velocity', 'guide', 'features', 'faq'].map(id => (
            <button key={id} onClick={() => scrollToSection(id)} className="nav-link">
              {id === 'guide' ? 'Guide' : id}
            </button>
          ))}
          <button onClick={() => scrollToSection('invite')} style={{ 
            background: '#C9A962', 
            border: 'none', 
            color: '#050B14', 
            padding: '10px 20px', 
            borderRadius: '20px', 
            cursor: 'pointer', 
            fontWeight: 600,
            fontSize: '12px',
            letterSpacing: '0.1em'
          }}>
            JOIN
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ 
            display: 'none',
            background: 'none', 
            border: 'none', 
            color: '#C9A962', 
            fontSize: '28px', 
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 11, 20, 0.98)',
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 24px',
          gap: '8px',
          overflowY: 'auto'
        }}>
          {['macro', 'allocation', 'velocity', 'guide', 'features', 'faq', 'invite'].map(id => (
            <button 
              key={id} 
              onClick={() => scrollToSection(id)} 
              style={{
                background: 'none',
                border: 'none',
                color: id === 'invite' ? '#C9A962' : 'rgba(255,255,255,0.8)',
                fontSize: '20px',
                textAlign: 'left',
                cursor: 'pointer',
                padding: '16px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                fontWeight: id === 'invite' ? 600 : 400
              }}
            >
              {id === 'guide' ? 'How It Works' : id === 'invite' ? '→ Request Invitation' : id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* HERO */}
      <section style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '120px 20px 80px', 
        position: 'relative', 
        textAlign: 'center' 
      }}>
        <canvas 
          ref={canvasRef} 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            opacity: 0.4, 
            pointerEvents: 'none' 
          }} 
        />
        
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '800px' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ 
              padding: '8px 16px', 
              border: '1px solid rgba(201, 169, 98, 0.3)', 
              borderRadius: '20px', 
              fontSize: '10px', 
              letterSpacing: '0.3em', 
              color: '#C9A962', 
              background: 'rgba(5, 11, 20, 0.8)' 
            }}>
              SYSTEM v2.0 LIVE
            </span>
          </div>

          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 10vw, 5rem)', 
            fontFamily: "'Playfair Display', serif", 
            marginBottom: '24px', 
            lineHeight: 1.1, 
            fontWeight: 400 
          }}>
            The <span className="gold-text" style={{ fontStyle: 'italic' }}>Golden Age</span><br />
            of Digital Finance
          </h1>

          <p style={{ 
            color: 'rgba(255,255,255,0.6)', 
            maxWidth: '500px', 
            margin: '0 auto 48px', 
            fontSize: 'clamp(14px, 4vw, 18px)', 
            lineHeight: 1.7 
          }}>
            The sovereign monetary system designed for the next era. Instant settlement, zero inflation, complete control.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(24px, 6vw, 48px)', flexWrap: 'wrap' }}>
            {[
              { value: '0.05s', label: 'Settlement' }, 
              { value: 'Zero', label: 'Inflation' }, 
              { value: '∞', label: 'Scale' }
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: 'clamp(24px, 6vw, 32px)', color: '#C9A962', fontFamily: "'Playfair Display', serif" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', marginTop: '4px', textTransform: 'uppercase' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div style={{ 
          position: 'absolute', 
          bottom: '40px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          animation: 'bounce 2s infinite',
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '24px', 
            height: '40px', 
            border: '2px solid rgba(201, 169, 98, 0.5)', 
            borderRadius: '12px', 
            display: 'flex', 
            justifyContent: 'center',
            margin: '0 auto'
          }}>
            <div style={{ 
              width: '4px', 
              height: '12px', 
              background: '#C9A962', 
              borderRadius: '2px', 
              marginTop: '8px', 
              animation: 'pulse 1.5s infinite' 
            }} />
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(201, 169, 98, 0.7)', marginTop: '8px', letterSpacing: '0.2em' }}>
            SCROLL
          </div>
        </div>
      </section>

      {/* MACRO */}
      <section id="macro" className="section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container">
          <div className="section-label">01 · Macro Analysis</div>
          <h2 className="section-title">
            The Erosion of <span style={{ color: '#C9A962', fontStyle: 'italic' }}>Value</span>
          </h2>
          <p className="section-desc">
            Since 1971, fiat currencies have lost 96%+ of purchasing power. BIZRA restores sound money through algorithmic scarcity.
          </p>
          <div className="glass" style={{ padding: 'clamp(16px, 4vw, 32px)', borderRadius: '16px' }}>
            <div style={{ height: 'clamp(250px, 40vw, 350px)' }}>
              <Line data={inflationData} options={chartOptions} />
            </div>
          </div>
        </div>
      </section>

      {/* ALLOCATION */}
      <section id="allocation" className="section section-alt" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container">
          <div className="section-label">02 · Tokenomics</div>
          <h2 className="section-title">
            The <span style={{ color: '#2A9D8F', fontStyle: 'italic' }}>Flower</span> of Allocation
          </h2>
          
          <div className="grid-2" style={{ alignItems: 'center', gap: '40px' }}>
            <div className="glass" style={{ 
              padding: 'clamp(24px, 5vw, 40px)', 
              borderRadius: '50%', 
              aspectRatio: '1', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              maxWidth: '320px',
              margin: '0 auto'
            }}>
              <div style={{ width: '100%', maxWidth: '220px', aspectRatio: '1' }}>
                <Doughnut 
                  data={flowerData} 
                  options={{ 
                    ...chartOptions, 
                    cutout: '65%', 
                    plugins: { legend: { display: false } } 
                  }} 
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { pct: '40%', name: 'Treasury', color: '#C9A962', desc: 'Algorithmic reserve backing stability' },
                { pct: '35%', name: 'Community', color: '#2A9D8F', desc: 'Validators, users, developers' },
                { pct: '25%', name: 'Liquidity', color: '#F8F6F1', desc: 'Instant settlement pool' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px', 
                    background: `${item.color}20`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 600, 
                    color: item.color, 
                    fontSize: '13px',
                    flexShrink: 0
                  }}>
                    {item.pct}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: item.color }}>{item.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* VELOCITY */}
      <section id="velocity" className="section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container">
          <div className="section-label">03 · Performance</div>
          <h2 className="section-title">
            Speed of <span style={{ color: '#C9A962', fontStyle: 'italic' }}>Light</span>
          </h2>
          <p className="section-desc">
            Legacy systems take days. Bitcoin takes minutes. BIZRA achieves finality in milliseconds.
          </p>
          
          <div className="grid-2" style={{ gap: '32px' }}>
            <div className="glass" style={{ padding: 'clamp(16px, 4vw, 24px)', borderRadius: '16px' }}>
              <div style={{ height: 'clamp(220px, 35vw, 280px)' }}>
                <Bar data={velocityData} options={chartOptions} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
              {[
                { value: '1,000,000', label: 'Transactions/second' }, 
                { value: '0.05s', label: 'Finality time' }, 
                { value: '$0.0001', label: 'Average fee' }
              ].map((stat, i) => (
                <div key={i} className="glass" style={{ padding: '20px', borderRadius: '12px' }}>
                  <div style={{ fontSize: 'clamp(20px, 5vw, 28px)', color: '#C9A962', fontFamily: "'Playfair Display', serif" }}>
                    {stat.value}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GUIDE / HOW IT WORKS */}
      <section id="guide" className="section section-alt" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div className="section-label">04 · Getting Started</div>
            <h2 className="section-title">
              How <span style={{ color: '#C9A962', fontStyle: 'italic' }}>BIZRA</span> Works
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { num: '01', title: 'Request an Invitation', desc: 'Join the Genesis queue. First 100 sovereign users shape the future.', icon: '📧' },
              { num: '02', title: 'Activate Your Wallet', desc: 'Secure activation link. Military-grade encrypted wallet.', icon: '🔐' },
              { num: '03', title: 'Acquire BIZRA', desc: 'Convert fiat or crypto. Instant settlement, zero slippage.', icon: '💰' },
              { num: '04', title: 'Transact Sovereignly', desc: 'Global transfers. No intermediaries, instant finality.', icon: '⚡' }
            ].map((step, i) => (
              <div key={i} className="card" style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '28px', flexShrink: 0 }}>{step.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#C9A962', fontSize: '11px', fontWeight: 600 }}>{step.num}</span>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', margin: 0 }}>{step.title}</h3>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div className="section-label">05 · Core Features</div>
            <h2 className="section-title">
              Built for <span style={{ color: '#2A9D8F', fontStyle: 'italic' }}>Sovereignty</span>
            </h2>
          </div>

          <div className="grid-3">
            {[
              { icon: '🔒', title: 'Self-Custody', desc: 'Your keys, your money. No freezes.' },
              { icon: '⚡', title: 'Instant Settlement', desc: '0.05 second finality.' },
              { icon: '🛡️', title: 'Zero Inflation', desc: 'Purchasing power preserved.' },
              { icon: '🌍', title: 'Global Access', desc: 'No borders or intermediaries.' },
              { icon: '📋', title: 'Transparent', desc: 'Immutable, verifiable ledger.' },
              { icon: '👥', title: 'Community Governed', desc: 'Consensus-based changes.' }
            ].map((feature, i) => (
              <div key={i} className="card" style={{ padding: '28px' }}>
                <div style={{ fontSize: '28px', marginBottom: '16px' }}>{feature.icon}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', marginBottom: '8px' }}>{feature.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section section-alt" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div className="section-label">06 · FAQ</div>
            <h2 className="section-title">
              Frequently <span style={{ color: '#C9A962', fontStyle: 'italic' }}>Asked</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { q: 'What is BIZRA?', a: 'A sovereign monetary system with algorithmic scarcity and instant settlement. Stable value, complete sovereignty.' },
              { q: 'How is it different from Bitcoin?', a: 'Bitcoin: 10+ min, high fees, volatile. BIZRA: 0.05s finality, 1M TPS, stable value.' },
              { q: 'Is my money safe?', a: 'Self-custody - you hold your keys. No one can access without your passphrase.' },
              { q: 'How do I start?', a: 'Request invitation → Activate wallet → Fund via bank/crypto → Transact instantly.' },
              { q: 'What is Genesis?', a: 'First 100 users get priority support, governance rights, and early access.' }
            ].map((faq, i) => (
              <div key={i} className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                <h3 style={{ fontWeight: 500, marginBottom: '12px', fontSize: '15px' }}>{faq.q}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="invite" className="section" style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container" style={{ maxWidth: '600px' }}>
          <h2 style={{ 
            fontSize: 'clamp(2rem, 8vw, 3.5rem)', 
            fontFamily: "'Playfair Display', serif", 
            marginBottom: '24px',
            fontWeight: 400
          }}>
            Join the <span className="gold-text">Genesis</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px', marginBottom: '40px', lineHeight: 1.6 }}>
            Be among the first 100 sovereign users.
          </p>
          <a href="/invite" style={{
            display: 'inline-block',
            padding: '18px 48px',
            background: '#C9A962',
            color: '#050B14',
            fontWeight: 600,
            borderRadius: '30px',
            textDecoration: 'none',
            fontSize: '16px',
            transition: 'all 0.3s ease'
          }}>
            Request Invitation
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
          © 2025 BIZRA. Sovereign Money for a Sovereign Future.
        </p>
      </footer>
    </div>
  );
}
