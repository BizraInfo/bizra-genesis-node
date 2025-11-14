// BIZRA Genesis Node - Onboarding Wizard

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function OnboardingWizard() {
  const { currentStep, finishOnboarding, isComplete } = useOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    if (isComplete) {
      navigate('/dashboard', { replace: true });
    }
  }, [isComplete, navigate]);

  const handleFinish = () => {
    finishOnboarding();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-block w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to BIZRA!</h1>
          <p className="text-gray-600 mt-2">Let's get you started with AI model integration</p>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick Start Guide</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <span>Connect to AI model providers (Ollama, OpenAI, Anthropic)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <span>Configure Thompson Sampling for adaptive routing</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <span>Set up A/B testing for model comparison</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <span>Monitor costs and performance in real-time</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleFinish}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition flex items-center justify-center"
          >
            Get Started
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
