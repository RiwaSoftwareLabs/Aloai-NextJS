import { supabase } from './client';
import { AuthSession } from '@supabase/supabase-js';

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
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          { 
            user_id: data.user.id,
            display_name: displayName || email.split('@')[0],
            email: email
          }
        ]);
      
      if (insertError) {
        console.error('Error inserting user data into users table:', insertError);
        // Continue anyway since auth account was created successfully
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
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    
    return { user, error: null };
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

export const updateUserProfile = async (userData: { [key: string]: string | number | boolean | null | undefined }) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: userData
    });
    
    if (error) throw error;
    
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, data: null, error };
  }
};
