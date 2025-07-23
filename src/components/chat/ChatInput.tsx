"use client";

import React, { useState } from 'react';
import { 
  Smile, 
  Paperclip,  
  Send,
  Mic,
  X
} from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { t, isRTL } = useLanguage();
  
  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      setShowEmojiPicker(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  return (
    <div className="px-6 py-4 bg-white w-full">
      <div className="flex items-end gap-3 w-full max-w-full">
        <button 
          type="button"
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        
        <div className="flex-1 rounded-2xl border border-gray-200 bg-white overflow-hidden flex items-center min-w-0 focus-within:border-gray-300 transition-colors">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.typeMessage')}
            className="w-full px-4 py-3 resize-none focus:outline-none max-h-32 text-gray-800 min-w-0 bg-transparent"
            rows={1}
            style={{ 
              minHeight: '45px',
              textAlign: isRTL ? 'right' : 'left'
            }}
          />
          
          <button 
            onClick={toggleEmojiPicker}
            className="p-2 mx-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 flex-shrink-0"
            type="button"
          >
            {showEmojiPicker ? (
              <X className="h-5 w-5" />
            ) : (
              <Smile className="h-5 w-5" />
            )}
          </button>
        </div>
        
        {message.trim() ? (
          <button 
            onClick={handleSendMessage}
            className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors text-white flex-shrink-0"
            type="button"
          >
            <Send className="h-5 w-5" />
          </button>
        ) : (
          <button 
            className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500 flex-shrink-0"
            type="button"
          >
            <Mic className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {showEmojiPicker && (
        <div 
          className={`fixed z-50 shadow-lg rounded-lg overflow-hidden ${isRTL ? 'left-5 right-auto' : 'right-5 left-auto'} bottom-20`}
          style={{ height: '350px' }}
        >
          <EmojiPicker 
            onEmojiClick={handleEmojiClick} 
            searchDisabled={false}
            skinTonesDisabled
            width={320}
          />
        </div>
      )}
    </div>
  );
};

export default ChatInput; 