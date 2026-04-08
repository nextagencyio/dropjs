'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Check, X, Trash2, Loader2 } from 'lucide-react';
import { approveComment, unpublishComment, deleteCommentAction } from '@/app/(admin)/_actions/comments';
import { useToast } from '@/components/toast';

interface CommentSummary {
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

interface Props {
  comments: CommentSummary[];
  statusFilter: string;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

function truncate(str: string, len: number): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export default function CommentsClient({ comments, statusFilter }: Props) {
  const router = useRouter();
  const { error: showError } = useToast();
  const [loadingCid, setLoadingCid] = useState<number | null>(null);

  const handleApprove = async (cid: number) => {
    setLoadingCid(cid);
    const result = await approveComment(cid);
    if (!result.success) showError(result.error ?? 'Operation failed');
    router.refresh();
    setLoadingCid(null);
  };

  const handleUnpublish = async (cid: number) => {
    setLoadingCid(cid);
    const result = await unpublishComment(cid);
    if (!result.success) showError(result.error ?? 'Operation failed');
    router.refresh();
    setLoadingCid(null);
  };

  const handleDelete = async (cid: number) => {
    if (!confirm('Delete this comment permanently?')) return;
    setLoadingCid(cid);
    const result = await deleteCommentAction(cid);
    if (!result.success) showError(result.error ?? 'Operation failed');
    router.refresh();
    setLoadingCid(null);
  };

  const published = comments.filter((c) => c.status === 1).length;
  const unpublished = comments.filter((c) => c.status === 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
            Comments
          </h1>
          <p className="text-sm text-gin-text-light mt-1">
            Manage and moderate comments across the site.
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gin-border">
        <Link
          href="/content/comments"
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            !statusFilter
              ? 'text-gin-primary border-gin-primary'
              : 'text-gin-text-light border-transparent hover:text-gin-text hover:border-gin-border'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          All ({comments.length})
        </Link>
        <Link
          href="/content/comments?status=1"
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            statusFilter === '1'
              ? 'text-gin-primary border-gin-primary'
              : 'text-gin-text-light border-transparent hover:text-gin-text hover:border-gin-border'
          }`}
        >
          Published ({published})
        </Link>
        <Link
          href="/content/comments?status=0"
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            statusFilter === '0'
              ? 'text-gin-primary border-gin-primary'
              : 'text-gin-text-light border-transparent hover:text-gin-text hover:border-gin-border'
          }`}
        >
          Unapproved ({unpublished})
        </Link>
      </div>

      {comments.length === 0 ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gin-border" />
          <p className="text-sm">No comments found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Subject
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-28">
                  Author
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-28">
                  Posted on
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-36">
                  Date
                </th>
                <th className="text-right px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-36">
                  Operations
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gin-border-table">
              {comments.map((c) => (
                <tr key={c.cid} className="hover:bg-gin-primary-light transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gin-title">
                      {c.subject || truncate(c.comment_body, 60) || '(no subject)'}
                    </div>
                    {c.comment_body && c.subject && (
                      <div className="text-xs text-gin-text-light mt-0.5">
                        {truncate(c.comment_body, 80)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gin-text-light text-[13px]">
                    {c.author_name || `User #${c.uid}`}
                  </td>
                  <td className="px-4 py-3 text-[13px]">
                    <Link
                      href={`/node/${c.entity_id}`}
                      className="text-gin-primary hover:underline"
                    >
                      {c.entity_type} #{c.entity_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {c.status === 1 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gin-text-light text-[13px] whitespace-nowrap">
                    {formatDate(c.created)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {loadingCid === c.cid ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gin-text-light" />
                      ) : (
                        <>
                          {c.status === 0 ? (
                            <button
                              onClick={() => handleApprove(c.cid)}
                              title="Approve"
                              className="p-1.5 rounded-gin-s text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnpublish(c.cid)}
                              title="Unpublish"
                              className="p-1.5 rounded-gin-s text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(c.cid)}
                            title="Delete"
                            className="p-1.5 rounded-gin-s text-gin-danger hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
