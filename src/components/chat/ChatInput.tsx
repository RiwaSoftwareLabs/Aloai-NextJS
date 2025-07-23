"use client";

import React, { useState, useRef } from 'react';
import { 
  Smile, 
  Paperclip,  
  Send,
  Mic,
  X,
  Upload,
  AlertCircle
} from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { uploadFile, validateFile, formatFileSize, getFileIcon } from '@/lib/supabase/fileUpload';

interface ChatInputProps {
  onSendMessage: (message: string, attachment?: {
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    preview?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, isRTL } = useLanguage();
  
  const handleSendMessage = () => {
    if (message.trim() || selectedFile) {
      if (selectedFile) {
        // Upload file first, then send message
        handleFileUpload();
      } else {
        onSendMessage(message);
        setMessage('');
        setShowEmojiPicker(false);
      }
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await uploadFile(selectedFile.file);
      
      if (result.success && result.url) {
        // Send message with attachment
        onSendMessage(message, {
          url: result.url,
          fileName: result.fileName || selectedFile.file.name,
          fileType: result.fileType || selectedFile.file.type,
          fileSize: result.fileSize || selectedFile.file.size
        });
        
        // Reset form
        setMessage('');
        setSelectedFile(null);
        setShowEmojiPicker(false);
      } else {
        setUploadError(result.error || t('chat.fileUpload.uploadError'));
      }
    } catch {
      setUploadError(t('chat.fileUpload.uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      setUploadError(validation.error || t('chat.fileUpload.unsupportedType'));
      return;
    }

    // Create preview for images
    let preview: string | undefined;
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
    }

    setSelectedFile({ file, preview });
    setUploadError(null);
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedFile = () => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }
    setSelectedFile(null);
    setUploadError(null);
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf,.xlsx,.xls,.docx,.doc"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File preview and error display */}
      {selectedFile && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedFile.preview ? (
                <img 
                  src={selectedFile.preview} 
                  alt="Preview" 
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-lg">{getFileIcon(selectedFile.file.type)}</span>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-48">
                  {selectedFile.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.file.size)}
                </p>
              </div>
            </div>
            <button
              onClick={removeSelectedFile}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}

      <div className="flex items-end gap-3 w-full max-w-full">
        <button 
          type="button"
          onClick={handleFileButtonClick}
          disabled={isUploading}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('chat.fileUpload.attachFile')}
        >
          {isUploading ? (
            <Upload className="h-5 w-5 animate-pulse" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
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
        
        {(message.trim() || selectedFile) ? (
          <button 
            onClick={handleSendMessage}
            disabled={isUploading}
            className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors text-white flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            {isUploading ? (
              <Upload className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
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