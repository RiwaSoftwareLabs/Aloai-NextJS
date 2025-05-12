"use client";

import React, { useState } from 'react';
import { Lock, Shield, Eye, EyeOff } from 'lucide-react';

const PrivacySettingsPage = () => {
  const [settings, setSettings] = useState({
    showOnlineStatus: true,
    showReadReceipts: true,
    allowContactRequests: 'everyone', // 'everyone', 'contacts', 'nobody'
    showLastSeen: true,
    twoFactorAuth: false,
    blockScreenshots: false
  });
  
  const handleToggleChange = (setting: string) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof prev]
    }));
  };
  
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Privacy Settings</h2>
        <p className="text-gray-500">Manage who can see your information and how your data is handled</p>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-lg border">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-md bg-blue-50">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Visibility</h3>
              <p className="text-sm text-gray-500">Control who can see your information</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Online Status</p>
                <p className="text-xs text-gray-500">Show when you're online</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.showOnlineStatus} 
                  onChange={() => handleToggleChange('showOnlineStatus')}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Read Receipts</p>
                <p className="text-xs text-gray-500">Let others know when you've read their messages</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.showReadReceipts} 
                  onChange={() => handleToggleChange('showReadReceipts')}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Last Seen</p>
                <p className="text-xs text-gray-500">Show when you last used the app</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.showLastSeen} 
                  onChange={() => handleToggleChange('showLastSeen')}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Contact Requests</p>
                <p className="text-xs text-gray-500">Who can send you contact requests</p>
              </div>
              <select 
                name="allowContactRequests"
                value={settings.allowContactRequests}
                onChange={handleSelectChange}
                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2.5"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">Contacts of Contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-lg border">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-md bg-blue-50">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Security</h3>
              <p className="text-sm text-gray-500">Enhance your account security</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Two-Factor Authentication</p>
                <p className="text-xs text-gray-500">Require an additional verification step when logging in</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.twoFactorAuth} 
                  onChange={() => handleToggleChange('twoFactorAuth')}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Block Screenshots</p>
                <p className="text-xs text-gray-500">Prevent others from taking screenshots of your chats</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.blockScreenshots} 
                  onChange={() => handleToggleChange('blockScreenshots')}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-lg border">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-md bg-blue-50">
              <Lock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Data & Privacy</h3>
              <p className="text-sm text-gray-500">Manage your personal data</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <button className="block w-full text-left px-4 py-2.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm">
              Download Your Data
            </button>
            <button className="block w-full text-left px-4 py-2.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm">
              Clear Chat History
            </button>
            <button className="block w-full text-left px-4 py-2.5 text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors text-sm">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettingsPage; 