import { GoogleGenAI } from '@google/genai';

/**
 * Centralized Gemini model configuration for MuseumLens Module 3.
 * Change this single constant (or GEMINI_MODEL env var) to switch models without rewriting application logic.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-4-hydrogen';

export class GeminiServiceError extends Error {
  readonly statusCode: number;
  readonly code: 'MISSING_KEY' | 'AUTH_ERROR' | 'RATE_LIMIT' | 'MODEL_NOT_FOUND' | 'UPSTREAM_ERROR';

  constructor(
    message: string,
    statusCode: number,
    code: 'MISSING_KEY' | 'AUTH_ERROR' | 'RATE_LIMIT' | 'MODEL_NOT_FOUND' | 'UPSTREAM_ERROR'
  ) {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiServiceError(
      'Gemini API credentials are not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to enable AI Storyteller.',
      503,
      'MISSING_KEY'
    );
  }

  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = apiKey;
  }

  return cachedClient;
}

export function classifyGeminiError(err: unknown): GeminiServiceError {
  if (err instanceof GeminiServiceError) return err;

  const rawMessage = err instanceof Error ? err.message : String(err);
  const statusMatch =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : NaN;

  if (
    statusMatch === 401 ||
    statusMatch === 403 ||
    /API_KEY_INVALID|PERMISSION_DENIED|invalid api key/i.test(rawMessage)
  ) {
    return new GeminiServiceError(
      'The Gemini API rejected the server credentials. Please verify GEMINI_API_KEY in Settings > Secrets.',
      502,
      'AUTH_ERROR'
    );
  }

  if (statusMatch === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(rawMessage)) {
    return new GeminiServiceError(
      'Gemini API rate limit or quota was reached. Please wait a moment and try again.',
      429,
      'RATE_LIMIT'
    );
  }

  if (statusMatch === 404 || /NOT_FOUND|not found/i.test(rawMessage)) {
    return new GeminiServiceError(
      `Configured Gemini model (${GEMINI_MODEL}) is unavailable. Verify the centralized model setting on the server.`,
      502,
      'MODEL_NOT_FOUND'
    );
  }

  return new GeminiServiceError(
    'Unable to reach the Gemini service right now. Please try your question again.',
    502,
    'UPSTREAM_ERROR'
  );
}

export async function withGeminiRetry<T>(operation: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const classified = classifyGeminiError(err);
      // Only retry transient upstream or rate-limit errors
      const retryable = classified.code === 'UPSTREAM_ERROR' || classified.code === 'RATE_LIMIT';
      if (!retryable || attempt === maxRetries) {
        throw classified;
      }
      const delayMs = 600 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw classifyGeminiError(lastError);
}
