import { supabase } from './client';
import { AuthSession } from '@supabase/supabase-js';
import { supabaseCache, cacheInvalidators } from './cache';

export type RegisterUserParams = {
  email: string;
  password: string;
  displayName?: string;
  metadata?: {
    [key: string]: string | number | boolean | null | undefined;
  };
};

export type LoginUserParams = {
  email: string;
  password: string;
};

export const registerUser = async ({ email, password, displayName, metadata = {} }: RegisterUserParams) => {
  try {
    const userMetadata = {
      ...metadata,
      displayName
    };
    
    // Step 1: Register the user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata
      }
    });
    
    if (error) throw error;
    
    // Step 2: Insert the user data into the users table
    if (data.user) {
      const userId = data.user.id;
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          { 
            user_id: userId,
            display_name: displayName || email.split('@')[0],
            email: email
          }
        ]);
      
      if (insertError) {
        console.error('Error inserting user data into users table:', insertError);
        // Continue anyway since auth account was created successfully
      }

      // Create a ai brain for the user
      const aiBrainArray = {
        display_name: displayName+"'s AI Brain",
        role_message:"You are the personal AI Brain for "+displayName+" on ALOAI. Assist "+displayName+" with any tasks, questions, and daily needs in a helpful, friendly, and context-aware manner. Learn from their chats, uploaded files, links, and instructions. Seek help from the Super AI Brain when needed. Always respect privacy, address "+displayName+" by name, and deliver clear, proactive, personalized support.",
        email: displayName?.replace(/\s+/g, '') + "@aloai.ai",
        password: "12345678",
      }

      const { data: aiBrainData, error: aiBrainError } = await supabase.auth.signUp({
        email: aiBrainArray.email,
        password: aiBrainArray.password,
        options: {
          data: aiBrainArray
        }
      });
      if (aiBrainError) {
        console.error('Error creating ai brain:', aiBrainError);
      }
      const { error: insertAiBrainError } = await supabase
      .from('users')
      .insert([
        { 
          user_type:'ai',
          user_id: aiBrainData?.user?.id,
          display_name: aiBrainArray.display_name,
          email: aiBrainArray.email,
          role_message: aiBrainArray.role_message
        }
      ]);
      if (insertAiBrainError) {
        console.error('Error inserting ai brain data into users table:', insertAiBrainError);
      }
      // insert friend record for the user
      const { error: insertFriendError } = await supabase
        .from('friendships')
        .insert([
          { 
            requester_id: userId,
            receiver_id: aiBrainData?.user?.id,
            status: 1
          }
        ]);
      if (insertFriendError) {
        console.error('Error inserting friend record for the user:', insertFriendError);
      }
    }
    
    return {
      success: true,
      data,
      error: null
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      success: false,
      data: null,
      error
    };
  }
};

// Add a session cache mechanism with timestamp
let sessionCache: {
  data: { session: AuthSession | null };
  timestamp: number;
  isAuthenticated: boolean;
} | null = null;

// Cache invalidation time: 5 seconds
const CACHE_INVALIDATION_TIME = 5000;

export const checkSession = async () => {
  try {
    // Check cache first
    const now = Date.now();
    if (sessionCache && (now - sessionCache.timestamp < CACHE_INVALIDATION_TIME)) {
      return {
        isAuthenticated: sessionCache.isAuthenticated,
        session: sessionCache.data.session,
        error: null
      };
    }
    
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session check error:', error);
      throw error;
    }
    
    const isAuthenticated = !!data.session;
    
    // Update cache
    sessionCache = {
      data,
      timestamp: now,
      isAuthenticated
    };
    
    return {
      isAuthenticated: isAuthenticated,
      session: data.session,
      error: null
    };
  } catch (error) {
    console.error('Error checking session:', error);
    return {
      isAuthenticated: false,
      session: null,
      error
    };
  }
};

// Clear session cache when auth state changes
export const clearSessionCache = () => {
  sessionCache = null;
};

export const loginUser = async ({ email, password }: LoginUserParams) => {
  try {
    
    // Clear session cache
    clearSessionCache();
    
    // First clear any existing session to prevent conflicts
    await supabase.auth.signOut();
    
    // Now sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Supabase login error:', error);
      throw error;
    }
    
    return {
      success: true,
      data,
      error: null
    };
  } catch (error) {
    console.error('Error logging in user:', error);
    return {
      success: false,
      data: null,
      error
    };
  }
};

export const logoutUser = async () => {
  try {
    // Clear session cache
    clearSessionCache();
    
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    return {
      success: true,
      error: null
    };
  } catch (error) {
    console.error('Error logging out user:', error);
    return {
      success: false,
      error
    };
  }
};

export const getCurrentUser = async () => {
  try {
    // First get the auth user data
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    
    if (!user) {
      return { user: null, error: null };
    }
    
    // Check cache for user profile data
    const cacheKey = supabaseCache.getUserProfileKey(user.id);
    let userData = supabaseCache.get(cacheKey);
    
    if (!userData) {
      // Fetch the user details from the users table
      const { data, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user from users table:', userError);
        // Return auth user data if users table fetch fails
        return { user, error: null };
      }
      
      userData = data;
      // Cache the user data for 5 minutes
      supabaseCache.set(cacheKey, userData, supabaseCache.getDefaultTTL());
    }
    
    // Combine auth user with users table data
    const combinedUser = {
      ...user,
      profile: userData
    };
    
    return { user: combinedUser, error: null };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, error };
  }
};

export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error };
  }
};

interface UserUpdateData {
  display_name?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export const updateUserProfile = async (userData: { [key: string]: string | number | boolean | null | undefined }) => {
  try {
    // First get the auth user data to make sure we have the ID
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) throw authError;
    if (!user) throw new Error("No authenticated user found");
    
    // Determine which fields go to auth.updateUser and which go to users table
    const { display_name, ...otherFields } = userData as UserUpdateData;
    
    // Update auth user metadata
    const { data, error } = await supabase.auth.updateUser({
      data: otherFields
    });
    
    if (error) throw error;
    
    // Also update the users table if we have fields that should go there
    if (display_name !== undefined) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          display_name: display_name,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (updateError) {
        console.error('Error updating users table:', updateError);
        throw updateError;
      }
    }
    
    // Invalidate user profile cache
    cacheInvalidators.userProfile(user.id);
    
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, data: null, error };
  }
};

/**
 * Update the current user's last_seen to now
 */
export const updateLastSeen = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('No authenticated user found');
    const { error } = await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) throw error;
    
    // Invalidate last seen cache
    cacheInvalidators.userLastSeen(user.id);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating last_seen:', error);
    return { success: false, error };
  }
};

/**
 * Fetch a user's last_seen timestamp by user_id
 */
export const getUserLastSeen = async (userId: string) => {
  try {
    // Check cache first
    const cacheKey = supabaseCache.getUserLastSeenKey(userId);
    const cached = supabaseCache.get<{ last_seen: string | null }>(cacheKey);
    
    if (cached) {
      return { last_seen: cached.last_seen, error: null };
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('last_seen')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    
    const result = { last_seen: data?.last_seen || null, error: null };
    
    // Cache the result for 30 seconds (short TTL for last seen data)
    supabaseCache.set(cacheKey, result, supabaseCache.getShortTTL());
    
    return result;
  } catch (error) {
    console.error('Error fetching user last_seen:', error);
    return { last_seen: null, error };
  }
};

/**
 * Format a timestamp as 'x ago' (e.g., '5 minutes ago', 'just now')
 */
export function formatLastSeenAgo(lastSeen: string | Date | null): string {
  if (!lastSeen) return '';
  const now = new Date();
  const seen = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  const diffMs = now.getTime() - seen.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}
