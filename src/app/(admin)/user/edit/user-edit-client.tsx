'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleAlert, Loader2, CheckCircle2, User } from 'lucide-react';
import { updateOwnProfile } from '@/app/(admin)/_actions/user';

interface Props {
  uid: number;
  name: string;
  email: string;
  roles: string[];
}

export default function UserEditClient({ uid, name, email, roles }: Props) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState(email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);

    const result = await updateOwnProfile({
      email: newEmail !== email ? newEmail : undefined,
      currentPassword: currentPassword || undefined,
      newPassword: newPassword || undefined,
    });

    if (result.success) {
      setSuccess('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      router.refresh();
    } else {
      setError(result.error || 'Update failed');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-5">
        <Link href="/" className="text-sm text-gin-primary hover:underline">
          Dashboard
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Edit profile</span>
      </div>

      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-1">
        Edit profile
      </h1>
      <p className="text-sm text-gin-text-light mb-6">
        Update your account settings.
      </p>

      {/* User info card */}
      <div className="bg-white border border-gin-border rounded-gin p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gin-primary-light flex items-center justify-center">
            <User className="w-6 h-6 text-gin-primary" />
          </div>
          <div>
            <div className="font-semibold text-gin-title">{name}</div>
            <div className="text-sm text-gin-text-light">
              UID: {uid} &middot; Roles: {roles.join(', ')}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-gin-danger/20 text-gin-danger text-sm px-4 py-3 rounded-gin mb-4">
          <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-gin mb-4">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Email section */}
        <div className="bg-white border border-gin-border rounded-gin p-5 mb-6">
          <h2 className="text-sm font-semibold text-gin-title mb-4">Email address</h2>
          <div>
            <label htmlFor="email" className="block text-[13px] font-semibold text-gin-title mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full max-w-md rounded-gin-s px-3.5 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Password section */}
        <div className="bg-white border border-gin-border rounded-gin p-5 mb-6">
          <h2 className="text-sm font-semibold text-gin-title mb-4">Change password</h2>
          <p className="text-xs text-gin-text-light mb-4">Leave blank to keep your current password.</p>

          <div className="space-y-4 max-w-md">
            <div>
              <label htmlFor="current-password" className="block text-[13px] font-semibold text-gin-title mb-1.5">
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Required to change password"
                className="w-full rounded-gin-s px-3.5 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light/60 focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-[13px] font-semibold text-gin-title mb-1.5">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                className="w-full rounded-gin-s px-3.5 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light/60 focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-[13px] font-semibold text-gin-title mb-1.5">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-gin-s px-3.5 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light/60 focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 bg-gin-primary text-white rounded-gin-s px-5 py-2.5 text-sm font-semibold hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </button>
      </form>
    </div>
  );
}
