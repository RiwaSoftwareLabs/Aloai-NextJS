import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { getOrCreateChatBetweenUsers } from '@/lib/supabase/aiChat';

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_SECRETE_KEY! });

// Use service role key for server-side DB access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { senderId, receiverId, content, model = 'gpt-4o', ...options } = await req.json();
    if (!senderId || !receiverId || !content) {
      return NextResponse.json({ error: 'Missing senderId, receiverId, or content' }, { status: 400 });
    }

    // 1. Store the user message
    // Get or create chat using centralized function
    const chat = await getOrCreateChatBetweenUsers(senderId, receiverId);
    const chatId = chat.id;

    // Insert user message
    const { data: userMsg, error: userMsgError } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          message_type: 'text',
        },
      ])
      .select()
      .single();
    if (userMsgError) throw userMsgError;

    // Update chat last_message_text
    await supabase
      .from('chats')
      .update({
        last_message_at: userMsg.created_at,
        last_message_text: userMsg.content,
        updated_at: userMsg.created_at,
      })
      .eq('id', chatId);

    // 2. Check if receiver is AI
    const { data: receiverUser, error: receiverUserError } = await supabase
      .from('users')
      .select('user_type, display_name, role_message')
      .eq('user_id', receiverId)
      .single();
    if (receiverUserError) throw receiverUserError;
    const isAI = receiverUser && (receiverUser.user_type === 'ai' || receiverUser.user_type === 'super-ai');

    let aiMsg = null;
    if (isAI) {
      // 1. Fetch last 15 messages for this chat (optimized for performance)
      const { data: history, error: chatHistoryError } = await supabase
        .from('messages')
        .select('sender_id, content, created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(15);
      if (chatHistoryError) throw chatHistoryError;

      // Ensure chronological order (oldest to newest)
      const chronologicalHistory = (history || []).slice().reverse();

      // 2. Prepare system prompt
      const systemPrompt = receiverUser.role_message
        ? `${receiverUser.role_message}\n\nAlways refer to yourself in the first person (e.g., 'I am ...') when introducing yourself or describing your role.`
        : '';

      // 3. Format messages for OpenAI
      const openaiMessages = [
        { role: 'system', content: systemPrompt },
        ...chronologicalHistory.map(msg => ({
          role: msg.sender_id === senderId ? 'user' : 'assistant',
          content: msg.content,
        })),
      ];
      // Only append if the last message is NOT the current user message
      if (
        !chronologicalHistory.length ||
        chronologicalHistory[chronologicalHistory.length - 1].content !== content ||
        chronologicalHistory[chronologicalHistory.length - 1].sender_id !== senderId
      ) {
        openaiMessages.push({ role: 'user', content });
      }

      // 4. Call OpenAI
      const response = await openai.chat.completions.create({
        model,
        messages: openaiMessages,
        ...options,
      });
      const aiContent = response.choices[0]?.message?.content || '...';

      // 5. Store AI reply
      const { data: aiMsgData, error: aiMsgError } = await supabase
        .from('messages')
        .insert([
          {
            chat_id: chatId,
            sender_id: receiverId, // AI is the sender
            receiver_id: senderId,
            content: aiContent,
            message_type: 'text',
          },
        ])
        .select()
        .single();
      if (aiMsgError) throw aiMsgError;
      // Update chat last_message_text
      await supabase
        .from('chats')
        .update({
          last_message_at: aiMsgData.created_at,
          last_message_text: aiMsgData.content,
          updated_at: aiMsgData.created_at,
        })
        .eq('id', chatId);
      aiMsg = aiMsgData;
    }

    return NextResponse.json({ userMsg, aiMsg });
  } catch (err: unknown) {
    console.error('AI chat API error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 