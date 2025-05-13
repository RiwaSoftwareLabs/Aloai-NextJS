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
  Bot,
  Clock,
  Check,
  X
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LogoutModal from '../modals/LogoutModal';
import AddFriendModal from '../modals/AddFriendModal';
import { logoutUser, checkSession } from '@/lib/supabase/auth';
import { 
  getPendingFriendRequests,
  getSentFriendRequests,
  getFriends,
  acceptFriendRequest, 
  declineFriendRequest,
  FriendRequest,
  Friend
} from '@/lib/supabase/friendship';

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

// Tab button component
const TabButton = ({ 
  label, 
  isActive, 
  onClick, 
  notificationCount = 0 
}: { 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
  notificationCount?: number;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2 text-sm font-medium relative ${
      isActive 
        ? 'bg-purple-100 text-purple-600' 
        : 'text-gray-600 hover:bg-gray-100'
    } rounded-md transition-colors text-center`}
  >
    {notificationCount > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
        {notificationCount}
      </span>
    )}
    {label}
  </button>
);

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onCloseMobile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Chats');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
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
  
  // Function to fetch user's friend data
  const fetchFriendData = async (userId: string) => {
    try {
      // Get pending friend requests
      const pendingResult = await getPendingFriendRequests(userId);
      if (pendingResult.success) {
        setPendingRequests(pendingResult.data);
      }
      
      // Get sent friend requests
      const sentResult = await getSentFriendRequests(userId);
      if (sentResult.success) {
        setSentRequests(sentResult.data);
      }
      
      // Get friends
      const friendsResult = await getFriends(userId);
      if (friendsResult.success) {
        setFriends(friendsResult.data);
      }
    } catch (error) {
      console.error('Error fetching friend data:', error);
    }
  };
  
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
          
          // Set user ID and fetch friend data
          setUserId(user.id);
          fetchFriendData(user.id);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
    
    // Set up an interval to refresh friend data every 30 seconds
    // This ensures data stays updated even if another client adds or accepts a friend request
    const refreshInterval = setInterval(() => {
      if (userId) {
        fetchFriendData(userId);
      }
    }, 30000); // 30 seconds
    
    return () => {
      setIsMounted(false);
      clearInterval(refreshInterval);
    };
  }, []);
  
  const handleAcceptFriendRequest = async (friendshipId: string) => {
    try {
      const result = await acceptFriendRequest(friendshipId);
      if (result.success && userId) {
        // Refresh the friend data
        fetchFriendData(userId);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };
  
  const handleDeclineFriendRequest = async (friendshipId: string) => {
    try {
      // This now completely removes the friendship record from the database
      const result = await declineFriendRequest(friendshipId);
      if (result.success && userId) {
        // Refresh the friend data
        fetchFriendData(userId);
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };
  
  const filteredChats = DUMMY_CHATS.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (activeTab === 'Chats' || 
     (activeTab === 'Friends' && !chat.isAI) || 
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

  // What to display in the main chat list area based on the active tab
  const renderTabContent = () => {
    if (activeTab === 'Friends') {
      return (
        <div className="flex-1 overflow-y-auto">
          {/* Pending friend requests */}
          {pendingRequests.length > 0 && (
            <div className="mb-2">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Friend Requests ({pendingRequests.length})
              </div>
              {pendingRequests.map(request => (
                <div key={request.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                        {request.users.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-medium">{request.users.display_name}</h3>
                        <p className="text-xs text-gray-500">{request.users.email}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleAcceptFriendRequest(request.id)}
                        className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600"
                        title="Accept"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeclineFriendRequest(request.id)}
                        className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                        title="Decline"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Sent friend requests */}
          {sentRequests.length > 0 && (
            <div className="mb-2">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pending Invitations ({sentRequests.length})
              </div>
              {sentRequests.map(request => (
                <div key={request.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                        {request.users.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-medium text-gray-500">{request.users.display_name}</h3>
                          <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">Invitation Sent</span>
                        </div>
                        <p className="text-xs text-gray-500">{request.users.email}</p>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Friends list */}
          <div>
            <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Friends ({friends.length})
            </div>
            {friends.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                No friends yet
              </div>
            ) : (
              friends.map(friend => (
                <Link
                  key={friend.id}
                  href={`/?id=${friend.userId}`}
                  className={`block px-4 py-3 hover:bg-gray-100 transition-colors ${
                    pathname === `/?id=${friend.userId}` ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => {
                    if (window.innerWidth < 1024) { // lg breakpoint
                      onCloseMobile();
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center">
                        {friend.displayName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-medium truncate">{friend.displayName}</h3>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{friend.email}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          
          {/* No friends or requests */}
          {pendingRequests.length === 0 && sentRequests.length === 0 && friends.length === 0 && (
            <div className="text-center p-8">
              <div className="mb-4">
                <UserPlus className="h-12 w-12 mx-auto text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">No friends yet</h3>
              <p className="text-gray-500 mb-4">Add friends to start chatting</p>
              <button
                onClick={() => setShowAddFriendModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Add Friend
              </button>
            </div>
          )}
        </div>
      );
    } else {
      // Original content for Chats and AI tabs
      return (
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
      );
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
        
        {/* Add New User */}
        <div className="relative">
          <button 
            onClick={() => setShowAddFriendModal(true)}
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

      {/* Tab navigation */}
      <div className="flex px-4 py-2">
        <TabButton 
          label={t('chat.tabs.all')}
          isActive={activeTab === 'Chats'} 
          onClick={() => setActiveTab('Chats')} 
        />
        <TabButton 
          label={t('chat.tabs.users')}
          isActive={activeTab === 'Friends'} 
          notificationCount={pendingRequests.length}
          onClick={() => {
            setActiveTab('Friends');
            // Refresh friend data when switching to Friends tab
            if (userId) {
              fetchFriendData(userId);
            }
          }} 
        />
        <TabButton 
          label={t('chat.tabs.ai')}
          isActive={activeTab === 'AI'} 
          onClick={() => setActiveTab('AI')} 
        />
      </div>

      {/* Content area */}
      {renderTabContent()}

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

      {/* Modals */}
      {isMounted && (
        <>
          {showLogoutModal && (
            <LogoutModal 
              isOpen={showLogoutModal}
              onClose={() => setShowLogoutModal(false)}
              onConfirm={handleLogout}
            />
          )}
          {showAddFriendModal && (
            <AddFriendModal 
              isOpen={showAddFriendModal}
              onClose={() => setShowAddFriendModal(false)}
              onFriendRequestSent={() => {
                if (userId) {
                  fetchFriendData(userId);
                }
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ChatSidebar; 