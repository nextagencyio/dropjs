'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface Comment {
  cid: number;
  entity_type: string;
  entity_id: number;
  uid: number;
  subject: string;
  comment_body: string;
  created: number;
  status: number;
  pid: number | null;
  thread: string;
  author_name?: string;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CommentItem({ comment }: { comment: Comment }) {
  const depth = (comment.thread?.match(/\./g) || []).length;
  const marginLeft = Math.min(depth, 4) * 24;

  return (
    <div className="border-b border-gray-100 py-4" style={{ marginLeft }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm text-gray-900">
          {comment.author_name || `User ${comment.uid}`}
        </span>
        <time className="text-xs text-gray-400">{formatDate(comment.created)}</time>
      </div>
      {comment.subject && (
        <h4 className="text-sm font-medium text-gray-800 mb-1">{comment.subject}</h4>
      )}
      <div className="text-sm text-gray-700 leading-relaxed">
        {comment.comment_body}
      </div>
    </div>
  );
}

function CommentForm({ nodeId, onCommentAdded }: { nodeId: number; onCommentAdded: () => void }) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <p className="text-sm text-gray-500">
        <Link href="/login" className="text-gin-primary hover:underline">Log in</Link> to post a comment.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'node',
          entity_id: nodeId,
          subject: subject.trim(),
          comment_body: body.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || 'Failed to post comment');
      }
      setSubject('');
      setBody('');
      onCommentAdded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        placeholder="Subject (optional)"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gin-primary"
      />
      <textarea
        placeholder="Write a comment..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gin-primary resize-y"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !body.trim()}
        className="px-4 py-2 bg-gin-primary text-white text-sm rounded hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? 'Posting...' : 'Post comment'}
      </button>
    </form>
  );
}

export function CommentsSection({ nodeId }: { nodeId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?entity_type=node&entity_id=${nodeId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.data || []);
      }
    } catch {
      // Comments are non-critical
    }
  }, [nodeId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  return (
    <section className="mt-10 pt-6 border-t border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h2>

      {comments.length > 0 ? (
        <div className="mb-6">
          {comments.map((comment) => (
            <CommentItem key={comment.cid} comment={comment} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-6">No comments yet.</p>
      )}

      <h3 className="text-sm font-medium text-gray-700 mb-3">Add a comment</h3>
      <CommentForm nodeId={nodeId} onCommentAdded={loadComments} />
    </section>
  );
}
