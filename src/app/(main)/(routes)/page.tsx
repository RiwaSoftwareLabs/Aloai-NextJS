"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import ChatContainer from '@/components/chat/ChatContainer';
import { MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const HomePage = () => {
  const searchParams = useSearchParams();
  const chatId = searchParams.get('id');
  const { t, isRTL } = useLanguage();
  
  return (
    <div className="flex-1 flex overflow-hidden">
      {chatId ? (
        <ChatContainer chatId={chatId} userId="user" />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-white p-4">
          <div className="text-center max-w-md mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-2xl font-semibold mb-2">{t('chat.placeholder.title')}</h2>
            <p className="text-gray-500">
              {t('chat.placeholder.message')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage; 