"use client";

import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCurrentUser, getUserLastSeen, formatLastSeenAgo, updateLastSeen } from '@/lib/supabase/auth';
import { sendMessage, getMessagesForChat, getRecentChatsForUser, getOrCreateChatBetweenUsers } from '@/lib/supabase/aiChat';
import type { Chat } from '@/lib/supabase/aiChat';
import type { Friend } from '@/lib/supabase/friendship';
import { supabase } from '@/lib/supabase/client';

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
  const [friendLastSeen, setFriendLastSeen] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<string>('Offline');
  const lastSeenIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Ref for auto-scrolling to bottom
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when messages or loading changes
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

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

  // Efficiently update last_seen for the logged-in user
  useEffect(() => {
    let isActive = true;
    function startLastSeenInterval() {
      if (lastSeenIntervalRef.current) clearInterval(lastSeenIntervalRef.current);
      lastSeenIntervalRef.current = setInterval(() => {
        if (userId && isActive) updateLastSeen();
      }, 30000); // 30 seconds
    }
    function stopLastSeenInterval() {
      if (lastSeenIntervalRef.current) {
        clearInterval(lastSeenIntervalRef.current);
        lastSeenIntervalRef.current = null;
      }
    }
    // On mount, update immediately and start interval if userId
    if (userId) {
      updateLastSeen();
      startLastSeenInterval();
    }
    // Listen for tab focus/blur
    function onFocus() {
      if (userId) {
        updateLastSeen();
        startLastSeenInterval();
      }
    }
    function onBlur() {
      stopLastSeenInterval();
    }
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      isActive = false;
      stopLastSeenInterval();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, [userId]);

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
              let userType = found.user_type;
              if (!('user_type' in found)) {
                const { data: userData } = await import('@/lib/supabase/client').then(({ supabase }) =>
                  supabase.from('users').select('user_type').eq('user_id', found.userId).single()
                );
                userType = userData?.user_type;
              }
              setFriendInfo({ ...found, user_type: userType });
              // If AI or super-ai, always show online
              if (userType === 'ai' || userType === 'super-ai') {
                setFriendStatus('Online');
                setFriendLastSeen(null);
              } else {
                // Fetch last_seen
                const { last_seen } = await getUserLastSeen(found.userId);
                setFriendLastSeen(last_seen);
                // Determine online status
                if (last_seen) {
                  const now = new Date();
                  const seen = new Date(last_seen);
                  const diffSec = (now.getTime() - seen.getTime()) / 1000;
                  setFriendStatus(diffSec < 5 ? 'Online' : formatLastSeenAgo(last_seen));
                } else {
                  setFriendStatus('Offline');
                }
              }
            } else {
              setFriendInfo(null);
              setFriendLastSeen(null);
              setFriendStatus('Offline');
            }
          }
        }
      } else {
        setFriendInfo(null);
        setFriendLastSeen(null);
        setFriendStatus('Offline');
      }
    }
    fetchFriend();
  }, [friendId]);

  // Subscribe to real-time messages for the current chat
  useEffect(() => {
    if (!chatInfo || !chatInfo.id) return;
    const channel = supabase.channel(`messages:chat:${chatInfo.id}`);
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatInfo.id}`,
        },
        (payload) => {
          const msg = payload.new;
          setMessages((prev) => [
            ...prev,
            {
              id: msg.id,
              content: msg.content,
              sender: {
                id: msg.sender_id,
                name: msg.sender_id === userId ? 'You' : 'Other',
              },
              timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: msg.sender_id === userId ? 'sent' : 'delivered',
            },
          ]);
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [chatInfo?.id, userId]);

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
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      // If friend is AI, use the new API
      if (friendInfo && (friendInfo.user_type === 'ai' || friendInfo.user_type === 'super-ai')) {
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: userId, receiverId: friendId, content }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        // Replace optimistic message with real user message
        setMessages((prev) => prev.map((msg) =>
          msg.id === optimisticId
            ? {
                id: data.userMsg.id,
                content: data.userMsg.content,
                sender: { id: data.userMsg.sender_id, name: 'You' },
                timestamp: new Date(data.userMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'sent',
              }
            : msg
        ));
        // Append AI reply
        if (data.aiMsg) {
          setMessages((prev) => [
            ...prev,
            {
              id: data.aiMsg.id,
              content: data.aiMsg.content,
              sender: { id: data.aiMsg.sender_id, name: friendInfo.displayName },
              timestamp: new Date(data.aiMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'delivered',
            },
          ]);
        }
      } else {
        // Normal user-to-user message
        const sentMsg = await sendMessage({
          senderId: userId,
          receiverId: friendId,
          content,
        });
        setMessages((prev) => prev.map((msg) =>
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
        ));
      }
    } catch (err) {
      // Log the error for debugging
      console.error('Error sending message:', err);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
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
            status: friendStatus,
            last_seen: friendLastSeen,
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
            {loading && friendInfo && (friendInfo.user_type === 'ai' || friendInfo.user_type === 'super-ai') && (
              <div className="flex justify-start mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mr-2 self-end">
                  AI
                </div>
                <div className="max-w-[80%]">
                  <div className="rounded-2xl px-4 py-2 bg-gray-100 text-black rounded-bl-none border border-gray-400">
                    <span className="italic text-gray-500">AI is typing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatContainer; 