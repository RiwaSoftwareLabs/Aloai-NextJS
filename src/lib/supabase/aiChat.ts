import { supabase } from './client';

// Chat and Message types based on the provided schema
export interface Chat {
  id: string;
  user_id: string;
  receiver_id: string | null;
  title: string | null;
  is_group: boolean | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_text: string | null;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: string | null;
  created_at: string;
  updated_at: string;
  is_edited: boolean | null;
  is_deleted: boolean | null;
  reply_to_id: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  read_status: Record<string, unknown> | null;
}

// Helper: Get or create a unique chat between two users (not group)
export async function getOrCreateChatBetweenUsers(userId: string, receiverId: string) {
  // Ensure uniqueness regardless of order (user_id, receiver_id)
  const { data: existingChats, error: findError } = await supabase
    .from('chats')
    .select('*')
    .or(`and(user_id.eq.${userId},receiver_id.eq.${receiverId}),and(user_id.eq.${receiverId},receiver_id.eq.${userId})`)
    .eq('is_group', false)
    .limit(1);

  if (findError) throw findError;
  if (existingChats && existingChats.length > 0) return existingChats[0];

  // Fetch receiver's display_name for chat title
  let receiverDisplayName = 'Chat';
  if (receiverId) {
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('display_name')
      .eq('user_id', receiverId)
      .single();
    if (!receiverError && receiver && receiver.display_name) {
      receiverDisplayName = receiver.display_name;
    }
  }

  // Try to create new chat with conflict handling
  // Use a consistent ordering of user_id and receiver_id to prevent duplicates
  const [smallerId, largerId] = [userId, receiverId].sort();
  
  const { data: newChat, error: insertError } = await supabase
    .from('chats')
    .insert([
      {
        user_id: smallerId,
        receiver_id: largerId,
        created_by: userId,
        is_group: false,
        title: receiverDisplayName,
      },
    ])
    .select()
    .single();

  if (insertError) {
    // If insert failed due to duplicate, try to fetch the existing chat again
    if (insertError.code === '23505') { // Unique constraint violation
      const { data: retryChats, error: retryError } = await supabase
        .from('chats')
        .select('*')
        .or(`and(user_id.eq.${userId},receiver_id.eq.${receiverId}),and(user_id.eq.${receiverId},receiver_id.eq.${userId})`)
        .eq('is_group', false)
        .limit(1);
      
      if (retryError) throw retryError;
      if (retryChats && retryChats.length > 0) return retryChats[0];
    }
    throw insertError;
  }
  
  return newChat;
}

// Send a message in a chat (creates chat if needed)
export async function sendMessage({
  senderId,
  receiverId,
  content,
  messageType = 'text',
  replyToId = null,
  attachment = null,
}: {
  senderId: string;
  receiverId: string;
  content: string;
  messageType?: string;
  replyToId?: string | null;
  attachment?: {
    url: string;
    type: string;
    name: string;
    size: number;
  } | null;
}) {
  // Get or create chat
  const chat = await getOrCreateChatBetweenUsers(senderId, receiverId);

  // Insert message
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert([
      {
        chat_id: chat.id,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        message_type: messageType,
        reply_to_id: replyToId,
        attachment_url: attachment?.url || null,
        attachment_type: attachment?.type || null,
        attachment_name: attachment?.name || null,
        attachment_size: attachment?.size || null,
      },
    ])
    .select()
    .single();

  if (msgError) throw msgError;

  // Always re-fetch the chat by user/receiver pair to get the correct chat row
  const { data: chats, error: chatFetchError } = await supabase
    .from('chats')
    .select('*')
    .or(`and(user_id.eq.${senderId},receiver_id.eq.${receiverId}),and(user_id.eq.${receiverId},receiver_id.eq.${senderId})`)
    .eq('is_group', false)
    .order('created_at', { ascending: true });

  if (chatFetchError || !chats || chats.length === 0) {
    console.error('Could not find chat to update last_message_text', chatFetchError);
    return message;
  }

  // Use the first chat found (should be unique)
  const chatToUpdate = chats[0];

  // Update last_message_text for the correct chat row
  const { error: chatUpdateError } = await supabase
    .from('chats')
    .update({
      last_message_at: message.created_at,
      last_message_text: message.content,
      updated_at: message.created_at,
    })
    .eq('id', chatToUpdate.id)
    .select();
  if (chatUpdateError) {
    console.error('Failed to update chat last_message_text:', chatUpdateError);
  }

  return message;
}

// List messages for a chat (ordered by created_at)
export async function getMessagesForChat(chatId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Message[];
}

// Get messages with pagination for loading old messages
export async function getMessagesForChatPaginated(
  chatId: string, 
  limit: number = 20, 
  beforeTimestamp?: string
): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // If beforeTimestamp is provided, get messages before that timestamp
  if (beforeTimestamp) {
    query = query.lt('created_at', beforeTimestamp);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  // Return messages in ascending order (oldest first) for proper display
  return (data as Message[]).reverse();
}

// List recent chats for a user (ordered by last_message_at desc)
export async function getRecentChatsForUser(userId: string): Promise<Chat[]> {
  // User is either user_id or receiver_id
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .or(`user_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });
  if (error) throw error;
  return data as Chat[];
}

// --- UNREAD MESSAGE LOGIC ---

// Mark all messages in a chat as read for a user
export async function markMessagesAsRead(chatId: string, userId: string) {
  // Get all unread messages for this user in this chat
  const { data: unreadMessages, error } = await supabase
    .from('messages')
    .select('id')
    .eq('chat_id', chatId)
    .not('sender_id', 'eq', userId);
  if (error) {
    console.error('Error fetching unread messages:', error);
    return { error };
  }
  if (!unreadMessages || unreadMessages.length === 0) {
    return { success: true };
  }
  // Get already read message ids
  const { data: alreadyRead, error: readError } = await supabase
    .from('message_reads')
    .select('message_id')
    .eq('user_id', userId)
    .in('message_id', unreadMessages.map((m: { id: string }) => m.id));
  if (readError) {
    console.error('Error fetching already read messages:', readError);
    return { error: readError };
  }
  const alreadyReadIds = (alreadyRead || []).map((r: { message_id: string }) => r.message_id);
  const toInsert = unreadMessages.filter((m: { id: string }) => !alreadyReadIds.includes(m.id));
  if (toInsert.length === 0) {
    return { success: true };
  }
  const inserts: { message_id: string; user_id: string }[] = toInsert.map((msg: { id: string }) => ({ message_id: msg.id, user_id: userId }));
  const { error: insertError } = await supabase.from('message_reads').upsert(inserts, { onConflict: 'message_id,user_id' });
  if (insertError) {
    console.error('Error inserting into message_reads:', insertError);
    return { error: insertError };
  }
  return { success: true };
}

// Get unread count for a chat for a user
export async function getUnreadCountForChat(chatId: string, userId: string) {
  // Count messages in chat not sent by user and not in message_reads for user
  const { data, error } = await supabase.rpc('count_unread_messages', {
    chat_id_input: chatId,
    user_id_input: userId,
  });
  if (!error && typeof data === 'number') return data;
  // Fallback: count in JS if RPC not available
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id')
    .eq('chat_id', chatId)
    .not('sender_id', 'eq', userId);
  if (msgError) return 0;
  if (!messages || messages.length === 0) return 0;
  const { data: reads, error: readsError } = await supabase
    .from('message_reads')
    .select('message_id')
    .eq('user_id', userId)
    .in('message_id', messages.map((m: { id: string }) => m.id));
  if (readsError) return 0;
  const readIds = (reads || []).map((r: { message_id: string }) => r.message_id);
  return messages.filter((m: { id: string }) => !readIds.includes(m.id)).length;
}

// Get read status for specific messages
export async function getMessageReadStatusForMessages(messageIds: string[], userId: string) {
  if (!messageIds || messageIds.length === 0) return {};

  // Get read records for these specific messages
  const { data: reads, error: readsError } = await supabase
    .from('message_reads')
    .select('message_id, user_id')
    .in('message_id', messageIds)
    .eq('user_id', userId);

  if (readsError) throw readsError;

  // Create a map of message_id to read status
  const readStatus: Record<string, boolean> = {};
  messageIds.forEach(messageId => {
    const isRead = (reads || []).some(read => read.message_id === messageId);
    readStatus[messageId] = isRead;
  });

  return readStatus;
}

// Get read status for messages in a chat (deprecated - use getMessageReadStatusForMessages instead)
export async function getMessageReadStatus(chatId: string, userId: string) {
  // Get all messages in the chat
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, sender_id')
    .eq('chat_id', chatId);
  
  if (msgError) throw msgError;
  if (!messages || messages.length === 0) return {};

  // Get read records for these messages
  const { data: reads, error: readsError } = await supabase
    .from('message_reads')
    .select('message_id, user_id')
    .in('message_id', messages.map(m => m.id));

  if (readsError) throw readsError;

  // Create a map of message_id to read status
  const readStatus: Record<string, boolean> = {};
  messages.forEach(message => {
    // A message is read if it's not sent by the current user and has a read record
    if (message.sender_id !== userId) {
      const isRead = (reads || []).some(read => 
        read.message_id === message.id && read.user_id === userId
      );
      readStatus[message.id] = isRead;
    }
  });

  return readStatus;
}

// Get message status (sent, delivered, read) for a specific message
export function getMessageStatus(message: { id: string; sender_id: string }, userId: string, readStatus: Record<string, boolean>): 'sent' | 'delivered' | 'read' {
  // If the message is not sent by the current user, it's not our message
  if (message.sender_id !== userId) {
    return 'delivered';
  }

  // If the message is sent by the current user, check if it's been read
  if (readStatus[message.id]) {
    return 'read';
  }

  // Default to sent if not read yet
  return 'sent';
}

import { 
  getCachedMessageReactions, 
  cacheMessageReactions, 
  cacheUserReaction,
  calculateOptimisticReaction,
  addOptimisticUpdate,
  removeOptimisticUpdate,
  prefetchReactions,
  type ReactionData
} from './reactionCache';
import { getCurrentUser } from './auth';

// Get reaction counts for a message with caching
export async function getMessageReactionCounts(messageId: string): Promise<ReactionData> {
  // Try to get from cache first
  const cached = await getCachedMessageReactions(messageId);
  if (cached) {
    return cached;
  }

  // If not in cache, fetch from database
  const { data, error } = await supabase.rpc('get_message_reaction_counts', {
    message_id_param: messageId
  });
  
  if (error) throw error;
  
  const reactionData = data?.[0] || { likes_count: 0, dislikes_count: 0, user_reaction: null };
  
  // Cache the result
  cacheMessageReactions(messageId, reactionData);
  
  return reactionData;
}

// Toggle reaction for a message with caching and optimistic updates
export async function toggleMessageReaction(messageId: string, reactionType: 'like' | 'dislike') {
  // Get current user
  const { user } = await getCurrentUser();
  if (!user?.id) {
    throw new Error('User not authenticated');
  }

  // Get current reaction data
  const currentReactions = await getMessageReactionCounts(messageId);
  const previousReaction = currentReactions.user_reaction;

  // Calculate optimistic update
  const optimisticReactions = calculateOptimisticReaction(currentReactions, reactionType);
  
  // Add optimistic update to cache
  addOptimisticUpdate(messageId, reactionType, previousReaction);
  
  // Cache the optimistic update immediately
  cacheMessageReactions(messageId, optimisticReactions);
  cacheUserReaction(messageId, user.id, optimisticReactions.user_reaction);

  try {
    // Make the actual API call
    const { data, error } = await supabase.rpc('toggle_message_reaction', {
      message_id_param: messageId,
      reaction_type_param: reactionType
    });
    
    if (error) throw error;
    
    // Remove optimistic update on success
    removeOptimisticUpdate(messageId);
    
    // Update cache with actual result
    const actualReactions = await getMessageReactionCounts(messageId);
    cacheMessageReactions(messageId, actualReactions);
    cacheUserReaction(messageId, user.id, actualReactions.user_reaction);
    
    return data;
  } catch (error) {
    // On error, revert optimistic update
    removeOptimisticUpdate(messageId);
    cacheMessageReactions(messageId, currentReactions);
    cacheUserReaction(messageId, user.id, previousReaction);
    throw error;
  }
}

// Batch fetch reactions for multiple messages
export async function getMessageReactionsBatch(messageIds: string[]): Promise<Record<string, ReactionData>> {
  const results: Record<string, ReactionData> = {};
  
  // Try to get as many as possible from cache
  const cachedResults = await Promise.all(
    messageIds.map(async (messageId) => {
      const cached = await getCachedMessageReactions(messageId);
      return { messageId, cached };
    })
  );

  // Collect message IDs that need to be fetched
  const uncachedIds = cachedResults
    .filter(result => !result.cached)
    .map(result => result.messageId);

  // Add cached results to results object
  cachedResults.forEach(({ messageId, cached }) => {
    if (cached) {
      results[messageId] = cached;
    }
  });

  // Fetch uncached reactions in parallel
  if (uncachedIds.length > 0) {
    const fetchPromises = uncachedIds.map(async (messageId) => {
      try {
        const reactions = await getMessageReactionCounts(messageId);
        results[messageId] = reactions;
      } catch (error) {
        console.error(`Error fetching reactions for message ${messageId}:`, error);
        // Fallback to default values
        results[messageId] = { likes_count: 0, dislikes_count: 0, user_reaction: null };
      }
    });

    await Promise.all(fetchPromises);
  }

  return results;
}

// Prefetch reactions for a list of messages
export async function prefetchMessageReactions(messageIds: string[]): Promise<void> {
  await prefetchReactions(messageIds, getMessageReactionCounts);
} 

/**
 * Clean up duplicate chats and ensure data consistency
 * This function should be run once to fix existing duplicate chats
 */
export async function cleanupDuplicateChats() {
  try {
    // Step 1: Get all non-group chats
    const { data: allChats, error: fetchError } = await supabase
      .from('chats')
      .select('*')
      .eq('is_group', false);
    
    if (fetchError) throw fetchError;
    
    // Step 2: Group chats by user pair (normalized)
    const chatGroups = new Map<string, Chat[]>();
    
    allChats?.forEach(chat => {
      if (chat.receiver_id) {
        const [smallerId, largerId] = [chat.user_id, chat.receiver_id].sort();
        const key = `${smallerId}-${largerId}`;
        
        if (!chatGroups.has(key)) {
          chatGroups.set(key, []);
        }
        chatGroups.get(key)!.push(chat);
      }
    });
    
    // Step 3: Process each group
    const chatsToDelete: string[] = [];
    const chatsToUpdate: { id: string; user_id: string; receiver_id: string }[] = [];
    
    for (const [key, chats] of chatGroups) {
      if (chats.length > 1) {
        // Sort by created_at to keep the oldest
        chats.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        const [smallerId, largerId] = key.split('-');
        const keepChat = chats[0];
        
        // Mark others for deletion
        chats.slice(1).forEach(chat => {
          chatsToDelete.push(chat.id);
        });
        
        // Update the kept chat to have consistent ordering
        if (keepChat.user_id !== smallerId || keepChat.receiver_id !== largerId) {
          chatsToUpdate.push({
            id: keepChat.id,
            user_id: smallerId,
            receiver_id: largerId
          });
        }
      } else if (chats.length === 1) {
        // Single chat - ensure consistent ordering
        const chat = chats[0];
        if (chat.receiver_id) {
          const [smallerId, largerId] = [chat.user_id, chat.receiver_id].sort();
          
          if (chat.user_id !== smallerId || chat.receiver_id !== largerId) {
            chatsToUpdate.push({
              id: chat.id,
              user_id: smallerId,
              receiver_id: largerId
            });
          }
        }
      }
    }
    
    // Step 4: Delete duplicate chats
    if (chatsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('chats')
        .delete()
        .in('id', chatsToDelete);
      
      if (deleteError) throw deleteError;
      console.log(`Deleted ${chatsToDelete.length} duplicate chats`);
    }
    
    // Step 5: Update chats for consistent ordering
    for (const update of chatsToUpdate) {
      const { error: updateError } = await supabase
        .from('chats')
        .update({
          user_id: update.user_id,
          receiver_id: update.receiver_id
        })
        .eq('id', update.id);
      
      if (updateError) throw updateError;
    }
    
    if (chatsToUpdate.length > 0) {
      console.log(`Updated ${chatsToUpdate.length} chats for consistent ordering`);
    }
    
    return {
      success: true,
      deletedCount: chatsToDelete.length,
      updatedCount: chatsToUpdate.length
    };
  } catch (error) {
    console.error('Error cleaning up duplicate chats:', error);
    return {
      success: false,
      error
    };
  }
}

/**
 * Check for duplicate chats in the database
 */
export async function checkForDuplicateChats() {
  try {
    const { data: allChats, error: fetchError } = await supabase
      .from('chats')
      .select('*')
      .eq('is_group', false);
    
    if (fetchError) throw fetchError;
    
    const chatGroups = new Map<string, Chat[]>();
    
    allChats?.forEach(chat => {
      if (chat.receiver_id) {
        const [smallerId, largerId] = [chat.user_id, chat.receiver_id].sort();
        const key = `${smallerId}-${largerId}`;
        
        if (!chatGroups.has(key)) {
          chatGroups.set(key, []);
        }
        chatGroups.get(key)!.push(chat);
      }
    });
    
    const duplicates = Array.from(chatGroups.entries())
      .filter(([, chats]) => chats.length > 1)
      .map(([userPair, chats]) => ({
        userPair,
        chatCount: chats.length,
        chatIds: chats.map(c => c.id)
      }));
    
    return {
      totalChats: allChats?.length || 0,
      duplicateGroups: duplicates.length,
      duplicates
    };
  } catch (error) {
    console.error('Error checking for duplicate chats:', error);
    return {
      error
    };
  }
} 