import { supabase } from './client';
import { getAIBrainByUserId, getSuperAIBrainId } from './ai_brain';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { AIBrain } from './ai_brain';

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
  ai_brain?: AIBrain;
  isAI?: boolean;
}

// 1. Find or create a chat between user and AI Brain
export async function getOrCreateChat(userId: string, aiBrainId: string) {
  // Try to find existing chat
  const { data: chat } = await supabase
    .from('chats')
    .select('*')
    .eq('created_by', userId)
    .eq('reference_id', aiBrainId)
    .single();

  if (chat) return chat;

  // Create new chat
  const { data: newChat, error: insertError } = await supabase
    .from('chats')
    .insert([
      {
        created_by: userId,
        reference_id: aiBrainId,
        is_group: false,
        title: "Abdul's AI Brain",
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

// 4. Main chat function
export async function chatWithAIBrain({
  userId,
  aiBrainId,
  userMessage,
}: {
  userId: string;
  aiBrainId: string;
  userMessage: string;
}) {
  // Find or create chat
  const chat = await getOrCreateChat(userId, aiBrainId);

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

  // Insert AI message
  const aiMsg = await insertMessage(chat.id, aiBrainId, aiContent);

  return {
    chat,
    messages: [...messages, aiMsg],
  };
}

// Helper to get the user's AI Brain id (for reference_id)
export async function getUserAIBrainId(userId: string) {
  const { success, data } = await getAIBrainByUserId(userId);
  if (success && data) return data.id;
  throw new Error('AI Brain not found for user');
}

// Helper to get the Super AI Brain id
export async function getSuperAIBrainIdHelper() {
  const { success, data } = await getSuperAIBrainId();
  if (success && data) return data;
  throw new Error('Super AI Brain not found');
}

// Fetch all chats for a user, including AI Brain info for AI chats
export async function getChatsForUser(userId: string): Promise<Chat[]> {
  // Fetch all chats where the user is the creator (for AI chats)
  const { data: chats, error } = await supabase
    .from('chats')
    .select('*')
    .eq('created_by', userId)
    .order('last_message_at', { ascending: false });
  if (error) throw error;

  // For each chat, if reference_id is set, fetch AI Brain info
  const aiBrainIds = (chats as Chat[]).filter((c) => c.reference_id).map((c) => c.reference_id as string);
  let aiBrainsMap: Record<string, AIBrain> = {};
  if (aiBrainIds.length > 0) {
    const { data: aiBrains } = await supabase
      .from('ai_brains')
      .select('*')
      .in('id', aiBrainIds);
    if (aiBrains) {
      aiBrainsMap = Object.fromEntries((aiBrains as AIBrain[]).map((b) => [b.id, b]));
    }
  }

  // Attach AI Brain info to chats
  const chatsWithInfo: Chat[] = (chats as Chat[]).map((chat) => {
    if (chat.reference_id && aiBrainsMap[chat.reference_id]) {
      return {
        ...chat,
        ai_brain: aiBrainsMap[chat.reference_id],
        isAI: true,
      };
    }
    return { ...chat, isAI: false };
  });

  return chatsWithInfo;
} 