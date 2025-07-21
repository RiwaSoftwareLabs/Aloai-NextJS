import { openai, DALLE_SIZES, DalleSize, Options } from './client';

export async function generateImageDalle3({ prompt, n = 1, size = '1024x1024', model = 'dall-e-3', ...options }: {
  prompt: string,
  n?: number,
  size?: DalleSize,
  model?: string,
} & Options) {
  // Ensure size is valid
  if (!DALLE_SIZES.includes(size)) {
    throw new Error(`Invalid DALL·E image size: ${size}`);
  }
  const response = await openai.images.generate({
    model,
    prompt,
    n,
    size,
    ...options,
  });
  return response;
} 