import OpenAI from 'openai';

// Get the OpenAI API key from environment variables
const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_SECRETE_KEY;

if (!openaiApiKey) {
  throw new Error('Missing NEXT_PUBLIC_OPENAI_SECRETE_KEY environment variable');
}

// Initialize the OpenAI client
export const openai = new OpenAI({ apiKey: openaiApiKey });

// --- Types ---
// Only File and Blob are supported for browser/Next.js OpenAI uploads
// For Node.js server, you may need to extend this with fs.ReadStream or other types
// See OpenAI docs for Uploadable type
// type FileLike = File | Blob | NodeJS.ReadableStream;
export type FileLike = File | Blob;

export type Options = Record<string, unknown>;

// Allowed DALL·E 3 image sizes
export const DALLE_SIZES = [
  '1024x1024',
  '1024x1792',
  '1792x1024',
  '512x512',
  '256x256',
  '1536x1024',
  '1024x1536',
  'auto',
] as const;
export type DalleSize = typeof DALLE_SIZES[number];

// All other feature functions have been moved to their own files for clarity.
