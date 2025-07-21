import { openai, FileLike, Options } from './client';

export async function transcribeAudioWhisper({ file, ...options }: {
  file: FileLike,
} & Options) {
  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    ...options,
  });
  return response;
} 