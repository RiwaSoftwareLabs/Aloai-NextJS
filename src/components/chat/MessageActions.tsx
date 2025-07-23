"use client";

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check, Share2 } from 'lucide-react';
import { toggleMessageReaction } from '@/lib/supabase/aiChat';
import { calculateOptimisticReaction } from '@/lib/supabase/reactionCache';
import { copyCache } from '@/lib/supabase/copyCache';
import ShareMessageModal from '../modals/ShareMessageModal';

interface MessageActionsProps {
  messageId: string;
  message: {
    id: string;
    content: string;
    attachment?: {
      url: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    };
  };
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
  message,
  reactions, 
  onReactionUpdate 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleReaction = async (reactionType: 'like' | 'dislike') => {
    if (isLoading) return;
    
    // Apply optimistic update immediately
    const optimisticReactions = calculateOptimisticReaction(reactions, reactionType);
    onReactionUpdate(messageId, optimisticReactions);
    
    setIsLoading(true);
    try {
      await toggleMessageReaction(messageId, reactionType);
      // The cache system will handle updating the UI with the actual result
    } catch (error) {
      console.error('Error toggling reaction:', error);
      // Revert optimistic update on error
      onReactionUpdate(messageId, reactions);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      const success = await copyCache.copyMessageContent(messageId);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Error copying message:', error);
    }
  };

  return (
    <>
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

        {/* Share Button */}
        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center space-x-1 px-2 py-1 rounded-md text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          title="Share message"
        >
          <Share2 className="h-3 w-3" />
        </button>
      </div>

      {/* Share Message Modal */}
      <ShareMessageModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        message={message}
      />
    </>
  );
};

export default MessageActions; 