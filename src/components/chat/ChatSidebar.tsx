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
import { getRecentChatsForUser, Chat, getUnreadCountForChat } from '@/lib/supabase/aiChat';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AnimatePresence, Reorder } from 'framer-motion';

interface ChatSidebarProps {
  onCloseMobile: () => void;
}

// Primary color
const PRIMARY_COLOR = "#9333ea"; // Purple


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

type AIFriend = Friend & { user_type: string };

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
  const [chats, setChats] = useState<Chat[]>([]);
  const [aiFriends, setAIFriends] = useState<AIFriend[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
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
        // Fetch user_type for each friend
        const friendIds = friendsResult.data.map(f => f.userId);
        if (friendIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('user_id, user_type, display_name, email')
            .in('user_id', friendIds);
          if (usersData) {
            setAIFriends(
              friendsResult.data
                .map(f => {
                  const user = (usersData as { user_id: string; user_type: string; display_name: string; email: string }[]).find(u => u.user_id === f.userId);
                  if (user && (user.user_type === 'ai' || user.user_type === 'super-ai')) {
                    return {
                      ...f,
                      user_type: user.user_type,
                    } as AIFriend;
                  }
                  return null;
                })
                .filter((f): f is AIFriend => f !== null)
            );
          } else {
            setAIFriends([]);
          }
        } else {
          setAIFriends([]);
        }
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
          // Fetch all chats for this user
          const userChats = await getRecentChatsForUser(user.id);
          setChats(userChats);
          // Fetch unread counts for each chat
          const unreadObj: Record<string, number> = {};
          await Promise.all(userChats.map(async (chat) => {
            const count = await getUnreadCountForChat(chat.id, user.id);
            unreadObj[chat.id] = count;
          }));
          setUnreadCounts(unreadObj);
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
        getRecentChatsForUser(userId).then(async (userChats) => {
          setChats(userChats);
          // Refresh unread counts
          const unreadObj: Record<string, number> = {};
          await Promise.all(userChats.map(async (chat) => {
            const count = await getUnreadCountForChat(chat.id, userId);
            unreadObj[chat.id] = count;
          }));
          setUnreadCounts(unreadObj);
        });
      }
    }, 30000); // 30 seconds

    // --- Supabase Realtime subscription for messages ---
    let messageChannel: RealtimeChannel | null = null;
    if (userId) {
      messageChannel = supabase
        .channel('public:messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          async (payload) => {
            const newMessage = payload.new;
            if (newMessage.sender_id === userId || newMessage.receiver_id === userId) {
              setChats((prevChats) => {
                // Find the chat this message belongs to
                const chatIndex = prevChats.findIndex(
                  (chat) => chat.id === newMessage.chat_id
                );
                if (chatIndex !== -1) {
                  // Update the chat's last_message_at and last_message_text
                  const updatedChat = {
                    ...prevChats[chatIndex],
                    last_message_at: newMessage.created_at,
                    last_message_text: newMessage.content,
                  };
                  // Move the updated chat to the top
                  const newChats = [
                    updatedChat,
                    ...prevChats.filter((_, i) => i !== chatIndex),
                  ];
                  return newChats;
                } else {
                  // Optionally, fetch the new chat if it doesn't exist in the list
                  // (e.g., a new chat was just created)
                  getRecentChatsForUser(userId).then((userChats) => {
                    setChats(userChats);
                  });
                  return prevChats;
                }
              });
            }
          }
        )
        .subscribe();
    }

    // Listen for refresh-unread-counts event
    const handleRefresh = () => {
      if (userId) {
        getRecentChatsForUser(userId).then(async (userChats) => {
          setChats(userChats);
          const unreadObj: Record<string, number> = {};
          await Promise.all(userChats.map(async (chat) => {
            const count = await getUnreadCountForChat(chat.id, userId);
            unreadObj[chat.id] = count;
          }));
          setUnreadCounts(unreadObj);
        });
      }
    };
    window.addEventListener('refresh-unread-counts', handleRefresh);

    return () => {
      setIsMounted(false);
      clearInterval(refreshInterval);
      // Clean up Supabase Realtime subscription
      if (messageChannel) {
        supabase.removeChannel(messageChannel);
      }
      window.removeEventListener('refresh-unread-counts', handleRefresh);
    };
  }, [userId]);
  
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
  
  // const filteredChats = DUMMY_CHATS.filter(chat => 
  //   chat.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
  //   (activeTab === 'Chats' || 
  //    (activeTab === 'Friends' && !chat.isAI) || 
  //    (activeTab === 'AI' && chat.isAI))
  // );

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
      // Only show friends whose user_type is not 'ai'
      const filteredFriends = friends.filter(friend => {
        // We need to check user_type for each friend
        // Use the same usersData as in fetchFriendData
        // For safety, fetch user_type for each friend here
        // (Assume we have usersData from fetchFriendData, or re-query if needed)
        // For now, filter out any friend that is also in aiFriends
        return !aiFriends.some(ai => ai.userId === friend.userId);
      }).filter(friend =>
        friend.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      );
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
              Friends ({filteredFriends.length})
            </div>
            {filteredFriends.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                No friends yet
              </div>
            ) : (
              filteredFriends.map(friend => (
                <Link
                  key={friend.id}
                  href={`/?friend_id=${friend.userId}`}
                  className={`block px-4 py-3 hover:bg-gray-100 transition-colors ${
                    pathname === `/?friend_id=${friend.userId}` ? 'bg-gray-100' : ''
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
          {pendingRequests.length === 0 && sentRequests.length === 0 && filteredFriends.length === 0 && (
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
    } else if (activeTab === 'AI') {
      // List all AI friends (user_type = 'ai')
      const filteredAIFriends = aiFriends.filter(friend =>
        friend.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return (
        <div className="flex-1 overflow-y-auto">
          {filteredAIFriends.length === 0 ? (
            <div className="text-center p-4 text-gray-500">No AI users found</div>
          ) : (
            filteredAIFriends.map(friend => (
              <Link
                key={friend.id}
                href={`/?friend_id=${friend.userId}`}
                className={`block px-4 py-3 hover:bg-gray-100 transition-colors`}
                onClick={() => {
                  if (window.innerWidth < 1024) onCloseMobile();
                }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={friend.user_type === 'super-ai' ? '/icons/super-ai-brain.png' : '/icons/ai-brain.png'}
                    alt={friend.user_type === 'super-ai' ? 'Super AI Brain' : 'AI Brain'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{friend.displayName}</h3>
                    <p className="text-xs text-gray-500 truncate">{friend.user_type === 'super-ai' ? 'Super AI User' : 'AI User'}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      );
    } else if (activeTab === 'Chats') {
      // List all chats for the user (friend and AI)
      const filteredChats = chats
        .filter(chat => {
          const name = chat.title;
          return name?.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      return (
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="text-center p-4 text-gray-500">No chats found</div>
          ) : (
            <Reorder.Group
              axis="y"
              values={filteredChats}
              onReorder={() => {}}
              className="space-y-0"
            >
              <AnimatePresence initial={false}>
                {filteredChats.map(chat => {
                  // Determine the friend_id (the other participant)
                  let friendId = chat.user_id;
                  if (userId && chat.user_id === userId) {
                    friendId = chat.receiver_id || '';
                  }
                  if (userId && chat.receiver_id === userId) {
                    friendId = chat.user_id;
                  }

                  // Find if this friend is an AI or super-ai
                  const aiFriend = aiFriends.find(ai => ai.userId === friendId);
                  // Find friend in friends list
                  const friend = friends.find(f => f.userId === friendId);
                  const displayName = friend?.displayName || chat.title || 'Chat';
                  let avatarContent;
                  if (aiFriend) {
                    avatarContent = (
                      <img
                        src={aiFriend.user_type === 'super-ai' ? '/icons/super-ai-brain.png' : '/icons/ai-brain.png'}
                        alt={aiFriend.user_type === 'super-ai' ? 'Super AI Brain' : 'AI Brain'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    );
                  } else {
                    avatarContent = (
                      <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center">
                        {displayName.charAt(0).toUpperCase() || 'C'}
                      </div>
                    );
                  }

                  return (
                    <Reorder.Item
                      key={chat.id}
                      value={chat}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Link
                        href={`/?friend_id=${friendId}`}
                        className={`block px-4 py-3 hover:bg-gray-100 transition-colors relative`}
                        onClick={() => {
                          if (window.innerWidth < 1024) onCloseMobile();
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {avatarContent}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate flex items-center">
                              {displayName}
                              {unreadCounts[chat.id] > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                                  {unreadCounts[chat.id]}
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">{chat.last_message_text || ''}</p>
                          </div>
                        </div>
                      </Link>
                    </Reorder.Item>
                  );
                })}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>
      );
    } else {
      return (
        <div className="flex-1 overflow-y-auto">
          <div className="text-center p-4 text-gray-500">No chats found</div>
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