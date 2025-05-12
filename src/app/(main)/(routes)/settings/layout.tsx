"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import SettingsContainer from '@/components/settings/SettingsContainer';
import { useLanguage } from '@/contexts/LanguageContext';

interface RouteMap {
  [key: string]: string;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  
  // Map route to translation key
  const ROUTE_KEYS: RouteMap = {
    '/settings/profile': 'settings.profile',
    '/settings/notifications': 'settings.notifications',
    '/settings/privacy': 'settings.privacy',
    '/settings/translation': 'settings.translation',
    '/settings/users': 'settings.users',
    '/settings/ai-agents': 'settings.aiAgents',
    '/settings/backend': 'settings.backend',
  };
  
  const titleKey = ROUTE_KEYS[pathname] || 'settings.title';
  const title = t(titleKey);
  
  return (
    <SettingsContainer title={title}>
      {children}
    </SettingsContainer>
  );
} 