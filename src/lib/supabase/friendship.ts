import { supabase } from './client';
import { supabaseCache, cacheInvalidators } from './cache';

/**
 * Types for friendship operations
 */
export type FriendRequestParams = {
  requesterId: string;
  email: string;
};

export type FriendRequestResponse = {
  success: boolean;
  message: string;
  data?: unknown;
  error?: unknown;
};

export type FriendshipStatus = {
  PENDING: number;
  ACCEPTED: number;
};

// User types
export interface UserData {
  user_id: string;
  display_name: string;
  email: string;
}

export interface FriendRequest {
  id: string;
  status: number;
  created_at: string;
  users: UserData;
}

export interface Friend {
  id: string;
  friendshipId: string;
  userId: string;
  displayName: string;
  email: string;
  createdAt: string;
}

// Constants for friendship status
export const FRIENDSHIP_STATUS: FriendshipStatus = {
  PENDING: 0,
  ACCEPTED: 1
};

/**
 * Send a friend request to a user by email
 */
export const sendFriendRequest = async ({ requesterId, email }: FriendRequestParams): Promise<FriendRequestResponse> => {
  try {
    // Check cache for user by email first
    const userCacheKey = supabaseCache.getUserByEmailKey(email);
    let userData = supabaseCache.get<{ user_id: string; email: string }>(userCacheKey);
    
    if (!userData) {
      // First check if the user exists in the users table
      const { data, error: userError } = await supabase
        .from('users')
        .select('user_id, email')
        .eq('email', email)
        .single();

      if (userError || !data) {
        // User doesn't exist, consider sending an invitation email
        return {
          success: false,
          message: 'User not found. An invitation email will be sent.',
          error: userError
        };
      }
      
      userData = data;
      // Cache user data for 5 minutes
      supabaseCache.set(userCacheKey, userData, supabaseCache.getDefaultTTL());
    }

    // Make sure requester isn't trying to add themselves
    if (userData.user_id === requesterId) {
      return {
        success: false,
        message: 'You cannot add yourself as a friend.'
      };
    }

    // Check if a friendship already exists
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('*')
      .or(`(requester_id.eq.${requesterId}.and.receiver_id.eq.${userData.user_id}),(requester_id.eq.${userData.user_id}.and.receiver_id.eq.${requesterId})`)
      .maybeSingle();

    if (existingFriendship) {
      if (existingFriendship.status === FRIENDSHIP_STATUS.PENDING) {
        return {
          success: false,
          message: 'A friend request is already pending.'
        };
      } else if (existingFriendship.status === FRIENDSHIP_STATUS.ACCEPTED) {
        return {
          success: false,
          message: 'You are already friends with this user.'
        };
      }
    }

    // Create friend request
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: requesterId,
        receiver_id: userData.user_id,
        status: FRIENDSHIP_STATUS.PENDING
      })
      .select()
      .single();

    if (error) throw error;

    // Invalidate friendship-related caches for both users
    cacheInvalidators.allFriendshipData(requesterId);
    cacheInvalidators.allFriendshipData(userData.user_id);

    return {
      success: true,
      message: 'Friend request sent successfully!',
      data
    };
  } catch (error) {
    if (error && Object.keys(error).length > 0) {
      console.error('Error sending friend request:', error);
    }
    return {
      success: false,
      message: 'Failed to send friend request.',
      error
    };
  }
};

/**
 * Send an invitation email to a non-existing user
 */
export const sendInvitationEmail = async (email: string, inviterId: string): Promise<FriendRequestResponse> => {
  try {
    // In a real implementation, you would integrate with an email service
    // Here we just simulate the process
    
    console.log(`Sending invitation email to ${email} from user ${inviterId}`);
    
    // TODO: Implement actual email sending functionality
    
    return {
      success: true,
      message: 'Invitation email sent successfully!'
    };
  } catch (error) {
    if (error && Object.keys(error).length > 0) {
      console.error('Error sending invitation email:', error);
    }
    return {
      success: false,
      message: 'Failed to send invitation email.',
      error
    };
  }
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (friendshipId: string): Promise<FriendRequestResponse> => {
  try {
    // First get the friendship to know which users are involved
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('requester_id, receiver_id')
      .eq('id', friendshipId)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('friendships')
      .update({ 
        status: FRIENDSHIP_STATUS.ACCEPTED,
        updated_at: new Date().toISOString()
      })
      .eq('id', friendshipId)
      .select()
      .single();

    if (error) throw error;

    // Invalidate friendship-related caches for both users
    if (friendship) {
      cacheInvalidators.allFriendshipData(friendship.requester_id);
      cacheInvalidators.allFriendshipData(friendship.receiver_id);
    }

    return {
      success: true,
      message: 'Friend request accepted!',
      data
    };
  } catch (error) {
    if (error && Object.keys(error).length > 0) {
      console.error('Error accepting friend request:', error);
    }
    return {
      success: false,
      message: 'Failed to accept friend request.',
      error
    };
  }
};

/**
 * Decline a friend request and remove it from the database
 */
export const declineFriendRequest = async (friendshipId: string): Promise<FriendRequestResponse> => {
  try {
    // First get the friendship to know which users are involved
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('requester_id, receiver_id')
      .eq('id', friendshipId)
      .single();

    if (fetchError) throw fetchError;

    // Simply delete the record instead of updating status to DECLINED
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;

    // Invalidate friendship-related caches for both users
    if (friendship) {
      cacheInvalidators.allFriendshipData(friendship.requester_id);
      cacheInvalidators.allFriendshipData(friendship.receiver_id);
    }

    return {
      success: true,
      message: 'Friend request declined and removed.'
    };
  } catch (error) {
    if (error && Object.keys(error).length > 0) {
      console.error('Error declining friend request:', error);
    }
    return {
      success: false,
      message: 'Failed to decline friend request.',
      error
    };
  }
};

/**
 * Get pending friend requests for a user
 */
export const getPendingFriendRequests = async (userId: string): Promise<{ success: boolean; data: FriendRequest[]; error: unknown | null }> => {
  try {
    // Check cache first
    const cacheKey = supabaseCache.getPendingRequestsKey(userId);
    const cached = supabaseCache.get<{ success: boolean; data: FriendRequest[]; error: unknown | null }>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Manual join approach using two separate queries instead of foreign key references
    const { data: friendshipData, error: friendshipError } = await supabase
      .from('friendships')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', FRIENDSHIP_STATUS.PENDING);

    if (friendshipError) throw friendshipError;
    
    if (!friendshipData || friendshipData.length === 0) {
      const result = { success: true, data: [], error: null };
      // Cache empty result for 30 seconds
      supabaseCache.set(cacheKey, result, supabaseCache.getShortTTL());
      return result;
    }

    // Get all requester users
    const requesterIds = friendshipData.map(item => item.requester_id);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .in('user_id', requesterIds);
      
    if (userError) throw userError;

    // Map the data manually
    const formattedData: FriendRequest[] = friendshipData.map(friendship => {
      const user = userData?.find(u => u.user_id === friendship.requester_id);
      return {
        id: friendship.id,
        status: friendship.status,
        created_at: friendship.created_at,
        users: {
          user_id: user?.user_id || '',
          display_name: user?.display_name || '',
          email: user?.email || ''
        }
      };
    });
    
    console.log('Pending friend requests:', formattedData);

    const result = { 
      success: true, 
      data: formattedData,
      error: null
    };

    // Cache the result for 30 seconds (short TTL for pending requests)
    supabaseCache.set(cacheKey, result, supabaseCache.getShortTTL());

    return result;
  } catch (error) {
    console.error('Error getting pending friend requests:', error);
    return { 
      success: false, 
      data: [], 
      error
    };
  }
};

/**
 * Get sent friend requests by a user
 */
export const getSentFriendRequests = async (userId: string): Promise<{ success: boolean; data: FriendRequest[]; error: unknown | null }> => {
  try {
    // Manual join approach using two separate queries instead of foreign key references
    const { data: friendshipData, error: friendshipError } = await supabase
      .from('friendships')
      .select('*')
      .eq('requester_id', userId)
      .eq('status', FRIENDSHIP_STATUS.PENDING);

    if (friendshipError) throw friendshipError;
    
    if (!friendshipData || friendshipData.length === 0) {
      return { success: true, data: [], error: null };
    }

    // Get all receiver users
    const receiverIds = friendshipData.map(item => item.receiver_id);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .in('user_id', receiverIds);
      
    if (userError) throw userError;

    // Map the data manually
    const formattedData: FriendRequest[] = friendshipData.map(friendship => {
      const user = userData?.find(u => u.user_id === friendship.receiver_id);
      return {
        id: friendship.id,
        status: friendship.status,
        created_at: friendship.created_at,
        users: {
          user_id: user?.user_id || '',
          display_name: user?.display_name || '',
          email: user?.email || ''
        }
      };
    });

    console.log('Sent friend requests:', formattedData);

    return { 
      success: true, 
      data: formattedData,
      error: null
    };
  } catch (error) {
    console.error('Error getting sent friend requests:', error);
    return { 
      success: false, 
      data: [], 
      error
    };
  }
};

/**
 * Get a user's friends (accepted requests)
 */
export const getFriends = async (userId: string): Promise<{ success: boolean; data: Friend[]; error: unknown | null }> => {
  try {
    // Log for debugging
    console.log(`Getting friends for user ${userId}`);
    
    // Get friendships where user is the requester - manual approach
    const { data: sentFriendships, error: sentError } = await supabase
      .from('friendships')
      .select('*')
      .eq('requester_id', userId)
      .eq('status', FRIENDSHIP_STATUS.ACCEPTED);

    if (sentError) throw sentError;
    
    // Get friendships where user is the receiver - manual approach
    const { data: receivedFriendships, error: receivedError } = await supabase
      .from('friendships')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', FRIENDSHIP_STATUS.ACCEPTED);

    if (receivedError) throw receivedError;
    
    // If no friendships, return empty array
    if ((!sentFriendships || sentFriendships.length === 0) && 
        (!receivedFriendships || receivedFriendships.length === 0)) {
      return { success: true, data: [], error: null };
    }
    
    // Get all user IDs we need to fetch
    const receiverIds = sentFriendships?.map(item => item.receiver_id) || [];
    const requesterIds = receivedFriendships?.map(item => item.requester_id) || [];
    const allUserIds = [...new Set([...receiverIds, ...requesterIds])];
    
    // Fetch all relevant users in one query
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('user_id', allUserIds);
      
    if (usersError) throw usersError;
    
    console.log('Users data for friends:', usersData);

    // Build the friends list
    const friends: Friend[] = [
      // Friends where current user is the requester
      ...(sentFriendships || []).map(friendship => {
        const user = usersData?.find(u => u.user_id === friendship.receiver_id);
        return {
          id: friendship.id,
          friendshipId: friendship.id,
          userId: user?.user_id || '',
          displayName: user?.display_name || '',
          email: user?.email || '',
          createdAt: friendship.created_at
        };
      }),
      // Friends where current user is the receiver
      ...(receivedFriendships || []).map(friendship => {
        const user = usersData?.find(u => u.user_id === friendship.requester_id);
        return {
          id: friendship.id,
          friendshipId: friendship.id,
          userId: user?.user_id || '',
          displayName: user?.display_name || '',
          email: user?.email || '',
          createdAt: friendship.created_at
        };
      })
    ];

    console.log('Combined friends list:', friends);

    return { 
      success: true, 
      data: friends,
      error: null
    };
  } catch (error) {
    console.error('Error getting friends:', error);
    return { 
      success: false, 
      data: [], 
      error
    };
  }
}; 