import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function generateTTS({ input, voice = 'alloy', model = 'tts-1', ...options }: {
  input: string,
  voice?: string,
  model?: string,
  [key: string]: unknown
}) {
  return openai.audio.speech.create({
    input,
    voice,
    model,
    ...options,
  });
} 