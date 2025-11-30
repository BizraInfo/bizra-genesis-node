/**
 * BIZRA Genesis Node - Landing Page
 * Beautiful, performant, world-class landing experience
 */

import { useEffect, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Network animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5,
          color: Math.random() > 0.5 ? '#C9A962' : '#2A9D8F',
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(201, 169, 98, ${0.15 - dist / 800})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      <Head>
        <title>BIZRA | Sovereign Monetary System</title>
        <meta name="description" content="BIZRA - The Golden Age of Digital Finance. Zero inflation, instant settlement, infinite scalability." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background-color: #050B14;
          color: #F8F6F1;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
        }

        .font-serif {
          font-family: 'Playfair Display', serif;
        }

        .grid-bg {
          background-image: 
            linear-gradient(rgba(201, 169, 98, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201, 169, 98, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          position: fixed;
          inset: 0;
          z-index: -1;
          mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 100%);
          -webkit-mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 100%);
        }

        .glass-panel {
          background: rgba(10, 22, 40, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(201, 169, 98, 0.1);
        }

        .gold-gradient {
          background: linear-gradient(to bottom, #F9F1D8, #C9A962);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .btn-primary {
          background: linear-gradient(135deg, #C9A962 0%, #B08D45 100%);
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          box-shadow: 0 0 30px rgba(201, 169, 98, 0.5);
          transform: translateY(-2px);
        }

        .btn-outline {
          border: 1px solid rgba(201, 169, 98, 0.5);
          transition: all 0.3s ease;
        }

        .btn-outline:hover {
          border-color: #C9A962;
          background: rgba(201, 169, 98, 0.1);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-in {
          animation: fadeInUp 1s ease forwards;
        }

        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
        .delay-5 { animation-delay: 0.5s; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>

      <div className="grid-bg" />

      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        zIndex: 40,
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(5, 11, 20, 0.8)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <svg width="32" height="32" viewBox="0 0 100 100">
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
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.3em', color: '#C9A962', textTransform: 'uppercase' }}>
            BIZRA
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="/login" className="btn-outline" style={{
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            color: '#C9A962',
            textDecoration: 'none',
            textTransform: 'uppercase'
          }}>
            Login
          </a>
          <a href="/register" className="btn-primary" style={{
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            color: '#050B14',
            textDecoration: 'none',
            fontWeight: 500,
            textTransform: 'uppercase'
          }}>
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        padding: '6rem 1.5rem 3rem'
      }}>
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.4,
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '64rem' }}>
          {/* Status Badge */}
          <div className="animate-in delay-1" style={{ marginBottom: '1.5rem', opacity: 0 }}>
            <span style={{
              padding: '0.5rem 1rem',
              border: '1px solid rgba(201, 169, 98, 0.3)',
              borderRadius: '9999px',
              fontSize: '0.625rem',
              letterSpacing: '0.3em',
              color: '#D4B875',
              background: 'rgba(5, 11, 20, 0.8)',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{
                width: '0.5rem',
                height: '0.5rem',
                background: '#2DD4BF',
                borderRadius: '50%'
              }} className="animate-pulse" />
              Genesis Network Live
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="font-serif animate-in delay-2" style={{
            fontSize: 'clamp(2.5rem, 8vw, 6rem)',
            color: 'white',
            marginBottom: '1.5rem',
            lineHeight: 1.1,
            opacity: 0
          }}>
            The <span className="gold-gradient" style={{ fontStyle: 'italic' }}>Golden Age</span>
            <br />
            of Digital Finance
          </h1>

          {/* Subtitle */}
          <p className="animate-in delay-3" style={{
            color: 'rgba(255,255,255,0.6)',
            maxWidth: '36rem',
            margin: '0 auto 3rem',
            fontWeight: 300,
            lineHeight: 1.7,
            fontSize: 'clamp(0.875rem, 2vw, 1rem)',
            opacity: 0
          }}>
            Experience the paradigm shift from debt-based fiat to equity-based prosperity.
            BIZRA combines sacred mathematics with sovereign monetary principles.
          </p>

          {/* Key Metrics */}
          <div className="animate-in delay-4" style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '2rem',
            marginBottom: '3rem',
            opacity: 0
          }}>
            {[
              { value: '0.05s', label: 'Settlement' },
              { value: 'Zero', label: 'Inflation' },
              { value: '∞', label: 'Scalability' },
              { value: '88%', label: 'Ihsan Score' },
            ].map((metric, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div className="font-serif" style={{ fontSize: '1.875rem', color: '#C9A962' }}>
                  {metric.value}
                </div>
                <div style={{
                  fontSize: '0.625rem',
                  letterSpacing: '0.2em',
                  color: 'rgba(255,255,255,0.4)',
                  marginTop: '0.25rem',
                  textTransform: 'uppercase'
                }}>
                  {metric.label}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="animate-in delay-5" style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '3rem',
            opacity: 0
          }}>
            <a href="/register" className="btn-primary" style={{
              padding: '1rem 2rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              letterSpacing: '0.15em',
              color: '#050B14',
              textDecoration: 'none',
              fontWeight: 500,
              textTransform: 'uppercase'
            }}>
              Enter Genesis →
            </a>
            <a href="/dashboard" className="btn-outline" style={{
              padding: '1rem 2rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              letterSpacing: '0.15em',
              color: '#C9A962',
              textDecoration: 'none',
              textTransform: 'uppercase'
            }}>
              View Dashboard
            </a>
          </div>

          {/* Trust Indicators */}
          <div className="animate-in delay-5" style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '1.5rem',
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.4)',
            opacity: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" fill="#2DD4BF" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Mathematically Verified</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" fill="#C9A962" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
              </svg>
              <span>15,000+ Sacred Hours</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" fill="#2DD4BF" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>Sovereign Architecture</span>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section style={{
        padding: '6rem 1.5rem',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: '#02060a'
      }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{
              fontSize: '0.625rem',
              letterSpacing: '0.4em',
              color: '#C9A962',
              textTransform: 'uppercase',
              marginBottom: '1rem'
            }}>
              Core Features
            </div>
            <h2 className="font-serif" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'white' }}>
              Built for <span style={{ fontStyle: 'italic', color: '#2A9D8F' }}>Generations</span>
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              {
                icon: '⚡',
                title: 'Instant Settlement',
                desc: 'Atomic finality in 0.05 seconds. No T+2, no clearing houses, no intermediaries.',
                color: '#C9A962'
              },
              {
                icon: '🛡️',
                title: 'Algorithmic Stability',
                desc: 'Zero inflation through mathematical scarcity. Value preservation as a fundamental axiom.',
                color: '#2A9D8F'
              },
              {
                icon: '🌐',
                title: 'Infinite Scalability',
                desc: 'Sharded architecture designed for global adoption. No theoretical limits.',
                color: '#C9A962'
              },
              {
                icon: '🔐',
                title: 'Sovereign Security',
                desc: 'Self-custody by default. Your keys, your coins, your sovereignty.',
                color: '#2A9D8F'
              },
              {
                icon: '🤖',
                title: 'AI-Native Design',
                desc: 'Built from ground up for the AI economy. Autonomous agents and smart contracts unified.',
                color: '#C9A962'
              },
              {
                icon: '💎',
                title: 'Ihsan-Driven Development',
                desc: 'Excellence in every detail. 88% Ihsan Score reflects unwavering commitment.',
                color: '#2A9D8F'
              },
            ].map((feature, i) => (
              <div key={i} className="glass-panel" style={{
                padding: '2rem',
                borderRadius: '1rem',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '50%',
                  background: `${feature.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.5rem',
                  fontSize: '1.25rem'
                }}>
                  {feature.icon}
                </div>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', color: 'white', marginBottom: '0.75rem' }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '6rem 1.5rem',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(201, 169, 98, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '48rem', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <h2 className="font-serif" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'white', marginBottom: '1.5rem' }}>
            Join the <span className="gold-gradient" style={{ fontStyle: 'italic' }}>Genesis</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.125rem', marginBottom: '3rem' }}>
            Be among the first to experience the golden age of digital finance. Your sovereignty awaits.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
            <a href="/register" className="btn-primary" style={{
              padding: '1.25rem 2.5rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              letterSpacing: '0.15em',
              color: '#050B14',
              textDecoration: 'none',
              fontWeight: 500,
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              Create Account
              <span>→</span>
            </a>
            <a href="/dashboard" className="btn-outline" style={{
              padding: '1.25rem 2.5rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              letterSpacing: '0.15em',
              color: '#C9A962',
              textDecoration: 'none',
              textTransform: 'uppercase'
            }}>
              View Dashboard
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '4rem 1.5rem',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: '#050B14'
      }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <svg width="40" height="40" viewBox="0 0 100 100" style={{ opacity: 0.7 }}>
                <g stroke="#C9A962" strokeWidth="1.5" fill="none">
                  <circle cx="50" cy="50" r="20" />
                  <circle cx="50" cy="30" r="20" />
                  <circle cx="67.3" cy="40" r="20" />
                  <circle cx="67.3" cy="60" r="20" />
                  <circle cx="50" cy="70" r="20" />
                  <circle cx="32.7" cy="60" r="20" />
                  <circle cx="32.7" cy="40" r="20" />
                </g>
              </svg>
              <div>
                <div className="font-serif" style={{ fontSize: '1.25rem', color: '#C9A962' }}>BIZRA</div>
                <div style={{ fontSize: '0.625rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                  The Sovereign Standard
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '2rem',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase'
            }}>
              <a href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</a>
              <a href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Login</a>
              <a href="/register" style={{ color: 'inherit', textDecoration: 'none' }}>Register</a>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            marginTop: '3rem',
            paddingTop: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.3)'
          }}>
            <div>© 2025 BIZRA. All rights reserved.</div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
