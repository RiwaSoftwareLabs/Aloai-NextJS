"use client";

import React, { useState, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCurrentUser } from '@/lib/supabase/auth';
import { chatWithAIBrain, getUserAIBrainId, getMessagesForChat, getChatsForUser } from '@/lib/supabase/aiChat';
import type { Chat } from '@/lib/supabase/aiChat';
import type { Friend } from '@/lib/supabase/friendship';
import type { AIBrain } from '@/lib/supabase/ai_brain';

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
  aiBrainId?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ chatId, chat, friendId, aiBrainId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);
  const [aiBrainIdState, setAIBrainId] = useState<string | null>(null);
  const [chatInfo, setChatInfo] = useState<Chat | undefined>(chat);
  const [friendInfo, setFriendInfo] = useState<Friend | null>(null);
  const [aiBrainInfo, setAIBrainInfo] = useState<AIBrain | null>(null);

  // Fetch user and AI Brain IDs on mount
  useEffect(() => {
    async function fetchUserAndBrain() {
      const { user } = await getCurrentUser();
      if (user && user.id) {
        setUserId(user.id);
        try {
          const aiId = await getUserAIBrainId(user.id);
          setAIBrainId(aiId);
        } catch {
          // fallback: do nothing
        }
      }
    }
    fetchUserAndBrain();
  }, []);

  // Fetch messages for this chat
  useEffect(() => {
    async function fetchMessages() {
      if (chatId) {
        const dbMessages = await getMessagesForChat(chatId);
        setMessages(
          (dbMessages as DBMessage[]).map((msg) => ({
            id: msg.id,
            content: msg.content,
            sender: {
              id: msg.sender_id,
              name: msg.sender_id === userId ? 'You' : 'AI',
            },
            timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: msg.sender_id === userId ? 'sent' : 'delivered',
          }))
        );
      }
    }
    if (chatId && userId) fetchMessages();
  }, [chatId, userId]);

  // Fetch chat info if not provided
  useEffect(() => {
    async function fetchChatInfo() {
      if (!chat && chatId && userId) {
        const chats = await getChatsForUser(userId);
        const found = chats.find(c => c.id === chatId);
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
            const found = friendsResult.data.find((f: Friend) => f.userId === friendId);
            setFriendInfo(found || null);
          }
        }
      } else {
        setFriendInfo(null);
      }
    }
    fetchFriend();
  }, [friendId]);

  // Fetch AI brain info if aiBrainId is provided
  useEffect(() => {
    async function fetchAIBrain() {
      if (aiBrainId) {
        const { getAIBrainsByUserId } = await import('@/lib/supabase/ai_brain');
        const { session } = await import('@/lib/supabase/auth').then(m => m.checkSession());
        if (session && session.user) {
          const userId = session.user.id;
          const aiBrainsResult = await getAIBrainsByUserId(userId);
          if (aiBrainsResult.success && aiBrainsResult.data) {
            const found = aiBrainsResult.data.find((b: AIBrain) => b.id === aiBrainId);
            setAIBrainInfo(found || null);
          }
        }
      } else {
        setAIBrainInfo(null);
      }
    }
    fetchAIBrain();
  }, [aiBrainId]);

  const handleSendMessage = async (content: string) => {
    if (!userId || !aiBrainIdState) return;
    setLoading(true);
    try {
      const result = await chatWithAIBrain({
        userId,
        aiBrainId: aiBrainIdState,
        userMessage: content,
      });
      setMessages(
        (result.messages as DBMessage[]).map((msg) => ({
          id: msg.id,
          content: msg.content,
          sender: {
            id: msg.sender_id,
            name: msg.sender_id === userId ? 'You' : 'AI',
          },
          timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: msg.sender_id === userId ? 'sent' : 'delivered',
        }))
      );
    } catch {
      // Optionally show error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <ChatHeader chat={(() => {
        if (friendInfo) {
          // Friend header: display_name and initials (first two letters)
          return {
            id: friendInfo.userId,
            name: friendInfo.displayName,
            isAI: false,
            status: 'Online',
            icon: undefined,
            initials: friendInfo.displayName
              ? friendInfo.displayName.split(' ').map((p: string) => p[0]).join('').substring(0, 2).toUpperCase()
              : 'U',
          };
        } else if (aiBrainInfo) {
          // AI header: display name and icon by type
          return {
            id: aiBrainInfo.id,
            name: aiBrainInfo.name,
            isAI: true,
            status: 'Online',
            icon: aiBrainInfo.type === 'super' ? '/icons/super-ai-brain.png' : '/icons/ai-brain.png',
          };
        } else if (chatInfo) {
          // Default chat header (existing logic)
          return {
            id: chatInfo.id,
            name: chatInfo.ai_brain?.name || chatInfo.title || 'Chat',
            isAI: !!chatInfo.isAI,
            status: 'Online',
            icon: chatInfo.ai_brain?.type === 'super' ? '/icons/super-ai-brain.png' : chatInfo.isAI ? '/icons/ai-brain.png' : undefined,
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