"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Search, 
  Settings, 
  LogOut, 
  UserPlus,
  Users,
  Bot
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LogoutModal from '../modals/LogoutModal';
import { logoutUser, checkSession } from '@/lib/supabase/auth';

interface ChatSidebarProps {
  onCloseMobile: () => void;
}

// Primary color
const PRIMARY_COLOR = "#9333ea"; // Purple

// Dummy data for chats
const DUMMY_CHATS = [
  { id: '1', name: 'Ishan', lastMessage: 'New contact added', time: '03:44 AM', unread: 0, isAI: false },
  { id: '2', name: 'AI Manager', lastMessage: 'How can I help you today?', time: '03:33 AM', unread: 0, isAI: true },
  { id: '3', name: 'anas', lastMessage: 'Chat with anas', time: '12:13 AM', unread: 0, isAI: true },
  { id: '4', name: 'hamad', lastMessage: 'Conversation with hamad', time: '10:11 PM', unread: 0, isAI: true },
  { id: '5', name: 'hh', lastMessage: 'Chat with hh', time: '12:29 AM', unread: 0, isAI: true },
  { id: '6', name: 'ishan', lastMessage: 'Chat with ishan', time: '05:11 PM', unread: 0, isAI: true },
];

const ICON_COLORS = {
  ai: PRIMARY_COLOR,
  group: "#3b82f6", // Blue
  user: "#10b981", // Green
  settings: "#6b7280", // Gray
  logout: "#f43f5e", // Rose/Red
};

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onCloseMobile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    displayName: string | null;
    email: string | null;
    initials: string;
  }>({
    displayName: null,
    email: null,
    initials: 'U',
  });
  
  const pathname = usePathname();
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  
  useEffect(() => {
    setIsMounted(true);
    
    const fetchUserProfile = async () => {
      try {
        const { session } = await checkSession();
        if (session && session.user) {
          const { user } = session;
          const userMetadata = user.user_metadata || {};
          const displayName = userMetadata.displayName || user.email?.split('@')[0] || 'User';
          const email = user.email || null;
          
          // Create initials from display name or email
          let initials = 'U';
          if (displayName && typeof displayName === 'string') {
            const nameParts = displayName.split(' ').filter(Boolean);
            if (nameParts.length > 0) {
              initials = nameParts.map(part => part[0]?.toUpperCase() || '').join('').substring(0, 2);
            }
          } else if (email) {
            initials = email[0].toUpperCase();
          }
          
          setUserProfile({
            displayName,
            email,
            initials,
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
    
    return () => setIsMounted(false);
  }, []);
  
  const filteredChats = DUMMY_CHATS.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (activeTab === 'All' || 
     (activeTab === 'Users' && !chat.isAI) || 
     (activeTab === 'AI' && chat.isAI))
  );

  const handleLogout = async () => {
    try {
      // Call the Supabase logout function
      const result = await logoutUser();
      
      // Close the modal
      setShowLogoutModal(false);
      
      if (result.success) {
        // Redirect to login page after successful logout
        router.push('/login');
      } else {
        console.error('Logout failed:', result.error);
        // Still redirect to login even if logout fails
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Redirect to login on error
      router.push('/login');
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with icons */}
      <div className="p-4 flex items-center justify-center space-x-3">
        <div className="relative">
          <button 
            className={`p-2.5 rounded-lg hover:bg-purple-100 transition-all ${hoveredIcon === 'ai' ? 'scale-110' : ''}`}
            onMouseEnter={() => {
              setActiveTooltip('ai');
              setHoveredIcon('ai');
            }}
            onMouseLeave={() => {
              setActiveTooltip(null);
              setHoveredIcon(null);
            }}
            style={{ 
              color: ICON_COLORS.ai,
              backgroundColor: hoveredIcon === 'ai' ? 'rgba(147, 51, 234, 0.1)' : 'transparent'
            }}
          >
            <Bot className="h-5 w-5" />
          </button>
          {activeTooltip === 'ai' && (
            <div className="absolute -bottom-9 left-1/2 transform -translate-x-1/2 bg-white shadow-md rounded-lg py-1 px-2 text-sm z-20 whitespace-nowrap border border-gray-100">
              {t('sidebar.newAgent')}
            </div>
          )}
        </div>
        
        <div className="relative">
          <button 
            className={`p-2.5 rounded-lg hover:bg-blue-100 transition-all ${hoveredIcon === 'group' ? 'scale-110' : ''}`}
            onMouseEnter={() => {
              setActiveTooltip('group');
              setHoveredIcon('group');
            }}
            onMouseLeave={() => {
              setActiveTooltip(null);
              setHoveredIcon(null);
            }}
            style={{ 
              color: ICON_COLORS.group,
              backgroundColor: hoveredIcon === 'group' ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
            }}
          >
            <Users className="h-5 w-5" />
          </button>
          {activeTooltip === 'group' && (
            <div className="absolute -bottom-9 left-1/2 transform -translate-x-1/2 bg-white shadow-md rounded-lg py-1 px-2 text-sm z-20 whitespace-nowrap border border-gray-100">
              {t('sidebar.newGroup')}
            </div>
          )}
        </div>
        
        <div className="relative">
          <button 
            className={`p-2.5 rounded-lg hover:bg-green-100 transition-all ${hoveredIcon === 'user' ? 'scale-110' : ''}`}
            onMouseEnter={() => {
              setActiveTooltip('user');
              setHoveredIcon('user');
            }}
            onMouseLeave={() => {
              setActiveTooltip(null);
              setHoveredIcon(null);
            }}
            style={{ 
              color: ICON_COLORS.user,
              backgroundColor: hoveredIcon === 'user' ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
            }}
          >
            <UserPlus className="h-5 w-5" />
          </button>
          {activeTooltip === 'user' && (
            <div className="absolute -bottom-9 left-1/2 transform -translate-x-1/2 bg-white shadow-md rounded-lg py-1 px-2 text-sm z-20 whitespace-nowrap border border-gray-100">
              Add New User
            </div>
          )}
        </div>
        
        <div className="relative">
          <button 
            className={`p-2.5 rounded-lg hover:bg-gray-100 transition-all ${hoveredIcon === 'settings' ? 'scale-110' : ''}`}
            onMouseEnter={() => {
              setActiveTooltip('settings');
              setHoveredIcon('settings');
            }}
            onMouseLeave={() => {
              setActiveTooltip(null);
              setHoveredIcon(null);
            }}
            style={{ 
              color: ICON_COLORS.settings,
              backgroundColor: hoveredIcon === 'settings' ? 'rgba(107, 114, 128, 0.1)' : 'transparent'
            }}
          >
            <Settings className="h-5 w-5" />
          </button>
          {activeTooltip === 'settings' && (
            <div className="absolute -bottom-9 left-1/2 transform -translate-x-1/2 bg-white shadow-md rounded-lg py-1 px-2 text-sm z-20 whitespace-nowrap border border-gray-100">
              Settings
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4`} />
          <input
            type="text"
            placeholder={t('sidebar.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
            style={{ textAlign: isRTL ? 'right' : 'left' }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 py-2">
        <button 
          onClick={() => setActiveTab('All')}
          className={`flex-1 py-2 text-center rounded-md transition-colors text-sm font-medium ${
            activeTab === 'All' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {t('chat.tabs.all')}
        </button>
        <button 
          onClick={() => setActiveTab('Users')}
          className={`flex-1 py-2 text-center rounded-md transition-colors text-sm font-medium ${
            activeTab === 'Users' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {t('chat.tabs.users')}
        </button>
        <button 
          onClick={() => setActiveTab('AI')}
          className={`flex-1 py-2 text-center rounded-md transition-colors text-sm font-medium ${
            activeTab === 'AI' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {t('chat.tabs.ai')}
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            No chats found
          </div>
        ) : (
          filteredChats.map(chat => (
            <Link
              key={chat.id}
              href={`/?id=${chat.id}`} 
              className={`block px-4 py-3 hover:bg-gray-100 transition-colors ${
                pathname === `/?id=${chat.id}` ? 'bg-gray-100' : ''
              }`}
              onClick={() => {
                if (window.innerWidth < 1024) { // lg breakpoint
                  onCloseMobile();
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center 
                    ${chat.isAI ? 'bg-purple-100 text-purple-600' : 'bg-purple-500 text-white'}
                  `}>
                    {chat.name.charAt(0).toUpperCase()}
                  </div>
                  {chat.isAI && (
                    <div className={`absolute -bottom-1 ${isRTL ? '-left-1' : '-right-1'} bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs border-2 border-white`}>
                      AI
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium truncate">{chat.name}</h3>
                    <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">{chat.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Bottom section with user profile */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center">
              {userProfile.initials}
            </div>
            <div>
              <div className="font-medium truncate" title={userProfile.displayName || ''}>
                {userProfile.displayName || t('user.profile')}
              </div>
              <div className="text-xs text-gray-500 truncate" title={userProfile.email || ''}>
                {userProfile.email || t('user.email')}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <button 
              onClick={() => setShowLogoutModal(true)}
              className={`p-2.5 rounded-full transition-all ${hoveredIcon === 'logout' ? 'scale-110' : ''}`}
              onMouseEnter={() => setHoveredIcon('logout')}
              onMouseLeave={() => setHoveredIcon(null)}
              style={{ 
                color: ICON_COLORS.logout,
                backgroundColor: hoveredIcon === 'logout' ? 'rgba(244, 63, 94, 0.1)' : 'transparent'
              }}
            >
              <LogOut className={`h-5 w-5 ${isRTL ? 'transform rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Use the separated LogoutModal component */}
      {isMounted && (
        <LogoutModal 
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleLogout}
        />
      )}
    </div>
  );
};

export default ChatSidebar; 