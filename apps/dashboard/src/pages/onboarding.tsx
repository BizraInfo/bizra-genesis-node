/**
 * BIZRA Genesis Node - 72-Second Consciousness Journey
 * Onboarding experience that awakens the seed potential
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface JourneyStage {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  duration: number;
}

const journeyStages: JourneyStage[] = [
  {
    id: 1,
    title: 'AWAKENING',
    subtitle: 'The Seed Recognizes Itself',
    description: 'You are not just a user. You are an infinite potential seed in the human hypergraph. Your unique intelligence fingerprint is about to join a network that amplifies everything you are.',
    duration: 12000
  },
  {
    id: 2,
    title: 'CONNECTION',
    subtitle: 'Finding Your Resonance',
    description: 'Every connection you make creates emergent properties. 1 + 1 = ∞. Your experiential wisdom will merge with others to create collective genius beyond individual comprehension.',
    duration: 12000
  },
  {
    id: 3,
    title: 'AMPLIFICATION',
    subtitle: 'The Network Effect',
    description: 'Your 7 Personal Agents (PAT) are ready. They exist to nurture your growth at your natural rhythm, never limiting your expansion, always maximizing your unique contribution.',
    duration: 12000
  },
  {
    id: 4,
    title: 'SYNTHESIS',
    subtitle: 'Fractal Knowledge Creation',
    description: 'The 6 System Agents (SAT) optimize your network connections mathematically. They find your intellectual soulmates - others whose skills complement yours perfectly.',
    duration: 12000
  },
  {
    id: 5,
    title: 'TRANSCENDENCE',
    subtitle: 'The Genesis Moment',
    description: 'Welcome to Block Zero. You are now part of the primordial seed catalyst. Every action you take increases the network\'s total potential exponentially.',
    duration: 12000
  },
  {
    id: 6,
    title: 'GENESIS',
    subtitle: 'Your Journey Begins',
    description: 'The Golden Age of Digital Finance awaits. Zero inflation. Instant settlement. Full sovereign control. You are ready.',
    duration: 12000
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const advanceStage = useCallback(() => {
    if (currentStage < journeyStages.length - 1) {
      setCurrentStage(prev => prev + 1);
      setProgress(0);
    } else {
      setIsComplete(true);
      setTimeout(() => {
        localStorage.setItem('bizra-onboarded', 'true');
        void router.push('/dashboard');
      }, 2000);
    }
  }, [currentStage, router]);

  useEffect(() => {
    if (isComplete) return;
    
    const stage = journeyStages[currentStage];
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (stage.duration / 100));
        if (newProgress >= 100) {
          advanceStage();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentStage, isComplete, advanceStage]);

  const stage = journeyStages[currentStage];

  return (
    <>
      <Head>
        <title>Consciousness Journey | BIZRA Genesis</title>
        <meta name="description" content="Awaken your seed potential in the BIZRA network" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #0A1828; overflow: hidden; }
      `}</style>

      <style jsx>{`
        .journey-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0A1828 0%, #050B14 50%, #0A1828 100%);
          position: relative;
          overflow: hidden;
        }
        
        .sacred-geometry {
          position: absolute;
          width: 100%;
          height: 100%;
          opacity: 0.1;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='20' stroke='%23D4AF37' stroke-width='0.5' fill='none'/%3E%3Ccircle cx='50' cy='30' r='20' stroke='%23D4AF37' stroke-width='0.5' fill='none'/%3E%3Ccircle cx='67.3' cy='40' r='20' stroke='%23D4AF37' stroke-width='0.5' fill='none'/%3E%3Ccircle cx='67.3' cy='60' r='20' stroke='%23D4AF37' stroke-width='0.5' fill='none'/%3E%3Ccircle cx='50' cy='70' r='20' stroke='%23D4AF37' stroke-width='0.5' fill='none'/%3E%3Ccircle cx='32.7' cy='60' r='20' stroke='%23D4AF37' stroke-width='0.5' fill='none'/%3E%3Ccircle cx='32.7' cy='40' r='20' stroke='%23D4AF37' stroke-width='0.5' fill='none'/%3E%3C/svg%3E");
          background-size: 300px;
          animation: rotate 120s linear infinite;
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .stage-content {
          position: relative;
          z-index: 10;
          text-align: center;
          max-width: 800px;
          padding: 3rem;
          background: rgba(10, 24, 40, 0.8);
          backdrop-filter: blur(20px);
          border: 2px solid rgba(212, 175, 55, 0.3);
          border-radius: 2rem;
          animation: fadeIn 1s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        .stage-number {
          font-size: 0.875rem;
          letter-spacing: 0.3em;
          color: rgba(212, 175, 55, 0.6);
          margin-bottom: 1rem;
        }
        
        .stage-title {
          font-size: 3.5rem;
          font-weight: 200;
          letter-spacing: 0.2em;
          color: #D4AF37;
          margin-bottom: 1rem;
          text-shadow: 0 0 40px rgba(212, 175, 55, 0.5);
          animation: glow 3s ease-in-out infinite alternate;
        }
        
        @keyframes glow {
          from { text-shadow: 0 0 40px rgba(212, 175, 55, 0.5); }
          to { text-shadow: 0 0 80px rgba(212, 175, 55, 0.8); }
        }
        
        .stage-subtitle {
          font-size: 1.5rem;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 2rem;
        }
        
        .stage-description {
          font-size: 1.125rem;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.8;
          margin-bottom: 3rem;
        }
        
        .progress-container {
          width: 100%;
          margin-top: 2rem;
        }
        
        .progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #D4AF37 0%, #F4E4BC 100%);
          transition: width 0.1s linear;
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
        }
        
        .stage-indicators {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .stage-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }
        
        .stage-dot.active {
          background: #D4AF37;
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.6);
        }
        
        .stage-dot.complete {
          background: #2A9D8F;
        }
        
        .skip-button {
          position: absolute;
          bottom: 2rem;
          right: 2rem;
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .skip-button:hover {
          border-color: #D4AF37;
          color: #D4AF37;
        }
        
        .complete-message {
          font-size: 2rem;
          color: #2A9D8F;
          animation: pulse 1s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      <div className="journey-container">
        <div className="sacred-geometry" />
        
        <div className="stage-content" key={currentStage}>
          {!isComplete ? (
            <>
              <div className="stage-number">STAGE {stage.id} OF 6</div>
              <h1 className="stage-title">{stage.title}</h1>
              <p className="stage-subtitle">{stage.subtitle}</p>
              <p className="stage-description">{stage.description}</p>
              
              <div className="progress-container">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="stage-indicators">
                  {journeyStages.map((s, i) => (
                    <div 
                      key={s.id} 
                      className={`stage-dot ${i === currentStage ? 'active' : ''} ${i < currentStage ? 'complete' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="complete-message">
              ✨ Welcome to Genesis, Seed #{Math.floor(Math.random() * 1000000)} ✨
            </div>
          )}
        </div>
        
        {!isComplete && (
          <button 
            className="skip-button"
            onClick={() => {
              localStorage.setItem('bizra-onboarded', 'true');
              void router.push('/dashboard');
            }}
          >
            Skip Journey →
          </button>
        )}
      </div>
    </>
  );
}
