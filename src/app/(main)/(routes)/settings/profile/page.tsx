"use client";

import React, { useState } from 'react';
import { Camera, Save } from 'lucide-react';

const ProfileSettingsPage = () => {
  const [profileData, setProfileData] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    username: 'johndoe',
    bio: 'Software developer and tech enthusiast.',
    language: 'english',
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setIsEditing(false);
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-5">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-2xl">
            {profileData.name.charAt(0)}
          </div>
          
          <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full">
            <Camera className="h-4 w-4" />
          </button>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold">{profileData.name}</h1>
          <p className="text-gray-500">@{profileData.username}</p>
        </div>
      </div>
      
      <form onSubmit={handleSave}>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={profileData.name}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={profileData.username}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={profileData.email}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="bio" className="block text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              value={profileData.bio}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="language" className="block text-sm font-medium">
              Preferred Language
            </label>
            <select
              id="language"
              name="language"
              value={profileData.language}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="english">English</option>
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
              <option value="german">German</option>
              <option value="arabic">Arabic</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettingsPage; 