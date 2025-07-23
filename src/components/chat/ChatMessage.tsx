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
    processingTime?: string; // Add processing time for AI messages
  };
  isOwn: boolean;
}

// Function to format message content with markdown-style formatting
const formatMessageContent = (content: string) => {
  // Split content into lines to handle line breaks
  const lines = content.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Handle bold formatting (**text**)
    const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Create React elements for the formatted line
    const parts = formattedLine.split(/(<strong>.*?<\/strong>)/);
    const elements = parts.map((part, partIndex) => {
      if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
        // Extract the text between strong tags
        const boldText = part.replace(/<\/?strong>/g, '');
        return (
          <strong key={`${lineIndex}-${partIndex}`} className="font-semibold">
            {boldText}
          </strong>
        );
      }
      return part;
    });

    return (
      <React.Fragment key={lineIndex}>
        {elements}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwn }) => {
  // Parse the timestamp string to a Date object
  const messageDate = new Date(message.timestamp);
  const now = new Date();

  // Check if the message is from today
  const isToday =
    messageDate.getFullYear() === now.getFullYear() &&
    messageDate.getMonth() === now.getMonth() &&
    messageDate.getDate() === now.getDate();

  const formattedTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = messageDate.toLocaleDateString();
  const formattedDateTime = `${formattedTime} on ${formattedDate}`;

  if (isOwn) {
    // User message - simple right-aligned design
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[85%]">
          <div className="px-4 py-3 rounded-2xl bg-blue-500 text-white">
            {message.isImage ? (
              <div className="relative">
                <Image className="h-6 w-6 text-gray-400 absolute inset-0 m-auto" aria-hidden="true" aria-label="Image icon" />
                <div className="w-full h-40 bg-gray-200 rounded flex items-center justify-center">
                  <p className="text-sm text-gray-500">Image</p>
                </div>
              </div>
            ) : (
              <div className="leading-relaxed">
                {formatMessageContent(message.content)}
              </div>
            )}
          </div>
          <div className="text-xs mt-2 flex items-center justify-end text-gray-400">
            <span>{isToday ? formattedTime : formattedDateTime}</span>
            <span className="ml-2">
              {message.status === 'read' ? (
                <CheckCheck className="h-3 w-3 text-blue-400" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          </div>
        </div>
        <button className="p-1 rounded-full hover:bg-gray-100 transition-colors opacity-0 hover:opacity-100 focus:opacity-100 ml-2 self-start mt-1">
          <MoreVertical className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    );
  }

  // AI/Other message - with avatar, name, and processing time
  return (
    <div className="flex justify-start mb-6">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 flex items-center justify-center text-white mr-3 self-start mt-1 text-sm font-medium">
        {message.sender.name.charAt(0)}
      </div>
      
      <div className="flex-1 max-w-[85%]">
        {/* Message header with name and processing time */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{message.sender.name}</span>
            {message.processingTime && (
              <span className="text-sm text-gray-500">{message.processingTime}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{formattedDateTime}</span>
            <button className="p-1 rounded-full hover:bg-gray-100 transition-colors opacity-0 hover:opacity-100 focus:opacity-100">
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
        
        {/* Message content */}
        <div className="px-4 py-3 rounded-2xl bg-gray-50 text-gray-900">
          {message.isImage ? (
            <div className="relative">
              <Image className="h-6 w-6 text-gray-400 absolute inset-0 m-auto" aria-hidden="true" aria-label="Image icon" />
              <div className="w-full h-40 bg-gray-200 rounded flex items-center justify-center">
                <p className="text-sm text-gray-500">Image</p>
              </div>
            </div>
          ) : (
            <div className="leading-relaxed">
              {formatMessageContent(message.content)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 