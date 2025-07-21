import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function generateChatCompletion({ messages, model = 'gpt-4o', ...options }: {
  messages: ChatCompletionMessageParam[],
  model?: string,
  [key: string]: unknown
}) {
  return openai.chat.completions.create({
    model,
    messages,
    ...options,
  });
} 