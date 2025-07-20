import { supabase } from './client';

export type CreateAIBrainParams = {
  userId: string;
  mentorId: string;
  name: string;
  role?: string;
  systemPrompt?: string;
  type?: string;
};

export type AIBrain = {
  id: string;
  user_id: string;
  mentor_id: string;
  name: string;
  role: string;
  system_prompt: string | null;
  type: string;
  created_at: string;
  updated_at: string;
};

/**
 * Create a new AI brain for a user
 */
export const createAIBrain = async (params: CreateAIBrainParams) => {
  try {
    const { data, error } = await supabase
      .from('ai_brains')
      .insert([
        {
          user_id: params.userId,
          mentor_id: params.mentorId,
          name: params.name,
          role: params.role || 'AI Brain',
          system_prompt: params.systemPrompt,
          type: params.type || 'user'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
      error: null
    };
  } catch (error) {
    console.error('Error creating AI brain:', error);
    return {
      success: false,
      data: null,
      error
    };
  }
};

/**
 * Get AI brain by user ID
 */
export const getAIBrainByUserId = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('ai_brains')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
      error: null
    };
  } catch (error) {
    console.error('Error fetching AI brain:', error);
    return {
      success: false,
      data: null,
      error
    };
  }
};

/**
 * Get the Super AI Brain (mentor) ID
 * This should be a fixed value for the super AI brain
 */
export const getSuperAIBrainId = async () => {
  try {
    const { data, error } = await supabase
      .from('ai_brains')
      .select('id')
      .eq('type', 'super')
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data?.id,
      error: null
    };
  } catch (error) {
    console.error('Error fetching Super AI Brain ID:', error);
    return {
      success: false,
      data: null,
      error
    };
  }
};

/**
 * Create AI brain for a newly registered user
 */
export const createUserAIBrain = async (userId: string, userName: string) => {
  try {
    // Get the Super AI Brain ID
    const superBrainResult = await getSuperAIBrainId();
    if (!superBrainResult.success || !superBrainResult.data) {
      throw new Error('Super AI Brain not found');
    }

    const mentorId = superBrainResult.data;
    console.log('mentorId ======>', mentorId);
    const brainName = `${userName}'s AI Brain`;
    
    // Create a personalized system prompt
    const systemPrompt = `You are ${userName}'s personal AI Brain. You are here to help ${userName} with their tasks, answer questions, and provide assistance. You should be helpful, friendly, and knowledgeable. Always address ${userName} by their name when appropriate.`;

    console.log('createUserAIBrain ======>', {
        userId,
        mentorId,
        name: brainName,
        role: 'AI Brain',
        systemPrompt,
        type: 'user'
      });

    const result = await createAIBrain({
      userId,
      mentorId,
      name: brainName,
      role: 'AI Brain',
      systemPrompt,
      type: 'user'
    });

    return result;
  } catch (error) {
    console.error('Error creating user AI brain:', error);
    return {
      success: false,
      data: null,
      error
    };
  }
};
