import { openai, Options } from './client';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export async function generateChatCompletion({ messages, model = 'gpt-4o', ...options }: {
  messages: ChatCompletionMessageParam[],
  model?: string,
} & Options) {
  const response = await openai.chat.completions.create({
    model,
    messages,
    ...options,
  });
  return response;
} 