import { openai, Options } from './client';

export async function textToSpeech({ input, voice = 'alloy', model = 'tts-1', ...options }: {
  input: string,
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
  model?: string,
} & Options) {
  const response = await openai.audio.speech.create({
    model,
    input,
    voice,
    ...options,
  });
  return response;
} 