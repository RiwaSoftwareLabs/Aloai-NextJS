// Script to clean up duplicate chats
// Run this script once to fix existing duplicate chats

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupDuplicateChats() {
  try {
    console.log('Starting duplicate chat cleanup...');
    
    // Step 1: Get all non-group chats
    const { data: allChats, error: fetchError } = await supabase
      .from('chats')
      .select('*')
      .eq('is_group', false);
    
    if (fetchError) throw fetchError;
    
    console.log(`Found ${allChats?.length || 0} total chats`);
    
    // Step 2: Group chats by user pair (normalized)
    const chatGroups = new Map();
    
    allChats?.forEach(chat => {
      if (chat.receiver_id) {
        const [smallerId, largerId] = [chat.user_id, chat.receiver_id].sort();
        const key = `${smallerId}-${largerId}`;
        
        if (!chatGroups.has(key)) {
          chatGroups.set(key, []);
        }
        chatGroups.get(key).push(chat);
      }
    });
    
    // Step 3: Process each group
    const chatsToDelete = [];
    const chatsToUpdate = [];
    
    for (const [key, chats] of chatGroups) {
      if (chats.length > 1) {
        console.log(`Found ${chats.length} duplicate chats for user pair: ${key}`);
        
        // Sort by created_at to keep the oldest
        chats.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        const [smallerId, largerId] = key.split('-');
        const keepChat = chats[0];
        
        // Mark others for deletion
        chats.slice(1).forEach(chat => {
          chatsToDelete.push(chat.id);
        });
        
        // Update the kept chat to have consistent ordering
        if (keepChat.user_id !== smallerId || keepChat.receiver_id !== largerId) {
          chatsToUpdate.push({
            id: keepChat.id,
            user_id: smallerId,
            receiver_id: largerId
          });
        }
      } else if (chats.length === 1) {
        // Single chat - ensure consistent ordering
        const chat = chats[0];
        if (chat.receiver_id) {
          const [smallerId, largerId] = [chat.user_id, chat.receiver_id].sort();
          
          if (chat.user_id !== smallerId || chat.receiver_id !== largerId) {
            chatsToUpdate.push({
              id: chat.id,
              user_id: smallerId,
              receiver_id: largerId
            });
          }
        }
      }
    }
    
    console.log(`Found ${chatsToDelete.length} chats to delete`);
    console.log(`Found ${chatsToUpdate.length} chats to update for consistent ordering`);
    
    // Step 4: Delete duplicate chats
    if (chatsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('chats')
        .delete()
        .in('id', chatsToDelete);
      
      if (deleteError) throw deleteError;
      console.log(`✅ Deleted ${chatsToDelete.length} duplicate chats`);
    }
    
    // Step 5: Update chats for consistent ordering
    for (const update of chatsToUpdate) {
      const { error: updateError } = await supabase
        .from('chats')
        .update({
          user_id: update.user_id,
          receiver_id: update.receiver_id
        })
        .eq('id', update.id);
      
      if (updateError) throw updateError;
    }
    
    if (chatsToUpdate.length > 0) {
      console.log(`✅ Updated ${chatsToUpdate.length} chats for consistent ordering`);
    }
    
    console.log('✅ Duplicate chat cleanup completed successfully!');
    
    return {
      success: true,
      deletedCount: chatsToDelete.length,
      updatedCount: chatsToUpdate.length
    };
  } catch (error) {
    console.error('❌ Error cleaning up duplicate chats:', error);
    return {
      success: false,
      error
    };
  }
}

// Run the cleanup
cleanupDuplicateChats()
  .then(result => {
    if (result.success) {
      console.log(`\nSummary:`);
      console.log(`- Deleted: ${result.deletedCount} duplicate chats`);
      console.log(`- Updated: ${result.updatedCount} chats for consistent ordering`);
      process.exit(0);
    } else {
      console.error('Cleanup failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });

export { cleanupDuplicateChats }; 