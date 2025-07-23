"use client";

import React from 'react';
import { Check, CheckCheck, MoreVertical, Image, Download, ExternalLink, Forward } from 'lucide-react';
import MessageActions from './MessageActions';
import { getFileIcon, formatFileSize } from '@/lib/supabase/fileUpload';
import { useLanguage } from '@/contexts/LanguageContext';

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
    attachment?: {
      url: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    };
    reactions?: {
      likes_count: number;
      dislikes_count: number;
      user_reaction: 'like' | 'dislike' | null;
    };
    is_forwarded?: boolean;
  };
  isOwn: boolean;
  onReactionUpdate?: (messageId: string, reactions: {
    likes_count: number;
    dislikes_count: number;
    user_reaction: 'like' | 'dislike' | null;
  }) => void;
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

// Component to display file attachments
const FileAttachment: React.FC<{ attachment: ChatMessageProps['message']['attachment'] }> = ({ attachment }) => {
  if (!attachment) return null;

  const isImage = attachment.fileType.startsWith('image/');
  const fileIcon = getFileIcon(attachment.fileType);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpen = () => {
    window.open(attachment.url, '_blank');
  };

  if (isImage) {
    return (
      <div className="mt-2 inline-block relative group">
        <img 
          src={attachment.url} 
          alt={attachment.fileName}
          className="max-w-full max-h-64 object-contain rounded-md"
          onClick={handleOpen}
          style={{ cursor: 'pointer' }}
        />
        <button
          onClick={handleDownload}
          className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full transition-all opacity-0 group-hover:opacity-100"
          title="Download"
        >
          <Download className="h-4 w-4 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-lg">{fileIcon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {attachment.fileName}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(attachment.fileSize)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleOpen}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title="Open"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title="Download"
            >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwn, onReactionUpdate }) => {
  const { t } = useLanguage();
  
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

  return (
    <>
      {isOwn ? (
        // User message - simple right-aligned design
        <div className="flex justify-end mb-6">
          <div className="max-w-[85%]">
            {message.attachment && message.attachment.fileType.startsWith('image/') ? (
              // For images, display without message background
              <div>
                {message.content && (
                  <div className="px-4 py-3 rounded-2xl bg-blue-500 text-white mb-2">
                    <div className="leading-relaxed">
                      {formatMessageContent(message.content)}
                    </div>
                  </div>
                )}
                <FileAttachment attachment={message.attachment} />
              </div>
            ) : (
              // For non-image attachments or text-only messages, use normal background
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
                {message.attachment && (
                  <FileAttachment attachment={message.attachment} />
                )}
              </div>
            )}
            <div className="text-xs mt-2 flex items-center justify-end text-gray-400">
              {message.is_forwarded && (
                <span className="flex items-center mr-2 text-blue-500">
                  <Forward className="h-3 w-3 mr-1" />
                  {t('share.forwarded')}
                </span>
              )}
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
      ) : (
        // AI/Other message - with avatar, name, and processing time
        <div className="flex justify-start mb-6 group" data-message-id={message.id}>
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
            {message.is_forwarded && (
              <span className="flex items-center text-blue-500 text-sm">
                <Forward className="h-3 w-3 mr-1" />
                {t('share.forwarded')}
              </span>
            )}
            <span className="text-sm text-gray-500">{formattedDateTime}</span>
            <button className="p-1 rounded-full hover:bg-gray-100 transition-colors opacity-0 hover:opacity-100 focus:opacity-100">
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>
          </div>
            </div>
            
            {/* Message content */}
            {message.attachment && message.attachment.fileType.startsWith('image/') ? (
              // For images, display without message background
              <div>
                {message.content && (
                  <div className="px-4 py-3 rounded-2xl bg-gray-50 text-gray-900 mb-2">
                    <div className="leading-relaxed">
                      {formatMessageContent(message.content)}
                    </div>
                  </div>
                )}
                <FileAttachment attachment={message.attachment} />
              </div>
            ) : (
              // For non-image attachments or text-only messages, use normal background
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
                {message.attachment && (
                  <FileAttachment attachment={message.attachment} />
                )}
              </div>
            )}
            
                    {/* Message actions for friend messages */}
        {!isOwn && message.reactions && onReactionUpdate && (
          <MessageActions
            messageId={message.id}
            message={message}
            reactions={message.reactions}
            onReactionUpdate={onReactionUpdate}
          />
        )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatMessage; 