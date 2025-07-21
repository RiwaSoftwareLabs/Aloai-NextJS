"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatContainer from '@/components/chat/ChatContainer';
import { MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Component that uses useSearchParams
const HomeContent = () => {
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chat_id');
  const friendId = searchParams.get('friend_id');
  const aiBrainId = searchParams.get('ai_brain_id');
  const { t, isRTL } = useLanguage();
  
  return (
    <>
      {chatId || friendId || aiBrainId ? (
        <ChatContainer chatId={chatId || undefined} friendId={friendId || undefined} aiBrainId={aiBrainId || undefined} />
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
    </>
  );
};

// Main page component with Suspense boundary
const HomePage = () => {
  return (
    <div className="flex-1 flex overflow-hidden">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
        <HomeContent />
      </Suspense>
    </div>
  );
};

export default HomePage; 