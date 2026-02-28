'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { register } from '@/lib/api-auth';
import { CircleAlert, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      await login(name, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-gin-bg-layer rounded-gin-l p-10 border border-gin-border/60 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
        <div className="text-center mb-9">
          <div className="inline-flex items-center justify-center mb-5">
            <img src="/logo.png" alt="drop.js" width={72} height={99} className="drop-shadow-sm" />
          </div>
          <h1 className="text-[26px] font-bold text-gin-title tracking-tight leading-tight">drop.js</h1>
          <p className="text-sm mt-2 text-gin-text-light font-medium">Create your account</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-gin-danger/20 text-gin-danger text-sm px-4 py-3 rounded-gin mb-6">
            <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="reg-username" className="block text-[13px] font-semibold text-gin-title mb-2">
              Username
            </label>
            <input
              id="reg-username"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Choose a username"
              className="w-full rounded-gin-s px-3.5 py-2.5 text-sm text-gin-text border border-gin-border-form bg-gin-bg-layer placeholder:text-gin-text-light/60 focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-all duration-200"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="reg-email" className="block text-[13px] font-semibold text-gin-title mb-2">
              Email address
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-gin-s px-3.5 py-2.5 text-sm text-gin-text border border-gin-border-form bg-gin-bg-layer placeholder:text-gin-text-light/60 focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-all duration-200"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="reg-password" className="block text-[13px] font-semibold text-gin-title mb-2">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 6 characters"
              className="w-full rounded-gin-s px-3.5 py-2.5 text-sm text-gin-text border border-gin-border-form bg-gin-bg-layer placeholder:text-gin-text-light/60 focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-all duration-200"
            />
          </div>

          <div className="mb-8">
            <label htmlFor="reg-confirm" className="block text-[13px] font-semibold text-gin-title mb-2">
              Confirm password
            </label>
            <input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-enter your password"
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
                Creating account...
              </span>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gin-border/50 text-center">
          <p className="text-[13px] text-gin-text-light">
            Already have an account?{' '}
            <Link href="/login" className="text-gin-primary font-medium hover:text-gin-primary-hover hover:underline transition-colors duration-200">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
