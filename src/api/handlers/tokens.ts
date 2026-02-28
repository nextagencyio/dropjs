import type { Request, Response } from '../types.js';
import {
  getTokenTypes,
  replaceTokens,
} from '../../core/index.js';
import { BadRequestError } from '../errors.js';
import type { TokenData } from '../../core/index.js';

/**
 * GET /api/tokens
 * List all registered token types with their available tokens.
 */
export async function handleListTokenTypes(
  _req: Request,
  res: Response,
): Promise<void> {
  const types = getTokenTypes();
  res.json({ data: types });
}

/**
 * POST /api/tokens/replace
 * Replace tokens in the provided text. Body: { text: string, data: TokenData }
 * Returns: { result: string }
 */
export async function handleReplaceTokens(
  req: Request,
  res: Response,
): Promise<void> {
  const { text, data } = req.body;

  if (!text || typeof text !== 'string') {
    throw new BadRequestError('text is required and must be a string');
  }

  if (data !== undefined && (typeof data !== 'object' || data === null)) {
    throw new BadRequestError('data must be an object if provided');
  }

  const tokenData: TokenData = data ?? {};
  const result = replaceTokens(text, tokenData);

  res.json({ result });
}
