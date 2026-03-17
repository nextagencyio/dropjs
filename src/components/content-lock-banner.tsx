'use client';

import { useEffect, useState, useCallback } from 'react';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';
import {
  checkAndAcquireLock,
  releaseContentLock,
  forceBreakLock,
} from '@/app/(admin)/_actions/content-lock';

interface ContentLockBannerProps {
  entityType: string;
  entityId: number;
  isAdmin?: boolean;
}

interface LockInfo {
  uid: number;
  name: string;
  locked: number;
  expires: number;
}

export function ContentLockBanner({ entityType, entityId, isAdmin }: ContentLockBannerProps) {
  const [lockState, setLockState] = useState<'loading' | 'own' | 'other' | 'free'>('loading');
  const [otherLock, setOtherLock] = useState<LockInfo | null>(null);
  const [breaking, setBreaking] = useState(false);

  const acquireLock = useCallback(async () => {
    const result = await checkAndAcquireLock(entityType, entityId);
    if (result.success) {
      setLockState('own');
    } else if (result.lock) {
      setLockState('other');
      setOtherLock(result.lock);
    } else {
      setLockState('free');
    }
  }, [entityType, entityId]);

  useEffect(() => {
    acquireLock();

    // Release lock when leaving the page
    return () => {
      releaseContentLock(entityType, entityId);
    };
  }, [entityType, entityId, acquireLock]);

  // Renew lock every 5 minutes
  useEffect(() => {
    if (lockState !== 'own') return;
    const interval = setInterval(() => {
      checkAndAcquireLock(entityType, entityId);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lockState, entityType, entityId]);

  const handleBreakLock = async () => {
    setBreaking(true);
    const result = await forceBreakLock(entityType, entityId);
    if (result.success) {
      setLockState('own');
      setOtherLock(null);
    }
    setBreaking(false);
  };

  if (lockState === 'loading' || lockState === 'own' || lockState === 'free') {
    return null; // No banner needed
  }

  if (lockState === 'other' && otherLock) {
    const lockedAgo = Math.floor(Date.now() / 1000) - otherLock.locked;
    const minutes = Math.floor(lockedAgo / 60);
    const timeStr = minutes < 1 ? 'just now' : `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-gin px-4 py-3 mb-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">
            <Lock className="w-3.5 h-3.5 inline mr-1" />
            This content is being edited by <strong>{otherLock.name}</strong> (locked {timeStr})
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Changes you make may conflict with their edits. The lock expires automatically after 15 minutes of inactivity.
          </p>
          {isAdmin && (
            <button
              onClick={handleBreakLock}
              disabled={breaking}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded-gin-s hover:bg-amber-200 disabled:opacity-50 transition-colors"
            >
              <Unlock className="w-3.5 h-3.5" />
              {breaking ? 'Breaking lock...' : 'Break lock and take over'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
