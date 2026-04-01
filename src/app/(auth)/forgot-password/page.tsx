'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CircleAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from '../_actions';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await requestPasswordReset(email);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-gin-bg-layer rounded-gin-l p-6 sm:p-10 border border-gin-border/60 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
        <div className="text-center mb-6 sm:mb-9">
          <div className="inline-flex items-center justify-center mb-3 sm:mb-5">
            <Image src="/logo.png" alt="drop.js" width={56} height={77} className="drop-shadow-sm sm:w-[72px] sm:h-[99px]" priority />
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-bold text-gin-title tracking-tight leading-tight">Reset password</h1>
          <p className="text-sm mt-1.5 sm:mt-2 text-gin-text-light font-medium">
            {sent ? 'Check your email' : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-gin-danger/20 text-gin-danger text-sm px-4 py-3 rounded-gin mb-6">
            <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-gin mb-6">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>If an account with that email exists, a reset link has been sent.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-6 sm:mb-8">
              <label htmlFor="email" className="block text-[13px] font-semibold text-gin-title mb-1.5 sm:mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="Enter your email"
                className="w-full rounded-gin-s px-3.5 py-2.5 text-sm text-gin-text border border-gin-border-form bg-gin-bg-layer placeholder:text-gin-text-light/60 focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gin-primary hover:bg-gin-primary-hover active:bg-gin-primary-active text-white py-3 rounded-gin font-semibold text-sm tracking-wide disabled:opacity-50 disabled:hover:bg-gin-primary transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Sending...
                </span>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-gin-primary hover:underline font-medium">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
