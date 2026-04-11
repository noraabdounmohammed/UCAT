import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, BookOpen, BarChart3, Brain, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthBar } from '@/components/auth/AuthBar';

const MONTHLY_PRICE = '£9.99';
const MONTHLY_DISPLAY = '9.99';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!user) {
      // Send to app — AuthBar will prompt sign in
      navigate('/concept-practice?showAuth=true');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          plan: 'monthly',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const freePlanFeatures = [
    '20 AI-generated questions per day',
    'All UKMLA topics covered',
    'Instant explanations',
    'Basic progress tracking',
  ];

  const proPlanFeatures = [
    'Unlimited AI-generated questions',
    'All UKMLA topics + subtopics',
    'Instant explanations with clinical reasoning',
    'Full progress analytics & weak area detection',
    'Flashcard mode',
    'Mock exam mode',
    'Mobile app (iOS & Android)',
    'New features first',
  ];

  return (
    <div
      className="min-h-screen bg-stone-50"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div
          className="text-base font-bold tracking-tight text-stone-900"
          style={{ fontFamily: "'Unbounded', cursive" }}
        >
          StudyEdit
        </div>
        <AuthBar />
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-stone-500 mb-4">
          Pricing
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold text-stone-900 mb-6 leading-tight"
          style={{ fontFamily: "'Unbounded', cursive" }}
        >
          The question bank that
          <br />
          never runs out.
        </h1>
        <p className="text-lg text-stone-600 max-w-xl mx-auto">
          AI-powered UKMLA prep by StudyEdit. More questions than you'll ever need.
          Sharper explanations than any textbook.
        </p>

        {/* Comparison badge */}
        <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-stone-100 rounded-full text-sm text-stone-700">
          <span>Passmedicine charges £79/year for static questions.</span>
          <span className="font-semibold text-stone-900">Ours generate forever.</span>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 gap-6">

          {/* Free Plan */}
          <div className="bg-white border border-stone-200 rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-stone-500 mb-2">
                Free
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-stone-900">£0</span>
              </div>
              <p className="text-sm text-stone-500 mt-1">No credit card needed</p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {freePlanFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-stone-600">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate('/concept-practice')}
              className="w-full py-3 rounded-full border border-stone-300 text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
            >
              Start for free
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-stone-900 border border-stone-900 rounded-2xl p-8 flex flex-col relative overflow-hidden">
            {/* Subtle texture */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}
            />

            <div className="mb-6 relative">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold tracking-widest uppercase text-stone-400">
                  Student Pro
                </p>
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                  Most popular
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">{MONTHLY_PRICE}</span>
                <span className="text-stone-400 text-sm">/month</span>
              </div>
              <p className="text-sm text-stone-400 mt-1">
                Cancel anytime · No commitments
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8 relative">
              {proPlanFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-stone-300">{feature}</span>
                </li>
              ))}
            </ul>

            {error && (
              <p className="text-red-400 text-xs mb-3 text-center relative">{error}</p>
            )}

            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="relative w-full py-3.5 rounded-full bg-white text-stone-900 text-sm font-bold hover:bg-stone-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting checkout…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {user ? `Subscribe for ${MONTHLY_PRICE}/month` : 'Sign in to subscribe'}
                </>
              )}
            </button>

            <p className="text-xs text-stone-500 text-center mt-3 relative">
              Secure payment via Stripe · UK & EU students welcome
            </p>
          </div>
        </div>

        {/* Social proof / trust section */}
        <div className="mt-16 text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-8">
            Why StudyEdit
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Brain className="w-5 h-5" />,
                title: 'AI-generated, infinite supply',
                desc: 'Never see the same question twice. Our AI generates fresh UKMLA-style questions on demand.',
              },
              {
                icon: <BookOpen className="w-5 h-5" />,
                title: 'Clinical reasoning built in',
                desc: 'Every explanation teaches you to think, not just memorise. The way real consultants reason.',
              },
              {
                icon: <BarChart3 className="w-5 h-5" />,
                title: 'Tracks your weak spots',
                desc: 'Know exactly which topics to focus on. Stop wasting time on what you already know.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="text-left">
                <div className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center text-stone-600 mb-3">
                  {icon}
                </div>
                <h3 className="text-sm font-semibold text-stone-900 mb-1">{title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-6 text-center">
            FAQ
          </p>
          <div className="space-y-5 max-w-xl mx-auto">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. Cancel from your account settings and you keep access until the end of your billing period.',
              },
              {
                q: 'Is this better than Passmedicine?',
                a: 'Passmedicine has a fixed question bank. StudyEdit generates questions infinitely, adapts to your weak areas, and costs less.',
              },
              {
                q: 'Does the free tier require a card?',
                a: 'No. Sign up with your email, get 20 questions a day immediately — no card needed.',
              },
              {
                q: 'What exams does it cover?',
                a: 'Currently UKMLA. MRCP, MRCS, and PLAB are coming soon.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-stone-200 pb-5">
                <p className="text-sm font-semibold text-stone-900 mb-1">{q}</p>
                <p className="text-sm text-stone-500">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
