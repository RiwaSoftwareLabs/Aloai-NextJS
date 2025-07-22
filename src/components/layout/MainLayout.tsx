"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatSidebar from '../chat/ChatSidebar';
import { MessageCircle, Globe, Menu } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { checkSession } from '@/lib/supabase/auth';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { toggleLanguage, isRTL, t, language } = useLanguage();
  const router = useRouter();
  
  useEffect(() => {
    const verifySession = async () => {
      try {
        const { isAuthenticated } = await checkSession();
        if (!isAuthenticated) {
          router.push('/login');
        }
      } catch (error) {
        console.error('MainLayout: Error checking session:', error);
        router.push('/login');
      }
    };
    
    verifySession();
  }, [router]);
  
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top application header */}
      <header className="w-full h-16 border-b border-gray-100 px-4 flex items-center justify-between bg-white z-10">
        <div className="flex items-center">
          {isRTL ? (
            <>
              <MessageCircle className="h-6 w-6 text-gray-800 mr-4 ml-0" />
              <span className="text-xl font-semibold mx-2">{t('appName')}</span>
            </>
          ) : (
            <>
              <MessageCircle className="h-6 w-6 text-gray-800 mr-2.5 ml-0" />
              <span className="text-xl font-semibold">{t('appName')}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="p-2 rounded-full hover:bg-purple-50 transition-colors text-gray-700 hover:text-purple-600"
            onClick={toggleLanguage}
            title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
          >
            <Globe className="h-5 w-5" />
          </button>
          {/* Mobile sidebar toggle button */}
          <button
            className="lg:hidden p-2 rounded-full hover:bg-purple-50 transition-colors text-gray-700 hover:text-purple-600"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar backdrop */}
        {mobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar - will be positioned differently based on RTL */}
        <div 
          className={`
            transition-all duration-300 ease-in-out
            fixed top-0 bottom-0 z-30 lg:static lg:top-0 lg:h-full
            lg:w-80 lg:flex-shrink-0
            w-full h-full lg:border-r lg:border-gray-100
            ${isRTL 
              ? `${mobileSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} right-0` 
              : `${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} left-0`
            }
          `}
        >
          <ChatSidebar
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 flex overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout; 