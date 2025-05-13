import { supabase } from './client';

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
  DECLINED: number;
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

// Database response types
interface DbUser {
  user_id: string;
  display_name: string;
  email: string;
}

// Constants for friendship status
export const FRIENDSHIP_STATUS: FriendshipStatus = {
  PENDING: 0,
  ACCEPTED: 1,
  DECLINED: 2
};

/**
 * Send a friend request to a user by email
 */
export const sendFriendRequest = async ({ requesterId, email }: FriendRequestParams): Promise<FriendRequestResponse> => {
  try {
    // First check if the user exists in the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, email')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      // User doesn't exist, consider sending an invitation email
      return {
        success: false,
        message: 'User not found. An invitation email will be sent.',
        error: userError
      };
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
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;

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
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        created_at,
        users!friendships_requester_id_fkey (
          user_id,
          display_name,
          email
        )
      `)
      .eq('receiver_id', userId)
      .eq('status', FRIENDSHIP_STATUS.PENDING);

    if (error) throw error;

    // Properly format the data to match the FriendRequest interface
    const formattedData: FriendRequest[] = (data || []).map(item => {
      const userData = item.users as unknown as DbUser;
      return {
        id: item.id,
        status: item.status,
        created_at: item.created_at,
        users: {
          user_id: userData.user_id,
          display_name: userData.display_name,
          email: userData.email
        }
      };
    });

    return { 
      success: true, 
      data: formattedData,
      error: null
    };
  } catch (error) {
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
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        created_at,
        users!friendships_receiver_id_fkey (
          user_id,
          display_name,
          email
        )
      `)
      .eq('requester_id', userId)
      .eq('status', FRIENDSHIP_STATUS.PENDING);

    if (error) throw error;

    // Properly format the data to match the FriendRequest interface
    const formattedData: FriendRequest[] = (data || []).map(item => {
      const userData = item.users as unknown as DbUser;
      return {
        id: item.id,
        status: item.status,
        created_at: item.created_at,
        users: {
          user_id: userData.user_id,
          display_name: userData.display_name,
          email: userData.email
        }
      };
    });

    return { 
      success: true, 
      data: formattedData,
      error: null
    };
  } catch (error) {
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
    // Get friends where user is the requester
    const { data: sentRequests, error: sentError } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        created_at,
        users!friendships_receiver_id_fkey (
          user_id,
          display_name,
          email
        )
      `)
      .eq('requester_id', userId)
      .eq('status', FRIENDSHIP_STATUS.ACCEPTED);

    if (sentError) throw sentError;

    // Get friends where user is the receiver
    const { data: receivedRequests, error: receivedError } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        created_at,
        users!friendships_requester_id_fkey (
          user_id,
          display_name,
          email
        )
      `)
      .eq('receiver_id', userId)
      .eq('status', FRIENDSHIP_STATUS.ACCEPTED);

    if (receivedError) throw receivedError;

    // Combine both sets of data with proper typing
    const friends: Friend[] = [
      ...(sentRequests || []).map(request => {
        const userData = request.users as unknown as DbUser;
        return {
          id: request.id,
          friendshipId: request.id,
          userId: userData.user_id,
          displayName: userData.display_name,
          email: userData.email,
          createdAt: request.created_at
        };
      }),
      ...(receivedRequests || []).map(request => {
        const userData = request.users as unknown as DbUser;
        return {
          id: request.id,
          friendshipId: request.id,
          userId: userData.user_id,
          displayName: userData.display_name,
          email: userData.email,
          createdAt: request.created_at
        };
      })
    ];

    return { 
      success: true, 
      data: friends,
      error: null
    };
  } catch (error) {
    return { 
      success: false, 
      data: [], 
      error
    };
  }
}; 