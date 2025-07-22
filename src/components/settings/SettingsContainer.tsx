"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import SettingsSidebar from './SettingsSidebar';
import LogoutModal from '../modals/LogoutModal';
import { logoutUser } from '@/lib/supabase/auth';
import { useLanguage } from '@/contexts/LanguageContext';

interface SettingsContainerProps {
  children: React.ReactNode;
  title: string;
}

const SettingsContainer: React.FC<SettingsContainerProps> = ({ 
  children,
  title
}) => {
  const router = useRouter();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { isRTL } = useLanguage();
  
  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };
  
  const handleLogoutConfirm = async () => {
    // Actually perform the logout
    const result = await logoutUser();
    
    if (result.success) {
      // Close modal and redirect to login
      setIsLogoutModalOpen(false);
      router.push('/login');
    } else {
      console.error('Logout failed:', result.error);
      // We still redirect even if logout fails
      router.push('/login');
    }
  };
  
  const handleClose = () => {
    router.push('/');
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <SettingsSidebar onLogout={handleLogoutClick} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 px-6 border-b flex items-center justify-between">
          <h1 className="text-xl font-semibold">{title}</h1>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
      
      <LogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};

export default SettingsContainer; 