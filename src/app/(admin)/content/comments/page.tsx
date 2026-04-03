import { requireAuth } from '@/lib/server/auth';
import { getAllComments } from '@/lib/server/data';
import CommentsClient from './comments-client';

export default async function CommentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();

  const params = await searchParams;
  const statusFilter = typeof params.status === 'string' ? params.status : undefined;
  const statusNum = statusFilter !== undefined ? Number(statusFilter) : undefined;

  const comments = await getAllComments({
    status: statusNum,
    limit: 200,
  });

  return (
    <CommentsClient
      comments={comments}
      statusFilter={statusFilter ?? ''}
    />
  );
}
