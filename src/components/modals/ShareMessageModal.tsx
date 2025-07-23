"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, User, Bot, Share2, Image as ImageIcon, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFriends } from '@/lib/supabase/friendship';
import { getRecentChatsForUser } from '@/lib/supabase/aiChat';
import { getCurrentUser } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';
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
  const [imageCaption, setImageCaption] = useState('');
  const [showImageCaption, setShowImageCaption] = useState(false);
  const { t, isRTL } = useLanguage();

  const isImage = message.attachment?.fileType.startsWith('image/');

  // Fetch friends and AI users
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { user } = await getCurrentUser();
        if (user?.id) {
          setUserId(user.id);
          
          // Fetch friends with user_type filtering
          const friendsResult = await getFriends(user.id);
          if (friendsResult.success) {
            // Get user_type for each friend
            const friendIds = friendsResult.data.map(f => f.userId);
            if (friendIds.length > 0) {
              const { data: usersData } = await supabase
                .from('users')
                .select('user_id, user_type')
                .in('user_id', friendIds);
              
              if (usersData) {
                // Filter friends to only include user_type = 'user'
                const filteredFriends = friendsResult.data.filter(friend => {
                  const userData = usersData.find(u => u.user_id === friend.userId);
                  return userData?.user_type === 'user';
                });
                setFriends(filteredFriends);
              } else {
                setFriends([]);
              }
            } else {
              setFriends([]);
            }
          }
          
          // Fetch AI users (user_type = 'ai' or 'super-ai')
          const { data: aiUsersData } = await supabase
            .from('users')
            .select('user_id, display_name, user_type')
            .in('user_type', ['ai', 'super-ai']);
          
          if (aiUsersData && userId) {
            const aiChats = aiUsersData.map(user => ({
              id: `ai-${user.user_id}`,
              user_id: userId,
              receiver_id: user.user_id,
              title: user.display_name,
              is_group: false,
              created_by: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_message_at: new Date().toISOString(),
              last_message_text: null,
            }));
            setAiUsers(aiChats);
          }
        }
      } catch (error) {
        console.error('Error fetching share targets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, userId]);

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
      // Prepare content with image caption if applicable
      let content = message.content;
      if (isImage && imageCaption.trim()) {
        content = imageCaption.trim();
      }
      
      // Share to each selected target
      for (const target of selectedTargets) {
        await shareMessage(target, content);
      }
      
      // Close modal and reset
      onClose();
      setSelectedTargets([]);
      setSearchQuery('');
      setImageCaption('');
      setShowImageCaption(false);
    } catch (error) {
      console.error('Error sharing message:', error);
    } finally {
      setIsSharing(false);
    }
  };

  // Share message to target
  const shareMessage = async (target: ShareTarget, content: string) => {
    if (!userId) return;

    try {
      // Create or get chat with target
      const { getOrCreateChatBetweenUsers, sendMessage } = await import('@/lib/supabase/aiChat');
      const chat = await getOrCreateChatBetweenUsers(userId, target.id);
      
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Share2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t('share.title')}</h2>
              <p className="text-sm text-gray-600">{t('share.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            {t('share.messagePreview')}
          </h3>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            {message.content && (
              <p className="text-gray-800 mb-3 leading-relaxed">{message.content}</p>
            )}
            {message.attachment && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                {isImage ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                      <img 
                        src={message.attachment.url} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Image</p>
                      <p className="text-xs text-gray-500">{formatFileSize(message.attachment.fileSize)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-lg">📎</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{message.attachment.fileName}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(message.attachment.fileSize)}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Image Caption Input */}
        {isImage && (
          <div className="p-4 border-b border-gray-100 bg-blue-50/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                <ImageIcon className="h-4 w-4 mr-2 text-blue-500" />
                {t('share.addCaption')}
              </h3>
              <button
                onClick={() => setShowImageCaption(!showImageCaption)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showImageCaption ? t('share.hideCaption') : t('share.showCaption')}
              </button>
            </div>
            {showImageCaption && (
              <div className="space-y-3">
                <textarea
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder={t('share.captionPlaceholder')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <p className="text-xs text-gray-500">{t('share.captionHint')}</p>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 ${
              activeTab === 'friends'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            {t('share.friends')}
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 ${
              activeTab === 'ai'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Bot className="h-4 w-4 inline mr-2" />
            {t('share.ai')}
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('share.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-64">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-gray-500">{t('share.loading')}</p>
            </div>
          ) : activeTab === 'friends' ? (
            <div className="p-4">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('share.noFriends')}</p>
                </div>
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
                        className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 ${
                          isSelected
                            ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                          {friend.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-gray-900">{friend.displayName}</p>
                          <p className="text-sm text-gray-500">{t('share.friend')}</p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
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
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('share.noAI')}</p>
                </div>
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
                        className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 ${
                          isSelected
                            ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-gray-900">{ai.title}</p>
                          <p className="text-sm text-gray-500">{t('share.aiAssistant')}</p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
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
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedTargets.length > 0 && (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  {selectedTargets.length} {t('share.selected')}
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 transition-colors font-medium"
              >
                {t('share.cancel')}
              </button>
              <button
                onClick={handleShare}
                disabled={selectedTargets.length === 0 || isSharing}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center space-x-2 shadow-sm"
              >
                {isSharing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{t('share.sharing')}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{t('share.share')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default ShareMessageModal; 