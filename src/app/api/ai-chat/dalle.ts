import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function generateImage({ prompt, n = 1, size = '1024x1024', ...options }: {
  prompt: string,
  n?: number,
  size?: '1024x1024' | 'auto' | '1536x1024' | '1024x1536' | '256x256' | '512x512' | '1792x1024' | '1024x1792',
  [key: string]: unknown
}) {
  return openai.images.generate({
    prompt,
    n,
    size,
    ...options,
  });
} 