"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  User, 
  Bell, 
  Lock, 
  Languages, 
  UserPlus, 
  Bot,
  Server,
  LogOut
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SettingsSidebarProps {
  onLogout: () => void;
}

type SettingsTab = {
  id: string;
  translationKey: string;
  icon: React.ReactNode;
  href: string;
};

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ onLogout }) => {
  const pathname = usePathname();
  const currentTab = pathname.split('?')[0].split('/').pop() || '';
  const { t, isRTL } = useLanguage();
  
  const tabs: SettingsTab[] = [
    { 
      id: 'profile', 
      translationKey: 'settings.profile', 
      icon: <User className="h-5 w-5" />,
      href: '/settings/profile'
    },
    { 
      id: 'notifications', 
      translationKey: 'settings.notifications', 
      icon: <Bell className="h-5 w-5" />,
      href: '/settings/notifications'
    },
    { 
      id: 'privacy', 
      translationKey: 'settings.privacy', 
      icon: <Lock className="h-5 w-5" />,
      href: '/settings/privacy'
    },
    { 
      id: 'translation', 
      translationKey: 'settings.translation', 
      icon: <Languages className="h-5 w-5" />,
      href: '/settings/translation'
    },
    { 
      id: 'users', 
      translationKey: 'settings.users', 
      icon: <UserPlus className="h-5 w-5" />,
      href: '/settings/users'
    },
    { 
      id: 'ai-agents', 
      translationKey: 'settings.aiAgents', 
      icon: <Bot className="h-5 w-5" />,
      href: '/settings/ai-agents'
    },
    { 
      id: 'backend', 
      translationKey: 'settings.backend', 
      icon: <Server className="h-5 w-5" />,
      href: '/settings/backend'
    },
  ];

  return (
    <div className="w-72 bg-gray-50 border-r border-gray-200 flex-shrink-0 h-full flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">{t('settings.title')}</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <nav>
          <ul className="space-y-1">
            {tabs.map(tab => (
              <li key={tab.id}>
                <Link
                  href={tab.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    ${tab.id === currentTab 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-gray-100 transition-colors'
                    }
                  `}
                >
                  {tab.icon}
                  <span>{t(tab.translationKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      
      <div className="p-4 border-t">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>{t('logout.confirm')}</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsSidebar; 