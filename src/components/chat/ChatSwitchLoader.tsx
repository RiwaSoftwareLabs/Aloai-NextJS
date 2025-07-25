import React from 'react';

interface ChatSwitchLoaderProps {
  friendName?: string;
}

const ChatSwitchLoader: React.FC<ChatSwitchLoaderProps> = ({ friendName }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-white">
      {/* Avatar placeholder with loading animation */}
      <div className="relative mb-6">
        <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
      </div>
      
      {/* Loading text */}
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {friendName ? `Loading ${friendName}'s chat...` : 'Loading chat...'}
        </h3>
      </div>
      
      {/* Animated message bubbles */}
      <div className="flex flex-col space-y-3 w-full px-4">
        {/* Incoming message skeleton */}
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
        
        {/* Outgoing message skeleton */}
        <div className="flex items-start space-x-3 justify-end">
          <div className="flex-1 flex justify-end">
            <div className="bg-blue-100 rounded-2xl rounded-tr-md px-4 py-3 animate-pulse max-w-xs">
              <div className="h-4 bg-blue-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-blue-200 rounded w-2/3"></div>
            </div>
          </div>
          <div className="w-8 h-8 bg-blue-200 rounded-full animate-pulse"></div>
        </div>
        
        {/* Another incoming message skeleton */}
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        </div>
        
        {/* Fourth incoming message skeleton */}
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
        
        {/* Fifth outgoing message skeleton */}
        <div className="flex items-start space-x-3 justify-end">
          <div className="flex-1 flex justify-end">
            <div className="bg-blue-100 rounded-2xl rounded-tr-md px-4 py-3 animate-pulse max-w-xs">
              <div className="h-4 bg-blue-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-blue-200 rounded w-3/4"></div>
            </div>
          </div>
          <div className="w-8 h-8 bg-blue-200 rounded-full animate-pulse"></div>
        </div>
        
        {/* Sixth incoming message skeleton */}
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSwitchLoader; 