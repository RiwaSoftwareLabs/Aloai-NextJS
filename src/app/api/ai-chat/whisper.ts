import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function transcribeAudio({ file, model = 'whisper-1', ...options }: {
  file: File | Blob,
  model?: string,
  [key: string]: unknown
}) {
  return openai.audio.transcriptions.create({
    file,
    model,
    ...options,
  });
} 