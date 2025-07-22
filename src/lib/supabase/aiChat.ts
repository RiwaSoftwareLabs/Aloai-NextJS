import { supabase } from './client';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Message type for Supabase messages table
interface DBMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
  is_deleted?: boolean;
  reply_to_id?: string | null;
  message_type?: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  read_status?: unknown;
}

// Chat type for chats table
export interface Chat {
  id: string;
  created_at: string;
  updated_at?: string;
  title?: string;
  is_group?: boolean;
  created_by: string;
  last_message_at?: string;
  last_message_text?: string;
  reference_id?: string;
  isAI?: boolean;
}

// 1. Find or create a chat between user and friend (AI or human)
export async function getOrCreateChat(userId: string, friendId: string) {
  // Try to find existing chat
  const { data: chat } = await supabase
    .from('chats')
    .select('*')
    .eq('created_by', userId)
    .eq('reference_id', friendId)
    .single();

  if (chat) return chat;

  // Create new chat
  const { data: newChat, error: insertError } = await supabase
    .from('chats')
    .insert([
      {
        created_by: userId,
        reference_id: friendId,
        is_group: false,
        title: "Chat",
      },
    ])
    .select()
    .single();

  if (insertError) throw insertError;
  return newChat;
}

// 2. Insert a message
export async function insertMessage(chatId: string, senderId: string, content: string, replyToId?: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        chat_id: chatId,
        sender_id: senderId,
        content,
        reply_to_id: replyToId || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 3. Fetch messages for a chat
export async function getMessagesForChat(chatId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// 4. Main chat function (for AI, friendId is the AI user id)
export async function chatWithAIFriend({
  userId,
  friendId,
  userMessage,
}: {
  userId: string;
  friendId: string;
  userMessage: string;
}) {
  // Find or create chat
  const chat = await getOrCreateChat(userId, friendId);

  // Insert user message
  await insertMessage(chat.id, userId, userMessage);

  // Fetch chat history (last N messages for context)
  const messages: DBMessage[] = await getMessagesForChat(chat.id);
  const openaiMessages: ChatCompletionMessageParam[] = messages.map((msg) => ({
    role: msg.sender_id === userId ? 'user' : 'assistant',
    content: msg.content,
  }));

  // Generate AI response via API route
  const aiResponse = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: openaiMessages }),
  }).then(res => res.json());

  const aiContent = aiResponse.choices?.[0]?.message?.content || '...';

  // Insert AI message (from friendId, which is the AI user)
  const aiMsg = await insertMessage(chat.id, friendId, aiContent);

  return {
    chat,
    messages: [...messages, aiMsg],
  };
}

// Fetch all chats for a user
export async function getChatsForUser(userId: string): Promise<Chat[]> {
  // Fetch all chats where the user is the creator
  const { data: chats, error } = await supabase
    .from('chats')
    .select('*')
    .eq('created_by', userId)
    .order('last_message_at', { ascending: false });
  if (error) throw error;
  return chats as Chat[];
} 