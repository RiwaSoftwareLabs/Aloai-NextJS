"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, User, Bot, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFriends } from '@/lib/supabase/friendship';
import { getRecentChatsForUser } from '@/lib/supabase/aiChat';
import { getCurrentUser } from '@/lib/supabase/auth';
import type { Friend } from '@/lib/supabase/friendship';
import type { Chat } from '@/lib/supabase/aiChat';

interface ShareMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
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
}

interface ShareTarget {
  id: string;
  name: string;
  type: 'friend' | 'ai';
  avatar?: string;
  userType?: string;
}

const ShareMessageModal: React.FC<ShareMessageModalProps> = ({ 
  isOpen, 
  onClose, 
  message 
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'ai'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [aiUsers, setAiUsers] = useState<Chat[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<ShareTarget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { t, isRTL } = useLanguage();

  // Fetch friends and AI users
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { user } = await getCurrentUser();
        if (user?.id) {
          setUserId(user.id);
          
          // Fetch friends
          const friendsResult = await getFriends(user.id);
          if (friendsResult.success) {
            setFriends(friendsResult.data);
          }
          
          // Fetch AI users
          const aiChats = await getRecentChatsForUser(user.id);
          const aiUsersList = aiChats.filter(chat => 
            chat.receiver_id && chat.receiver_id !== user.id
          );
          setAiUsers(aiUsersList);
        }
      } catch (error) {
        console.error('Error fetching share targets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Filter targets based on search query
  const filteredFriends = friends.filter(friend =>
    friend.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAiUsers = aiUsers.filter(ai =>
    ai.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle target selection
  const toggleTarget = (target: ShareTarget) => {
    setSelectedTargets(prev => {
      const exists = prev.find(t => t.id === target.id && t.type === target.type);
      if (exists) {
        return prev.filter(t => !(t.id === target.id && t.type === target.type));
      } else {
        return [...prev, target];
      }
    });
  };

  // Handle share
  const handleShare = async () => {
    if (selectedTargets.length === 0) return;

    setIsSharing(true);
    try {
      // Share to each selected target
      for (const target of selectedTargets) {
        await shareMessage(target);
      }
      
      // Close modal and reset
      onClose();
      setSelectedTargets([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Error sharing message:', error);
    } finally {
      setIsSharing(false);
    }
  };

  // Share message to target
  const shareMessage = async (target: ShareTarget) => {
    if (!userId) return;

    try {
      // Create or get chat with target
      const { getOrCreateChatBetweenUsers, sendMessage } = await import('@/lib/supabase/aiChat');
      const chat = await getOrCreateChatBetweenUsers(userId, target.id);
      
      // Prepare message content - keep original content without attachment text
      const content = message.content;
      
      // Send message with attachment if present
      await sendMessage({
        senderId: userId,
        receiverId: target.id,
        content,
        attachment: message.attachment ? {
          url: message.attachment.url,
          type: message.attachment.fileType,
          name: message.attachment.fileName,
          size: message.attachment.fileSize,
        } : null,
        isForwarded: true,
      });
    } catch (error) {
      console.error(`Error sharing to ${target.name}:`, error);
      throw error;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Share2 className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">{t('share.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t('share.messagePreview')}</h3>
          <div className="text-sm text-gray-600 bg-white p-3 rounded border">
            {message.content && (
              <p className="mb-2">{message.content}</p>
            )}
            {message.attachment && (
              <div className="flex items-center space-x-2 text-blue-600">
                <span className="text-xs">📎</span>
                <span className="text-xs">{message.attachment.fileName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'friends'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            {t('share.friends')}
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'ai'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Bot className="h-4 w-4 inline mr-2" />
            {t('share.ai')}
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('share.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-64">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
              {t('share.loading')}
            </div>
          ) : activeTab === 'friends' ? (
            <div className="p-4">
              {filteredFriends.length === 0 ? (
                <p className="text-center text-gray-500 py-4">{t('share.noFriends')}</p>
              ) : (
                <div className="space-y-2">
                  {filteredFriends.map((friend) => {
                    const isSelected = selectedTargets.some(
                      t => t.id === friend.userId && t.type === 'friend'
                    );
                    return (
                      <button
                        key={friend.userId}
                        onClick={() => toggleTarget({
                          id: friend.userId,
                          name: friend.displayName || 'Unknown',
                          type: 'friend',
                          avatar: friend.displayName?.charAt(0).toUpperCase(),
                        })}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                          {friend.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">{friend.displayName}</p>
                          <p className="text-sm text-gray-500">{t('share.friend')}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {filteredAiUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-4">{t('share.noAI')}</p>
              ) : (
                <div className="space-y-2">
                  {filteredAiUsers.map((ai) => {
                    const isSelected = selectedTargets.some(
                      t => t.id === ai.receiver_id && t.type === 'ai'
                    );
                    return (
                      <button
                        key={ai.id}
                        onClick={() => toggleTarget({
                          id: ai.receiver_id!,
                          name: ai.title || 'AI Assistant',
                          type: 'ai',
                          userType: 'ai',
                        })}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-sm font-medium text-white">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">{ai.title}</p>
                          <p className="text-sm text-gray-500">{t('share.aiAssistant')}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedTargets.length > 0 && (
                <span>{selectedTargets.length} {t('share.selected')}</span>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('share.cancel')}
              </button>
              <button
                onClick={handleShare}
                disabled={selectedTargets.length === 0 || isSharing}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSharing ? t('share.sharing') : t('share.share')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareMessageModal; 