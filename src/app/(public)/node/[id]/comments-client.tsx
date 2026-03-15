'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { postCommentAction } from '../../_actions/comments';

interface Comment {
  cid: number;
  entity_type: string;
  entity_id: number;
  uid: number;
  subject: string | null;
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
  const marginLeft = Math.min(depth, 4) * 16;

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

function CommentForm({ nodeId }: { nodeId: number }) {
  const { user } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

    setError(null);
    startTransition(async () => {
      const result = await postCommentAction(nodeId, subject.trim(), body.trim());
      if (result.success) {
        setSubject('');
        setBody('');
        router.refresh();
      } else {
        setError(result.error || 'Failed to post comment');
      }
    });
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
        disabled={isPending || !body.trim()}
        className="px-4 py-2 bg-gin-primary text-white text-sm rounded hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Posting...' : 'Post comment'}
      </button>
    </form>
  );
}

export function CommentsSection({ nodeId, initialComments }: { nodeId: number; initialComments: Comment[] }) {
  const comments = initialComments;

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
      <CommentForm nodeId={nodeId} />
    </section>
  );
}
