"use client";

import React, { useState } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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

// Dummy data for messages
const DUMMY_MESSAGES: Message[] = [
  {
    id: '1',
    content: 'Hello! How can I help you today?',
    sender: { id: 'ai', name: 'U' },
    timestamp: '02:00 PM',
    status: 'read'
  },
  {
    id: '2',
    content: "I need help with setting up my account.",
    sender: { id: 'user', name: 'You' },
    timestamp: '02:01 PM',
    status: 'read'
  },
  {
    id: '3',
    content: 'Sure, I can help with that. What specific part are you having trouble with?',
    sender: { id: 'ai', name: 'U' },
    timestamp: '02:02 PM',
    status: 'read'
  },
  {
    id: '4',
    content: "I cant seem to verify my email address.",
    sender: { id: 'user', name: 'You' },
    timestamp: '02:03 PM',
    status: 'delivered'
  }
];

interface ChatContainerProps {
  chatId?: string;
  userId?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ 
  userId = 'user'
}) => {
  const [messages, setMessages] = useState<Message[]>(DUMMY_MESSAGES);
  const { t } = useLanguage();
  
  const handleSendMessage = (content: string) => {
    if (content.trim()) {
      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        content,
        sender: { id: userId, name: 'You' },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent'
      };
      
      setMessages([...messages, newMessage]);
      
      // Simulate received message after a delay
      setTimeout(() => {
        const replyMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          content: "I'll help you with email verification. Let me check what might be causing the issue.",
          sender: { id: 'ai', name: 'U' },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        
        setMessages(prev => [...prev, replyMessage]);
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <ChatHeader />
      
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
                isOwn={message.sender.id === userId} 
              />
            ))}
          </div>
        )}
      </div>
      
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatContainer; 