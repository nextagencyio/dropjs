'use client';

import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/api-auth';
import { CircleAlert, CircleCheck, ChevronLeft, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-gin-bg-layer rounded-gin-l p-10 border border-gin-border/60 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
        <div className="text-center mb-9">
          <div className="inline-flex items-center justify-center mb-5">
            <img src="/logo.png" alt="drop.js" width={72} height={99} className="drop-shadow-sm" />
          </div>
          <h1 className="text-[26px] font-bold text-gin-title tracking-tight leading-tight">drop.js</h1>
          <p className="text-sm mt-2 text-gin-text-light font-medium">Reset your password</p>
        </div>

        {submitted ? (
          <div>
            <div className="flex items-start gap-2.5 bg-[#f0fdf4] border border-gin-green/20 text-gin-green text-sm px-4 py-3.5 rounded-gin mb-6">
              <CircleCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>If an account with that email exists, a password reset token has been generated. Check the server logs for the token.</span>
            </div>
            <div className="text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] text-gin-primary font-medium hover:text-gin-primary-hover hover:underline transition-colors duration-200">
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to login
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-gin-danger/20 text-gin-danger text-sm px-4 py-3 rounded-gin mb-6">
                <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-sm mb-6 text-gin-text-light leading-relaxed">
              Enter your email address and we&apos;ll generate a password reset token for you.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-8">
                <label htmlFor="reset-email" className="block text-[13px] font-semibold text-gin-title mb-2">
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@example.com"
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
                  'Send reset token'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gin-border/50 text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] text-gin-primary font-medium hover:text-gin-primary-hover hover:underline transition-colors duration-200">
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
