"use client";

import React, { useState } from 'react';
import { X, Users, UserPlus, Search, Check } from 'lucide-react';

interface AddGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, members: string[]) => void;
}

// Dummy contacts data
const CONTACTS = [
  { id: '1', name: 'Alice Smith', email: 'alice@example.com', selected: false },
  { id: '2', name: 'Bob Johnson', email: 'bob@example.com', selected: false },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', selected: false },
  { id: '4', name: 'David Lee', email: 'david@example.com', selected: false },
  { id: '5', name: 'Emma Wilson', email: 'emma@example.com', selected: false },
  { id: '6', name: 'Frank Miller', email: 'frank@example.com', selected: false },
];

const AddGroupDialog: React.FC<AddGroupDialogProps> = ({ 
  isOpen, 
  onClose,
  onCreateGroup 
}) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState(CONTACTS);
  const [isCreating, setIsCreating] = useState(false);
  
  if (!isOpen) {
    return null;
  }
  
  const selectedContacts = contacts.filter(contact => contact.selected);
  
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const toggleContact = (id: string) => {
    setContacts(contacts.map(contact => 
      contact.id === id ? { ...contact, selected: !contact.selected } : contact
    ));
  };
  
  const handleCreateGroup = () => {
    if (groupName.trim() && selectedContacts.length > 0) {
      setIsCreating(true);
      
      // Simulate API call delay
      setTimeout(() => {
        onCreateGroup(
          groupName,
          selectedContacts.map(contact => contact.id)
        );
        // Reset form
        setGroupName('');
        setSearchQuery('');
        setContacts(CONTACTS);
        setIsCreating(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create Group</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <label htmlFor="group-name" className="block text-sm font-medium mb-1">
              Group Name
            </label>
            <input
              id="group-name"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Marketing Team"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Add Members
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Selected contacts */}
          {selectedContacts.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">
                Selected ({selectedContacts.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedContacts.map(contact => (
                  <div 
                    key={contact.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-sm"
                  >
                    <span>{contact.name}</span>
                    <button 
                      onClick={() => toggleContact(contact.id)}
                      className="p-0.5 rounded-full hover:bg-blue-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Contact list */}
          <div className="max-h-60 overflow-y-auto border rounded-md">
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No contacts found
              </div>
            ) : (
              <ul className="divide-y">
                {filteredContacts.map(contact => (
                  <li key={contact.id}>
                    <button
                      onClick={() => toggleContact(contact.id)}
                      className={`w-full px-4 py-3 flex items-center hover:bg-gray-50 transition-colors ${
                        contact.selected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0 mr-3">
                        {contact.name.charAt(0)}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-xs text-gray-500">{contact.email}</p>
                      </div>
                      {contact.selected ? (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedContacts.length === 0 || isCreating}
            className={`
              px-4 py-2 rounded-md transition-colors flex items-center gap-2
              ${(!groupName.trim() || selectedContacts.length === 0)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'}
            `}
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                <span>Create Group</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddGroupDialog; 