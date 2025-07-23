"use client";

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { toggleMessageReaction } from '@/lib/supabase/aiChat';

interface MessageActionsProps {
  messageId: string;
  reactions: {
    likes_count: number;
    dislikes_count: number;
    user_reaction: 'like' | 'dislike' | null;
  };
  onReactionUpdate: (messageId: string, reactions: {
    likes_count: number;
    dislikes_count: number;
    user_reaction: 'like' | 'dislike' | null;
  }) => void;
}

const MessageActions: React.FC<MessageActionsProps> = ({ 
  messageId, 
  reactions, 
  onReactionUpdate 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReaction = async (reactionType: 'like' | 'dislike') => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await toggleMessageReaction(messageId, reactionType);
      
      // Update local state based on the result
      const newReactions = { ...reactions };
      
      if (result === null) {
        // Reaction was removed
        if (reactions.user_reaction === 'like') {
          newReactions.likes_count = Math.max(0, reactions.likes_count - 1);
        } else if (reactions.user_reaction === 'dislike') {
          newReactions.dislikes_count = Math.max(0, reactions.dislikes_count - 1);
        }
        newReactions.user_reaction = null;
      } else if (result === reactionType) {
        // New reaction or reaction changed
        if (reactions.user_reaction === 'like' && reactionType === 'dislike') {
          newReactions.likes_count = Math.max(0, reactions.likes_count - 1);
          newReactions.dislikes_count = reactions.dislikes_count + 1;
        } else if (reactions.user_reaction === 'dislike' && reactionType === 'like') {
          newReactions.dislikes_count = Math.max(0, reactions.dislikes_count - 1);
          newReactions.likes_count = reactions.likes_count + 1;
        } else if (reactions.user_reaction === null) {
          // New reaction
          if (reactionType === 'like') {
            newReactions.likes_count = reactions.likes_count + 1;
          } else {
            newReactions.dislikes_count = reactions.dislikes_count + 1;
          }
        }
        newReactions.user_reaction = reactionType;
      }
      
      onReactionUpdate(messageId, newReactions);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      // Get the message content from the DOM
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        const messageText = messageElement.textContent || '';
        await navigator.clipboard.writeText(messageText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Error copying message:', error);
    }
  };

  return (
    <div className="flex items-center space-x-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {/* Like Button */}
      <button
        onClick={() => handleReaction('like')}
        disabled={isLoading}
        className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs transition-colors ${
          reactions.user_reaction === 'like'
            ? 'text-blue-500 bg-blue-50'
            : 'text-gray-500 hover:text-blue-500 hover:bg-gray-50'
        }`}
        title="Like"
      >
        <ThumbsUp className={`h-3 w-3 ${reactions.user_reaction === 'like' ? 'fill-current' : ''}`} />
        {reactions.likes_count > 0 && (
          <span className="text-xs">{reactions.likes_count}</span>
        )}
      </button>

      {/* Dislike Button */}
      <button
        onClick={() => handleReaction('dislike')}
        disabled={isLoading}
        className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs transition-colors ${
          reactions.user_reaction === 'dislike'
            ? 'text-red-500 bg-red-50'
            : 'text-gray-500 hover:text-red-500 hover:bg-gray-50'
        }`}
        title="Dislike"
      >
        <ThumbsDown className={`h-3 w-3 ${reactions.user_reaction === 'dislike' ? 'fill-current' : ''}`} />
        {reactions.dislikes_count > 0 && (
          <span className="text-xs">{reactions.dislikes_count}</span>
        )}
      </button>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs transition-colors ${
          copied
            ? 'text-green-500 bg-green-50'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
        title={copied ? "Copied!" : "Copy message"}
      >
        {copied ? (
          <Check className="h-3 w-3" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
};

export default MessageActions; 