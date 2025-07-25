"use client";

import React, { useState } from 'react';
import { X, Search, User, Bot, Share2, Image as ImageIcon, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useShareCache } from '@/hooks/useShareCache';
import { shareCacheService, type ShareTarget } from '@/lib/supabase/shareCache';

interface ShareMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareSuccess?: () => void;
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

const ShareMessageModal: React.FC<ShareMessageModalProps> = ({ 
  isOpen, 
  onClose, 
  onShareSuccess,
  message 
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'ai'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<ShareTarget[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [imageCaption, setImageCaption] = useState('');
  const [showImageCaption, setShowImageCaption] = useState(false);
  const { t } = useLanguage();

  // Use share cache hook
  const {
    friends,
    aiUsers,
    isLoading,
    cacheStatus,
    refresh,
    invalidateCache,
  } = useShareCache();

  const isImage = message.attachment?.fileType.startsWith('image/');

  // Filter targets based on search query
  const filteredFriends = shareCacheService.filterShareTargets(friends, searchQuery);
  const filteredAiUsers = shareCacheService.filterShareTargets(aiUsers, searchQuery);

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
      
      // Share to each selected target with progress tracking and timeout
      const sharePromises = selectedTargets.map(async (target, index) => {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Share timeout')), 10000)
          );
          
          const sharePromise = shareMessage(target, content);
          await Promise.race([sharePromise, timeoutPromise]);
          
          // Add a small delay between shares to prevent overwhelming the server
          if (index < selectedTargets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error(`Error sharing to ${target.name}:`, error);
          throw error;
        }
      });
      
      await Promise.all(sharePromises);
      
      // Invalidate cache after sharing
      invalidateCache();
      
      // Trigger success callback to refresh chat
      if (onShareSuccess) {
        onShareSuccess();
      }
      
      // Close modal and reset
      onClose();
      setSelectedTargets([]);
      setSearchQuery('');
      setImageCaption('');
      setShowImageCaption(false);
    } catch (error) {
      console.error('Error sharing message:', error);
      // Show error to user (you could add a toast notification here)
    } finally {
      setIsSharing(false);
    }
  };

  // Share message to target
  const shareMessage = async (target: ShareTarget, content: string) => {
    try {
      // Get current user
      const { getCurrentUser } = await import('@/lib/supabase/auth');
      const { user } = await getCurrentUser();
      if (!user?.id) return;

      // Create or get chat with target
      const { getOrCreateChatBetweenUsers, sendMessage } = await import('@/lib/supabase/aiChat');
      await getOrCreateChatBetweenUsers(user.id, target.id);
      
      // Send message with attachment if present
      await sendMessage({
        senderId: user.id,
        receiverId: target.id,
        content,
        attachment: message.attachment ? {
          url: message.attachment.url,
          type: message.attachment.fileType,
          name: message.attachment.fileName,
          size: message.attachment.fileSize,
        } : null,
      });
    } catch (error) {
      console.error(`Error sharing to ${target.name}:`, error);
      throw error;
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    await refresh();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full max-h-[90vh] flex flex-col border border-gray-100">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-500 rounded-lg">
              <Share2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('share.title')}</h2>
              <div className="flex items-center space-x-2">
                <p className="text-xs text-gray-600">{t('share.subtitle')}</p>
                {cacheStatus === 'cached' && (
                  <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                    Cached
                  </span>
                )}
                {cacheStatus === 'fresh' && (
                  <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                    Fresh
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <div className={`w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full ${isLoading ? 'animate-spin' : ''}`}></div>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Message Preview */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
              {t('share.messagePreview')}
            </h3>
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              {message.content && (
                <p className="text-gray-800 mb-2 leading-relaxed text-sm">{message.content}</p>
              )}
              {message.attachment && (
                <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                  {isImage ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                        <img 
                          src={message.attachment.url} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-900">Image</p>
                        <p className="text-xs text-gray-500">{formatFileSize(message.attachment.fileSize)}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-sm">📎</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-900">{message.attachment.fileName}</p>
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
            <div className="p-3 border-b border-gray-100 bg-blue-50/30">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-700 flex items-center">
                  <ImageIcon className="h-3 w-3 mr-1.5 text-blue-500" />
                  {t('share.addCaption')}
                </h3>
                <button
                  onClick={() => setShowImageCaption(!showImageCaption)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showImageCaption ? t('share.hideCaption') : t('share.showCaption')}
                </button>
              </div>
              {showImageCaption && (
                <div className="space-y-2">
                  <textarea
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    placeholder={t('share.captionPlaceholder')}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500">{t('share.captionHint')}</p>
                </div>
              )}
            </div>
          )}

          {/* Tabs - Fixed */}
          <div className="flex-shrink-0 flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-3 px-4 text-xs font-medium transition-all duration-200 ${
                activeTab === 'friends'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User className="h-3 w-3 inline mr-1.5" />
              {t('share.friends')} ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-3 px-4 text-xs font-medium transition-all duration-200 ${
                activeTab === 'ai'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Bot className="h-3 w-3 inline mr-1.5" />
              {t('share.ai')} ({aiUsers.length})
            </button>
          </div>

          {/* Search - Fixed */}
          <div className="flex-shrink-0 p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder={t('share.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">{t('share.loading')}</p>
              </div>
            ) : activeTab === 'friends' ? (
              <div className="p-3">
                {filteredFriends.length === 0 ? (
                  <div className="text-center py-6">
                    <User className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">{t('share.noFriends')}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredFriends.map((friend) => {
                      const isSelected = selectedTargets.some(
                        t => t.id === friend.id && t.type === friend.type
                      );
                      return (
                        <button
                          key={friend.id}
                          onClick={() => toggleTarget(friend)}
                          className={`w-full flex items-center space-x-2.5 p-3 rounded-lg transition-all duration-200 ${
                            isSelected
                              ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                            {friend.avatar || 'U'}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-900 text-sm">{friend.name}</p>
                            <p className="text-xs text-gray-500">{t('share.friend')}</p>
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
              <div className="p-3">
                {filteredAiUsers.length === 0 ? (
                  <div className="text-center py-6">
                    <Bot className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">{t('share.noAI')}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredAiUsers.map((ai) => {
                      const isSelected = selectedTargets.some(
                        t => t.id === ai.id && t.type === ai.type
                      );
                      return (
                        <button
                          key={ai.id}
                          onClick={() => toggleTarget(ai)}
                          className={`w-full flex items-center space-x-2.5 p-3 rounded-lg transition-all duration-200 ${
                            isSelected
                              ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-900 text-sm">{ai.name}</p>
                            <p className="text-xs text-gray-500">{t('share.aiAssistant')}</p>
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
        </div>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {selectedTargets.length > 0 && (
                <span className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
                  {selectedTargets.length} {t('share.selected')}
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium text-sm"
              >
                {t('share.cancel')}
              </button>
              <button
                onClick={handleShare}
                disabled={selectedTargets.length === 0 || isSharing}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center space-x-1.5 shadow-sm text-sm"
              >
                {isSharing ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                    <span>{t('share.sharing')}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
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