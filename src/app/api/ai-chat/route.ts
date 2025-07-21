import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  const { messages, model = 'gpt-4o', ...options } = await req.json();
  const response = await openai.chat.completions.create({
    model,
    messages,
    ...options,
  });
  return NextResponse.json(response);
} 