import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for server-side DB access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { chatId, userId } = await req.json();
    
    if (!chatId || !userId) {
      return NextResponse.json({ error: 'Missing chatId or userId' }, { status: 400 });
    }

    // Get all unread messages for this user in this chat
    const { data: unreadMessages, error } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId)
      .not('sender_id', 'eq', userId);
    
    if (error) {
      console.error('Error fetching unread messages:', error);
      return NextResponse.json({ error: 'Failed to fetch unread messages' }, { status: 500 });
    }
    
    if (!unreadMessages || unreadMessages.length === 0) {
      return NextResponse.json({ success: true, message: 'No unread messages' });
    }

    // Get already read message ids
    const { data: alreadyRead, error: readError } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('user_id', userId)
      .in('message_id', unreadMessages.map((m: { id: string }) => m.id));
    
    if (readError) {
      console.error('Error fetching already read messages:', readError);
      return NextResponse.json({ error: 'Failed to fetch read status' }, { status: 500 });
    }
    
    const alreadyReadIds = (alreadyRead || []).map((r: { message_id: string }) => r.message_id);
    const toInsert = unreadMessages.filter((m: { id: string }) => !alreadyReadIds.includes(m.id));
    
    if (toInsert.length === 0) {
      return NextResponse.json({ success: true, message: 'All messages already read' });
    }

    // Insert read records
    const inserts: { message_id: string; user_id: string }[] = toInsert.map((msg: { id: string }) => ({ 
      message_id: msg.id, 
      user_id: userId 
    }));
    
    const { error: insertError } = await supabase
      .from('message_reads')
      .upsert(inserts, { onConflict: 'message_id,user_id' });
    
    if (insertError) {
      console.error('Error inserting into message_reads:', insertError);
      return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Marked ${toInsert.length} messages as read`,
      readMessageIds: toInsert.map(m => m.id)
    });
    
  } catch (err: unknown) {
    console.error('Mark messages as read API error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 