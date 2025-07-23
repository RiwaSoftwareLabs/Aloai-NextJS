import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

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
    // Get or create chat
    let chatId: string;
    let chat;
    {
      // Ensure uniqueness regardless of order (user_id, receiver_id)
      const { data: existingChats, error: findError } = await supabase
        .from('chats')
        .select('*')
        .or(`and(user_id.eq.${senderId},receiver_id.eq.${receiverId}),and(user_id.eq.${receiverId},receiver_id.eq.${senderId})`)
        .eq('is_group', false)
        .limit(1);
      if (findError) throw findError;
      if (existingChats && existingChats.length > 0) {
        chat = existingChats[0];
      } else {
        // Fetch receiver's display_name for chat title
        let receiverDisplayName = 'Chat';
        const { data: receiver } = await supabase
          .from('users')
          .select('display_name')
          .eq('user_id', receiverId)
          .single();
        if (receiver && receiver.display_name) {
          receiverDisplayName = receiver.display_name;
        }
        const { data: newChat, error: insertError } = await supabase
          .from('chats')
          .insert([
            {
              user_id: senderId,
              receiver_id: receiverId,
              created_by: senderId,
              is_group: false,
              title: receiverDisplayName,
            },
          ])
          .select()
          .single();
        if (insertError) throw insertError;
        chat = newChat;
      }
      chatId = chat.id;
    }

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
      // 1. Fetch last 20 messages for this chat
      const { data: history, error: chatHistoryError } = await supabase
        .from('messages')
        .select('sender_id, content, created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(20);
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

      console.log('openaiMessages:', openaiMessages);

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