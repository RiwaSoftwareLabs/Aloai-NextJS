"use client";

import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCurrentUser, getUserLastSeen, formatLastSeenAgo, updateLastSeen } from '@/lib/supabase/auth';
import { sendMessage, getMessagesForChatPaginated, getRecentChatsForUser, getOrCreateChatBetweenUsers, getMessageReadStatus, getMessageStatus } from '@/lib/supabase/aiChat';
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
  status: 'sent' | 'delivered' | 'read';
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
  const [loadingOldMessages, setLoadingOldMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const { t } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);
  const [chatInfo, setChatInfo] = useState<Chat | undefined>(chat);
  const [friendInfo, setFriendInfo] = useState<FriendWithType | null>(null);
  const [friendLastSeen, setFriendLastSeen] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<string>('Offline');
  const lastSeenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [readMessageIds, setReadMessageIds] = useState<string[]>([]);

  // Refs for scroll handling
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when messages or loading changes (but not when loading old messages)
  useEffect(() => {
    if (bottomRef.current && !loadingOldMessages) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, loadingOldMessages]);

  // Handle scroll to load old messages
  const handleScroll = async () => {
    if (!messagesContainerRef.current || loadingOldMessages || !hasMoreMessages) return;

    const { scrollTop } = messagesContainerRef.current;
    
    // Load more messages when user scrolls near the top (within 100px)
    if (scrollTop < 100 && messages.length > 0) {
      setLoadingOldMessages(true);
      
      // Store the current scroll height and scroll position
      const currentScrollHeight = messagesContainerRef.current.scrollHeight;
      const currentScrollTop = messagesContainerRef.current.scrollTop;
      
      try {
        const oldestMessage = messages[0];
        const oldMessages = await getMessagesForChatPaginated(
          chatInfo!.id,
          20,
          oldestMessage.timestamp
        );
        
        if (oldMessages.length === 0) {
          setHasMoreMessages(false);
        } else {
          // Convert DB messages to UI messages format
          const uiOldMessages: Message[] = oldMessages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            sender: {
              id: msg.sender_id,
              name: msg.sender_id === userId ? 'You' : (friendInfo?.displayName || 'Unknown'),
            },
            timestamp: msg.created_at,
            status: getMessageStatus(msg, userId!, {}),
          }));
          setMessages(prev => [...uiOldMessages, ...prev]);
        }
      } catch (error) {
        console.error('Error loading old messages:', error);
      } finally {
        setLoadingOldMessages(false);
        
        // Restore scroll position after new messages are loaded
        setTimeout(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            const heightDifference = newScrollHeight - currentScrollHeight;
            messagesContainerRef.current.scrollTop = currentScrollTop + heightDifference;
          }
        }, 100);
      }
    }
  };

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

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [messages, loadingOldMessages, hasMoreMessages, chatInfo?.id, userId, friendInfo]);

  // Fetch messages for this chat
  useEffect(() => {
    // Clear messages when chatId or friendId changes
    setMessages([]);
    setHasMoreMessages(true);
    async function fetchMessages() {
      let resolvedChatId = chatId;
      // If only friendId is provided, get or create the chat and use its id
      if (!resolvedChatId && friendId && userId) {
        const chat = await getOrCreateChatBetweenUsers(userId, friendId);
        resolvedChatId = chat.id;
        setChatInfo(chat);
      }
      if (resolvedChatId) {
        // Load initial messages with pagination (most recent 20 messages)
        const dbMessages = await getMessagesForChatPaginated(resolvedChatId, 20);
        
        // Get read status for all messages
        const readStatus = await getMessageReadStatus(resolvedChatId, userId!);
        
        setMessages(
          (dbMessages as DBMessage[]).map((msg) => ({
            id: msg.id,
            content: msg.content,
            sender: {
              id: msg.sender_id,
              name: msg.sender_id === userId ? 'You' : (friendInfo?.displayName || 'Unknown'),
            },
            timestamp: msg.created_at, // Pass the ISO string
            status: getMessageStatus(msg, userId!, readStatus),
          }))
        );
        
        // Check if there are more messages to load
        if (dbMessages.length < 20) {
          setHasMoreMessages(false);
        }
        
        // Mark messages as read
        if (userId) {
          try {
            await fetch('/api/messages/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId: resolvedChatId, userId }),
            });
          } catch (error) {
            console.error('Failed to mark messages as read:', error);
          }
        }
        // Trigger unread count refresh in sidebar
        window.dispatchEvent(new Event('refresh-unread-counts'));
        
        // Update read message ids for new message indicator
        if (userId && dbMessages.length > 0) {
          const messageIds = (dbMessages as DBMessage[]).map((m) => m.id);
          const { data } = await supabase
            .from('message_reads')
            .select('message_id')
            .eq('user_id', userId)
            .in('message_id', messageIds);
          setReadMessageIds(data?.map((r: { message_id: string }) => r.message_id) || []);
        } else {
          setReadMessageIds([]);
        }
      }
    }
    if ((chatId || friendId) && userId) fetchMessages();
  }, [chatId, userId, friendId, friendInfo]);

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

  // Subscribe to real-time messages and read receipts for the current chat
  useEffect(() => {
    if (!chatInfo || !chatInfo.id || !userId) return;
    
    const channel = supabase.channel(`chat:${chatInfo.id}:${userId}`);
    
    // Subscribe to new messages
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatInfo.id}`,
        },
        async (payload) => {
          const msg = payload.new;
          const newMessage: Message = {
            id: msg.id,
            content: msg.content,
            sender: {
              id: msg.sender_id,
              name: msg.sender_id === userId ? 'You' : (friendInfo?.displayName || 'Unknown'),
            },
            timestamp: msg.created_at, // Pass the ISO string
            status: msg.sender_id === userId ? 'sent' : 'delivered',
          };
          
          setMessages((prev) => [...prev, newMessage]);
          
          // If this is a message from someone else, mark it as read immediately
          if (msg.sender_id !== userId) {
            try {
              await fetch('/api/messages/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: chatInfo.id, userId }),
              });
              // Update the message status to read
              setMessages((prev) => 
                prev.map((m) => 
                  m.id === msg.id ? { ...m, status: 'read' } : m
                )
              );
            } catch (error) {
              console.error('Failed to mark message as read:', error);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
        },
        async (payload) => {
          const readRecord = payload.new;
          // Check if this read record is for a message in our current chat
          const { data: message } = await supabase
            .from('messages')
            .select('chat_id, sender_id')
            .eq('id', readRecord.message_id)
            .single();
          
          if (message && message.chat_id === chatInfo.id && message.sender_id === userId) {
            // This is a read receipt for our message, update the status
            setMessages((prev) => 
              prev.map((m) => 
                m.id === readRecord.message_id ? { ...m, status: 'read' } : m
              )
            );
          }
        }
      )
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    };
  }, [chatInfo?.id, userId, friendInfo]);

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
      timestamp: new Date().toISOString(), // Use ISO string
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
                timestamp: data.userMsg.created_at, // Use ISO string
                status: 'sent',
              } as Message
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
              timestamp: data.aiMsg.created_at, // Use ISO string
              status: 'delivered',
            } as Message,
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
                timestamp: sentMsg.created_at, // Use ISO string
                status: sentMsg.sender_id === userId ? 'sent' : 'delivered',
              } as Message
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
    <div className="flex flex-col h-full w-full bg-white">
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
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4 bg-white w-full">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">{t('chat.noMessages')}</p>
            <p className="text-sm">{t('chat.startConversation')}</p>
          </div>
        ) : (
          <div className="w-full space-y-2">
            {/* Loading old messages indicator */}
            {loadingOldMessages && (
              <div className="flex justify-center py-4">
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                  <span className="text-sm">Loading old messages...</span>
                </div>
              </div>
            )}
            {(() => {
              const newMessageIndex = messages.findIndex(m => !readMessageIds.includes(m.id) && m.sender.id !== userId);
              return messages.map((message, idx) => {
                const isOwnMessage = userId ? message.sender.id === userId : false;
                const nextMessage = messages[idx + 1];
                const isNextMessageOwn = nextMessage ? (userId ? nextMessage.sender.id === userId : false) : null;
                
                // Check if we should show a separator (only for AI conversations)
                // Separator should appear after receiver (AI) message when next message is from sender (user)
                const shouldShowSeparator = friendInfo && 
                  (friendInfo.user_type === 'ai' || friendInfo.user_type === 'super-ai') && 
                  !isOwnMessage && // Current message is from AI (receiver)
                  nextMessage && 
                  isNextMessageOwn; // Next message is from user (sender)
                
                return (
                  <React.Fragment key={message.id}>
                    {idx === newMessageIndex && (
                      <div className="text-center my-4 text-xs text-blue-500 font-semibold">New Message</div>
                    )}
                    <ChatMessage 
                      message={message} 
                      isOwn={isOwnMessage} 
                    />
                    {/* Message separator for AI conversations */}
                    {shouldShowSeparator && (
                      <div className="flex items-center justify-center my-4">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <div className="flex-1 h-px bg-gray-200"></div>
                      </div>
                    )}
                  </React.Fragment>
                );
              });
            })()}
            {loading && friendInfo && (friendInfo.user_type === 'ai' || friendInfo.user_type === 'super-ai') && (
              <div className="flex justify-start mb-6">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-3 self-start mt-1">
                  AI
                </div>
                <div className="max-w-[85%]">
                  <div className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-900">
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