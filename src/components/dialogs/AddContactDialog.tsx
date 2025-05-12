"use client";

import React, { useState } from 'react';
import { X, UserPlus, UserSearch, Mail, AtSign } from 'lucide-react';

interface AddContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContact: (email: string, name?: string) => void;
}

const AddContactDialog: React.FC<AddContactDialogProps> = ({ 
  isOpen, 
  onClose,
  onAddContact 
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!isOpen) {
    return null;
  }
  
  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };
  
  const handleSearch = () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError(null);
    setIsSearching(true);
    
    // Simulate API search
    setTimeout(() => {
      setIsSearching(false);
      // In a real app, you might get the name from the search results
      if (!name) {
        setName(email.split('@')[0]); // Just a placeholder name based on email
      }
    }, 1000);
  };
  
  const handleAddContact = () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError(null);
    setIsAdding(true);
    
    // Simulate API call
    setTimeout(() => {
      onAddContact(email, name);
      setEmail('');
      setName('');
      setIsAdding(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add Contact</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 rounded-md flex items-start gap-2">
              <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-full bg-red-100 text-red-700">
                !
              </div>
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium">
                Name (Optional)
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contact name"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={handleSearch}
              disabled={!email || isSearching}
              className={`
                w-full py-2 rounded-md transition-colors flex items-center justify-center gap-2
                ${!email 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
              `}
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <UserSearch className="h-4 w-4" />
                  <span>Find User</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleAddContact}
            disabled={!validateEmail(email) || isAdding}
            className={`
              px-4 py-2 rounded-md transition-colors flex items-center gap-2
              ${!validateEmail(email)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'}
            `}
          >
            {isAdding ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Add Contact</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddContactDialog; 