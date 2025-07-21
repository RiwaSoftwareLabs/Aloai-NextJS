import { openai, FileLike, Options } from './client';

export async function uploadFileAndAsk({ file, question, model = 'gpt-4o', ...options }: {
  file: FileLike,
  question: string,
  model?: string,
} & Options) {
  // 1. Upload the file (id can be used for retrieval when OpenAI supports it)
  await openai.files.create({ file, purpose: 'assistants' });
  // 2. Ask a question about the file (placeholder, as OpenAI's API may change)
  // TODO: Update this when OpenAI releases official document QA endpoints
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are a helpful assistant that answers questions about uploaded documents.' },
      { role: 'user', content: question },
    ],
    ...options,
  });
  return response;
} 