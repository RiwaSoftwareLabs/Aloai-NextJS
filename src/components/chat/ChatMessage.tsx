"use client";

import React from 'react';
import { Check, CheckCheck, MoreVertical, Image } from 'lucide-react';

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    sender: {
      id: string;
      name: string;
    };
    timestamp: string;
    status?: 'sent' | 'delivered' | 'read';
    isImage?: boolean;
  };
  isOwn: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwn }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isOwn && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mr-2 self-end">
          {message.sender.name.charAt(0)}
        </div>
      )}
      
      <div className={`max-w-[80%]`}>
        <div 
          className={`
            rounded-2xl px-4 py-2 
            ${isOwn ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-100 text-black rounded-bl-none border border-gray-400'}
          `}
        >
          {message.isImage ? (
            <div className="relative">
              <Image className="h-6 w-6 text-gray-400 absolute inset-0 m-auto" aria-hidden="true" />
              <div className="w-full h-40 bg-gray-200 rounded flex items-center justify-center">
                {/* Image placeholder - in a real app you'd have the actual image */}
                <p className="text-sm text-gray-500">Image</p>
              </div>
            </div>
          ) : (
            <p>{message.content}</p>
          )}
        </div>
        
        <div className={`text-xs mt-1 flex items-center ${isOwn ? 'justify-end' : 'justify-start'} text-gray-500`}>
          <span>{message.timestamp}</span>
          
          {isOwn && (
            <span className="ml-1">
              {message.status === 'read' ? (
                <CheckCheck className="h-3 w-3 text-blue-500" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
      
      <button className={`
        p-1 rounded-full hover:bg-gray-100 transition-colors opacity-0 hover:opacity-100 focus:opacity-100
        ${isOwn ? 'order-0 mr-1' : 'order-3 ml-1'}
      `}>
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  );
};

export default ChatMessage; 