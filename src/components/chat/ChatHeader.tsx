"use client";

import React, { useState } from 'react';
import { 
  MoreVertical,
  Phone,
  Video,
  Trash2,
  XCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatLastSeenAgo } from '@/lib/supabase/auth';

interface ChatHeaderProps {
  chat?: {
    id: string;
    name: string;
    isAI?: boolean;
    status?: string;
    icon?: string;
    initials?: string;
    last_seen?: string | null;
  };
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ chat }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const { t, isRTL } = useLanguage();

  const handleClearMessages = () => {
    setShowDropdown(false);
  };

  const handleDeleteConversation = () => {
    setShowDropdown(false);
  };

  const dropdownPosition = isRTL ? 'left-0' : 'right-0';

  if (!chat) {
    // Skeleton loader for header
    return (
      <div className="h-16 px-6 flex items-center justify-between bg-white relative animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div>
            <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-100" />
          <div className="h-8 w-8 rounded-full bg-gray-100" />
          <div className="h-8 w-8 rounded-full bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-16 px-6 flex items-center justify-between bg-white relative">
      <div className="flex items-center gap-3">
        <div className="relative">
          {chat.icon ? (
            <img src={chat.icon} alt={chat.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
              {chat.initials ? chat.initials : chat.name.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Online dot if online */}
          {chat.status === 'Online' && (
            <div className={`absolute bottom-0 ${isRTL ? 'left-0' : 'right-0'} w-3 h-3 bg-green-500 rounded-full border-2 border-white`}></div>
          )}
        </div>
        <div>
          <h2 className="font-medium text-gray-900">{chat.name}</h2>
          {/* Status/last seen logic */}
          {chat.status && (
            <p className="text-xs text-gray-500">
              {chat.status === 'Online'
                ? t('chat.online')
                : chat.last_seen
                  ? `last seen ${formatLastSeenAgo(chat.last_seen)}`
                  : t('chat.offline')}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {/* Phone Call Icon */}
        <button 
          className={`p-2 rounded-full hover:bg-gray-100 transition-all ${hoveredIcon === 'call' ? 'scale-110' : ''}`}
          onMouseEnter={() => setHoveredIcon('call')}
          onMouseLeave={() => setHoveredIcon(null)}
          title={t('buttons.call')}
        >
          <Phone className="h-5 w-5 text-gray-600" />
        </button>

        {/* Video Call Icon */}
        <button 
          className={`p-2 rounded-full hover:bg-gray-100 transition-all ${hoveredIcon === 'video' ? 'scale-110' : ''}`}
          onMouseEnter={() => setHoveredIcon('video')}
          onMouseLeave={() => setHoveredIcon(null)}
          title={t('buttons.videoCall')}
        >
          <Video className="h-5 w-5 text-gray-600" />
        </button>

        {/* More Options Icon */}
        <div className="relative">
          <button 
            className={`p-2 rounded-full hover:bg-gray-100 transition-all ${hoveredIcon === 'more' ? 'scale-110' : ''}`}
            onClick={() => setShowDropdown(!showDropdown)}
            onMouseEnter={() => setHoveredIcon('more')}
            onMouseLeave={() => setHoveredIcon(null)}
            title={t('buttons.menu')}
          >
            <MoreVertical className="h-5 w-5 text-gray-600" />
          </button>
          
          {showDropdown && (
            <div 
              className={`absolute ${dropdownPosition} top-full mt-1 w-48 bg-white rounded-lg shadow-lg z-10 py-1 overflow-hidden`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <button 
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                onClick={handleClearMessages}
              >
                <XCircle className="h-4 w-4 text-gray-500" />
                {t('chat.actions.clearMessages')}
              </button>
              <button 
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2 text-red-500"
                onClick={handleDeleteConversation}
              >
                <Trash2 className="h-4 w-4" />
                {t('chat.actions.deleteConversation')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader; 