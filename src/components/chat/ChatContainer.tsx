"use client";

import React, { useState, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCurrentUser } from '@/lib/supabase/auth';
import { sendMessage, getMessagesForChat, getRecentChatsForUser, getOrCreateChatBetweenUsers } from '@/lib/supabase/aiChat';
import type { Chat } from '@/lib/supabase/aiChat';
import type { Friend } from '@/lib/supabase/friendship';

// Define a more flexible message type
interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
  };
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  isImage?: boolean;
}

// DBMessage type for messages from Supabase
interface DBMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_deleted?: boolean;
  is_edited?: boolean;
}

interface ChatContainerProps {
  chatId?: string;
  chat?: Chat;
  friendId?: string;
}

type FriendWithType = Friend & { user_type?: string };

const ChatContainer: React.FC<ChatContainerProps> = ({ chatId, chat, friendId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);
  const [chatInfo, setChatInfo] = useState<Chat | undefined>(chat);
  const [friendInfo, setFriendInfo] = useState<FriendWithType | null>(null);

  // Fetch user on mount
  useEffect(() => {
    async function fetchUser() {
      const { user } = await getCurrentUser();
      if (user && user.id) {
        setUserId(user.id);
      }
    }
    fetchUser();
  }, []);

  // Fetch messages for this chat
  useEffect(() => {
    // Clear messages when chatId or friendId changes
    setMessages([]);
    async function fetchMessages() {
      let resolvedChatId = chatId;
      // If only friendId is provided, get or create the chat and use its id
      if (!resolvedChatId && friendId && userId) {
        const chat = await getOrCreateChatBetweenUsers(userId, friendId);
        resolvedChatId = chat.id;
        setChatInfo(chat);
      }
      if (resolvedChatId) {
        const dbMessages = await getMessagesForChat(resolvedChatId);
        setMessages(
          (dbMessages as DBMessage[]).map((msg) => ({
            id: msg.id,
            content: msg.content,
            sender: {
              id: msg.sender_id,
              name: msg.sender_id === userId ? 'You' : 'Other',
            },
            timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: msg.sender_id === userId ? 'sent' : 'delivered',
          }))
        );
      }
    }
    if ((chatId || friendId) && userId) fetchMessages();
  }, [chatId, userId, friendId]);

  // Fetch chat info if not provided
  useEffect(() => {
    async function fetchChatInfo() {
      if (!chat && chatId && userId) {
        const chats = await getRecentChatsForUser(userId);
        const found = chats.find((c: Chat) => c.id === chatId);
        setChatInfo(found);
      } else if (chat) {
        setChatInfo(chat);
      }
    }
    if (chatId && userId) fetchChatInfo();
  }, [chatId, userId, chat]);

  // Fetch friend info if friendId is provided
  useEffect(() => {
    async function fetchFriend() {
      if (friendId) {
        // Dynamically import getFriends to avoid circular deps
        const { getFriends } = await import('@/lib/supabase/friendship');
        const { session } = await import('@/lib/supabase/auth').then(m => m.checkSession());
        if (session && session.user) {
          const userId = session.user.id;
          const friendsResult = await getFriends(userId);
          if (friendsResult.success) {
            const found = friendsResult.data.find((f: Friend) => f.userId === friendId) as FriendWithType | undefined;
            if (found) {
              // Fetch user_type from users table if not present
              if (!('user_type' in found)) {
                const { data: userData } = await import('@/lib/supabase/client').then(({ supabase }) =>
                  supabase.from('users').select('user_type').eq('user_id', found.userId).single()
                );
                setFriendInfo({ ...found, user_type: userData?.user_type });
              } else {
                setFriendInfo(found);
              }
            } else {
              setFriendInfo(null);
            }
          }
        }
      } else {
        setFriendInfo(null);
      }
    }
    fetchFriend();
  }, [friendId]);

  const handleSendMessage = async (content: string) => {
    if (!userId || !friendId) return;
    setLoading(true);
    // Optimistically add the message to the UI
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      content,
      sender: {
        id: userId,
        name: 'You',
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };
    console.log('Appending optimistic message:', optimisticMessage);
    setMessages((prev) => {
      const updated = [...prev, optimisticMessage];
      console.log('Messages after optimistic append:', updated);
      return updated;
    });
    try {
      console.log('Calling sendMessage API...');
      const sentMsg = await sendMessage({
        senderId: userId,
        receiverId: friendId,
        content,
      });
      console.log('sendMessage API result:', sentMsg);
      // Replace the optimistic message with the real one
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === optimisticId
            ? {
                id: sentMsg.id,
                content: sentMsg.content,
                sender: {
                  id: sentMsg.sender_id,
                  name: sentMsg.sender_id === userId ? 'You' : 'Other',
                },
                timestamp: new Date(sentMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: (sentMsg.sender_id === userId ? 'sent' : 'delivered') as 'sent' | 'delivered',
              }
            : msg
        );
        console.log('Messages after replacing optimistic with real:', updated);
        return updated;
      });
    } catch (err) {
      console.error('sendMessage API error:', err);
      // Remove the optimistic message if sending fails
      setMessages((prev) => {
        const updated = prev.filter((msg) => msg.id !== optimisticId);
        console.log('Messages after removing failed optimistic:', updated);
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <ChatHeader chat={(() => {
        if (friendInfo) {
          // Friend header: display_name and initials (first two letters)
          let icon;
          if (friendInfo.user_type === 'ai') {
            icon = '/icons/ai-brain.png';
          } else if (friendInfo.user_type === 'super-ai') {
            icon = '/icons/super-ai-brain.png';
          }
          return {
            id: friendInfo.userId,
            name: friendInfo.displayName,
            isAI: friendInfo.user_type === 'ai' || friendInfo.user_type === 'super-ai',
            status: 'Online',
            icon,
            initials: friendInfo.displayName
              ? friendInfo.displayName.split(' ').map((p: string) => p[0]).join('').substring(0, 2).toUpperCase()
              : 'U',
          };
        } else if (chatInfo) {
          // Default chat header (existing logic)
          return {
            id: chatInfo.id,
            name: chatInfo.title || 'Chat',
            isAI: false,
            status: 'Online',
            icon: undefined,
          };
        }
        return undefined;
      })()} />
      <div className="flex-1 overflow-y-auto px-3 py-6 bg-white w-full">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">{t('chat.noMessages')}</p>
            <p className="text-sm">{t('chat.startConversation')}</p>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {messages.map(message => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                isOwn={userId ? message.sender.id === userId : false} 
              />
            ))}
            {loading && (
              <div className="text-center text-gray-400 italic">AI is typing...</div>
            )}
          </div>
        )}
      </div>
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatContainer; 