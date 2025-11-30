import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface InvitationForm {
  email: string;
  name: string;
  reason: string;
  experience: string;
}

export default function InvitePage() {
  const router = useRouter();
  const [form, setForm] = useState<InvitationForm>({
    email: '',
    name: '',
    reason: '',
    experience: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [spotsRemaining, setSpotsRemaining] = useState(47);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch queue status on mount
  useEffect(() => {
    const fetchQueueStatus = async () => {
      try {
        // In a real implementation, you'd have a GET endpoint for queue status
        // For now, we'll simulate it
        setSpotsRemaining(47); // This would come from API
      } catch (error) {
        console.error('Failed to fetch queue status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueueStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setSubmitStatus('error');
        // Could show specific error message from API
      }
    } catch (error) {
      console.error('Invitation submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <>
      <Head>
        <title>Request BIZRA Alpha Invitation</title>
        <meta name="description" content="Join the first 100 sovereign users of the BIZRA Genesis ecosystem" />
      </Head>

      <style jsx global>{`
        body {
          background: linear-gradient(135deg, #0A1828 0%, #050B14 50%, #0A1828 100%);
          color: #F8F6F1;
          font-family: 'Inter', sans-serif;
        }

        .glass-panel {
          background: rgba(10, 22, 40, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(201, 169, 98, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .gold-gradient-text {
          background: linear-gradient(to bottom, #F9F1D8, #C9A962);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .form-input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(201, 169, 98, 0.2);
          color: #F8F6F1;
          transition: all 0.3s ease;
        }

        .form-input:focus {
          border-color: #C9A962;
          box-shadow: 0 0 0 2px rgba(201, 169, 98, 0.1);
        }

        .form-input::placeholder {
          color: rgba(248, 246, 241, 0.5);
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/30 bg-slate-900/50 mb-6">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-xs uppercase tracking-widest text-yellow-400">Limited Access</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-serif text-white mb-4">
              Join the <span className="gold-gradient-text">Genesis</span>
            </h1>

            <p className="text-white/60 text-lg mb-6">
              Request an invitation to become one of the first 100 sovereign users of the BIZRA ecosystem.
            </p>

            <div className="flex justify-center items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-white/80">{spotsRemaining} spots remaining</span>
              </div>
              <div className="w-px h-4 bg-white/20"></div>
              <div className="text-yellow-400 font-semibold">
                {Math.round((53/100) * 100)}% filled
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="glass-panel rounded-2xl p-8">
            {submitStatus === 'success' ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-serif text-white mb-4">Invitation Requested!</h3>
                <p className="text-white/60 mb-6">
                  Your request has been submitted. We'll review your application and send an invitation if you're selected for the alpha program.
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-yellow-500 text-slate-900 font-semibold rounded-full hover:bg-yellow-400 transition-colors"
                >
                  Return to Homepage
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="form-input w-full px-4 py-3 rounded-lg focus:outline-none"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="form-input w-full px-4 py-3 rounded-lg focus:outline-none"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-white/80 mb-2">
                    Your Experience with DeFi/Crypto
                  </label>
                  <select
                    id="experience"
                    name="experience"
                    value={form.experience}
                    onChange={handleChange}
                    className="form-input w-full px-4 py-3 rounded-lg focus:outline-none"
                  >
                    <option value="">Select your experience level</option>
                    <option value="beginner">Beginner - New to crypto</option>
                    <option value="intermediate">Intermediate - Some DeFi experience</option>
                    <option value="advanced">Advanced - Active DeFi user</option>
                    <option value="expert">Expert - Builder/Developer</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-white/80 mb-2">
                    Why do you want to join BIZRA? *
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    required
                    value={form.reason}
                    onChange={handleChange}
                    rows={4}
                    className="form-input w-full px-4 py-3 rounded-lg focus:outline-none resize-none"
                    placeholder="Tell us about your interest in sovereign finance and what you hope to achieve with BIZRA..."
                  />
                </div>

                {submitStatus === 'error' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">
                      There was an error submitting your request. Please try again.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-yellow-500 text-slate-900 font-semibold rounded-full hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                      Submitting Request...
                    </>
                  ) : (
                    'Request Alpha Invitation'
                  )}
                </button>

                <p className="text-center text-white/40 text-sm">
                  By requesting an invitation, you agree to our terms of service and privacy policy.
                  We'll only use your information to evaluate your application for the alpha program.
                </p>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-white/40 text-sm">
              Questions? Contact us at{' '}
              <a href="mailto:alpha@bizra.com" className="text-yellow-400 hover:text-yellow-300">
                alpha@bizra.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}