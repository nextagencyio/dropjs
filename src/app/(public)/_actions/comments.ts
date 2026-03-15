'use server';

import { ensureInitialized } from '../../../api/init';
import { getSessionUser } from '../../../lib/server/auth';

interface PostCommentResult {
  success: boolean;
  error?: string;
}

export async function postCommentAction(
  nodeId: number,
  subject: string,
  commentBody: string
): Promise<PostCommentResult> {
  try {
    await ensureInitialized();

    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: 'You must be logged in to post a comment.' };
    }

    const { createComment } = await import('../../../core/comments');
    await createComment({
      entity_type: 'node',
      entity_id: nodeId,
      uid: user.uid,
      subject: subject || undefined,
      comment_body: commentBody,
    } as any);

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message || 'Failed to post comment' };
  }
}
