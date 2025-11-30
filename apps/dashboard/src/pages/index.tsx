import { useEffect, useRef } from 'react';
import Head from 'next/head';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Particle Network Animation
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{x: number, y: number, vx: number, vy: number, size: number}> = [];
    const numParticles = 50;

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1
      });
    }

    function animate() {
      if (!ctx || !canvas) {
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -1;
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy *= -1;
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(201, 169, 98, 0.3)';
        ctx.fill();

        // Draw connections
        particles.slice(i + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `rgba(201, 169, 98, ${0.1 * (1 - distance / 100)})`;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    }

    animate();

    // GSAP Animations
    gsap.from('.reveal-hero', {
      opacity: 0,
      y: 30,
      duration: 1,
      stagger: 0.2,
      ease: 'power2.out'
    });

    gsap.utils.toArray('.glass-panel').forEach((panel: any) => {
      gsap.from(panel, {
        opacity: 0,
        y: 50,
        duration: 1,
        scrollTrigger: {
          trigger: panel,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse'
        }
      });
    });

    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Chart Data
  const inflationData = {
    labels: ['1971', '1980', '1990', '2000', '2010', '2020', '2024'],
    datasets: [
      {
        label: 'Fiat USD Purchasing Power',
        data: [100, 25, 15, 12, 8, 5, 4],
        borderColor: 'rgba(138, 107, 46, 0.8)',
        backgroundColor: 'rgba(138, 107, 46, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'BIZRA Stable Value',
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
      backgroundColor: [
        'rgba(201, 169, 98, 0.8)',
        'rgba(42, 157, 143, 0.8)',
        'rgba(248, 246, 241, 0.8)'
      ],
      borderWidth: 0
    }]
  };

  const velocityData = {
    labels: ['Visa', 'PayPal', 'Bitcoin', 'Ethereum', 'BIZRA'],
    datasets: [{
      label: 'Transactions Per Second',
      data: [65000, 193, 7, 15, 1000000],
      backgroundColor: [
        'rgba(138, 107, 46, 0.6)',
        'rgba(138, 107, 46, 0.6)',
        'rgba(138, 107, 46, 0.6)',
        'rgba(138, 107, 46, 0.6)',
        'rgba(201, 169, 98, 0.9)'
      ],
      borderRadius: 4
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'rgba(248, 246, 241, 0.7)',
          font: { size: 12 }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: 'rgba(248, 246, 241, 0.6)' },
        grid: { color: 'rgba(248, 246, 241, 0.1)' }
      },
      y: {
        ticks: { color: 'rgba(248, 246, 241, 0.6)' },
        grid: { color: 'rgba(248, 246, 241, 0.1)' }
      }
    }
  };

  return (
    <>
      <Head>
        <title>BIZRA | Sovereign Monetary System</title>
        <meta name="description" content="The Golden Age of Digital Finance - Sovereign, Scarce, Instant" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@200;300;400;500;600&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        html, body {
          background-color: #050B14;
          color: #F8F6F1;
          overflow-x: hidden;
          overflow-y: auto;
          font-family: 'Inter', sans-serif;
          height: auto;
          min-height: 100vh;
          scroll-behavior: smooth;
        }

        #__next {
          min-height: 100vh;
        }

        /* Ensure sections stack properly */
        section, header {
          position: relative;
          z-index: 10;
        }

        /* Smooth scrolling for anchor links */
        html {
          scroll-behavior: smooth;
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
        }

        .noise-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=');
          opacity: 0.4;
          pointer-events: none;
          z-index: 50;
        }

        .glass-panel {
          background: rgba(10, 22, 40, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(201, 169, 98, 0.1);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        }

        .gold-gradient-text {
          background: linear-gradient(to bottom, #F9F1D8, #C9A962);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .section-number {
          font-family: 'Playfair Display', serif;
          -webkit-text-stroke: 1px rgba(201, 169, 98, 0.3);
          color: transparent;
        }
      `}</style>

      <div className="grid-bg"></div>
      <div className="noise-overlay"></div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-40 px-8 py-6 flex justify-between items-center mix-blend-difference border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <svg width="24" height="24" viewBox="0 0 100 100" className="opacity-80">
            <g stroke="#C9A962" strokeWidth="2" fill="none">
              <circle cx="50" cy="50" r="20" />
              <circle cx="50" cy="30" r="20" />
              <circle cx="67.3" cy="40" r="20" />
              <circle cx="50" cy="70" r="20" />
              <circle cx="32.7" cy="40" r="20" />
            </g>
          </svg>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500">BIZRA Sovereign Dashboard</div>
        </div>
        <div className="hidden md:flex gap-8 text-[10px] uppercase tracking-[0.2em] text-white/50">
          <a href="#macro" className="hover:text-yellow-400 transition-colors cursor-pointer">Macro</a>
          <a href="#allocation" className="hover:text-yellow-400 transition-colors cursor-pointer">Allocation</a>
          <a href="#velocity" className="hover:text-yellow-400 transition-colors cursor-pointer">Velocity</a>
          <a href="#invite" className="hover:text-yellow-400 transition-colors cursor-pointer">Join</a>
        </div>
      </nav>

      {/* SECTION 1: HERO */}
      <header className="min-h-screen flex flex-col justify-center items-center relative px-6">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 opacity-40 pointer-events-none" />

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-yellow-500/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-yellow-500 rounded-full mt-2 animate-pulse"></div>
          </div>
          <div className="text-yellow-500/70 text-xs mt-2 uppercase tracking-widest">Scroll</div>
        </div>

        <div className="relative z-10 text-center max-w-5xl">
          <div className="mb-6 opacity-0 reveal-hero">
            <span className="px-3 py-1 border border-yellow-500/30 rounded-full text-[10px] uppercase tracking-[0.3em] text-yellow-400 bg-slate-900/80">
              System v2.0 Live
            </span>
          </div>

          <h1 className="text-5xl md:text-8xl font-serif text-white mb-6 leading-[1.1] opacity-0 reveal-hero">
            The <span className="gold-gradient-text italic">Golden Age</span><br />
            of Digital Finance
          </h1>

          <p className="text-white/60 max-w-xl mx-auto font-light leading-relaxed mb-12 opacity-0 reveal-hero">
            We are visualizing the transition from debt-based fiat currency to the BIZRA equity-based ecosystem. Observe the data.
          </p>

          <div className="flex justify-center gap-12 opacity-0 reveal-hero">
            <div className="text-center">
              <div className="text-3xl text-yellow-500 font-serif">0.05s</div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Settlement</div>
            </div>
            <div className="w-px h-12 bg-white/10"></div>
            <div className="text-center">
              <div className="text-3xl text-yellow-500 font-serif">Zero</div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Inflation</div>
            </div>
            <div className="w-px h-12 bg-white/10"></div>
            <div className="text-center">
              <div className="text-3xl text-yellow-500 font-serif">∞</div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Scalability</div>
            </div>
          </div>
        </div>
      </header>

      {/* SECTION 2: MACRO ECONOMICS */}
      <section id="macro" className="py-32 px-6 md:px-24 border-t border-white/5 relative">
        <div className="absolute top-10 left-10 text-9xl section-number opacity-10 pointer-events-none">01</div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-4">
            <h2 className="text-yellow-500 text-xs tracking-[0.4em] uppercase mb-4">Macro Analysis</h2>
            <h3 className="text-4xl md:text-5xl font-serif text-white mb-6">
              The Erosion of <span className="italic text-yellow-400">Value</span>
            </h3>
            <p className="text-white/50 leading-relaxed mb-8">
              Since the decoupling from gold in 1971, fiat currencies have lost over 96% of their purchasing power. BIZRA restores the "Gold Standard" through algorithmic scarcity.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-white">BIZRA (Stable)</span>
            </div>
            <div className="flex items-center gap-4 text-sm mt-2">
              <div className="w-3 h-3 bg-slate-800 border border-white/20 rounded-full"></div>
              <span className="text-white/60">Fiat USD (Decaying)</span>
            </div>
          </div>

          <div className="lg:col-span-8 glass-panel p-8 rounded-2xl">
            <div className="h-96">
              <Line data={inflationData} options={chartOptions} />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: TOKENOMICS */}
      <section id="allocation" className="py-32 px-6 md:px-24 border-t border-white/5 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-10 right-10 text-9xl section-number opacity-10 pointer-events-none text-right">02</div>

        <div className="text-center mb-20">
          <h2 className="text-yellow-500 text-xs tracking-[0.4em] uppercase mb-4">Ecosystem Distribution</h2>
          <h3 className="text-4xl md:text-5xl font-serif text-white">
            The <span className="italic text-teal-400">Flower</span> of Allocation
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div className="glass-panel p-8 rounded-full aspect-square flex items-center justify-center relative shadow-[0_0_100px_rgba(201,169,98,0.1)]">
            <div className="h-96 relative z-10">
              <Doughnut
                data={flowerData}
                options={{
                  ...chartOptions,
                  cutout: '70%',
                  plugins: {
                    legend: { display: false }
                  }
                }}
              />
            </div>
            <div className="absolute inset-0 border border-yellow-500/10 rounded-full scale-90"></div>
            <div className="absolute inset-0 border border-yellow-500/5 rounded-full scale-75"></div>
          </div>

          <div className="space-y-8 pl-0 lg:pl-12">
            <div className="group cursor-pointer">
              <div className="text-yellow-400 text-3xl font-serif mb-1 group-hover:translate-x-2 transition-transform">40% Treasury</div>
              <p className="text-white/40 text-sm">Locked in the algorithmic reserve to back value stability. The "Root" of the system.</p>
            </div>
            <div className="group cursor-pointer">
              <div className="text-teal-400 text-3xl font-serif mb-1 group-hover:translate-x-2 transition-transform">35% Community</div>
              <p className="text-white/40 text-sm">Distributed to validators, users, and developers. The "Petals" of the system.</p>
            </div>
            <div className="group cursor-pointer">
              <div className="text-white text-3xl font-serif mb-1 group-hover:translate-x-2 transition-transform">25% Liquidity</div>
              <p className="text-white/40 text-sm">Always available for instant settlement. The "Nectar" of the system.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: VELOCITY & EFFICIENCY */}
      <section id="velocity" className="py-32 px-6 md:px-24 border-t border-white/5 relative">
        <div className="absolute top-10 left-10 text-9xl section-number opacity-10 pointer-events-none">03</div>

        <div className="max-w-6xl mx-auto">
          <h2 className="text-yellow-500 text-xs tracking-[0.4em] uppercase mb-12">System Efficiency</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="glass-panel p-8 rounded-2xl">
              <h4 className="text-white font-serif text-xl mb-6">Transaction Velocity (TPS)</h4>
              <div className="h-80">
                <Bar data={velocityData} options={chartOptions} />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <h3 className="text-4xl font-serif text-white mb-6">
                Speed of <span className="italic text-yellow-400">Light</span>
              </h3>
              <p className="text-white/50 mb-8 leading-relaxed">
                Legacy systems rely on batch processing and clearing houses (T+2 days). BIZRA utilizes atomic settlement on a sharded ledger, achieving finality in milliseconds.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-white/10 rounded bg-white/5">
                  <div className="text-yellow-500 text-2xl font-serif">1,000,000</div>
                  <div className="text-white/60 text-sm">BIZRA TPS</div>
                </div>
                <div className="p-4 border border-white/10 rounded bg-white/5">
                  <div className="text-yellow-500 text-2xl font-serif">0.05s</div>
                  <div className="text-white/60 text-sm">Finality Time</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="invite" className="py-32 px-6 md:px-24 border-t border-white/5 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-serif text-white mb-8">
            Join the <span className="gold-gradient-text">Genesis</span>
          </h2>
          <p className="text-white/50 text-xl mb-12 leading-relaxed">
            Be among the first 100 sovereign users to experience the future of money.
          </p>
          <a
            href="/invite"
            className="inline-block px-8 py-4 bg-yellow-500 text-slate-900 font-semibold rounded-full hover:bg-yellow-400 transition-colors"
          >
            Request Invitation
          </a>
        </div>
      </section>
    </>
  );
}
