"use client";

import React, { useState } from 'react';
import { X, Mail, Loader2 } from 'lucide-react';
import { sendFriendRequest, sendInvitationEmail } from '@/lib/supabase/friendship';
import { getCurrentUser } from '@/lib/supabase/auth';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFriendRequestSent?: () => void;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose, onFriendRequestSent }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    
    try {
      // Get current user
      const { user } = await getCurrentUser();
      
      if (!user) {
        setMessage({ text: 'You must be logged in to add friends.', type: 'error' });
        setIsLoading(false);
        return;
      }

      // Send friend request
      const result = await sendFriendRequest({
        requesterId: user.id,
        email: email.trim().toLowerCase()
      });

      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        setEmail('');
        
        // Call the callback to refresh friend data
        if (onFriendRequestSent) {
          onFriendRequestSent();
        }
      } else {
        // If user not found, send invitation
        if (result.message.includes('User not found')) {
          const inviteResult = await sendInvitationEmail(email, user.id);
          
          if (inviteResult.success) {
            setMessage({ 
              text: 'Invitation sent successfully to join Aloai!', 
              type: 'success' 
            });
            setEmail('');
          } else {
            setMessage({ text: inviteResult.message, type: 'error' });
          }
        } else {
          setMessage({ text: result.message, type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      setMessage({ text: 'Failed to process your request.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-gray-500/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Add Friend</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Add a friend by email. If they&apos;re not on Aloai yet, we&apos;ll send them an invitation.
          </p>
          
          {message && (
            <div className={`p-3 rounded-md mb-4 ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.text}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  <span>Send Request</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddFriendModal; 