import React from 'react';

interface MessageLoaderProps {
  type?: 'initial' | 'old-messages' | 'chat-switch';
  message?: string;
}

const MessageLoader: React.FC<MessageLoaderProps> = ({ 
  type = 'initial', 
  message 
}) => {
  const getDefaultMessage = () => {
    switch (type) {
      case 'initial':
        return 'Loading messages...';
      case 'old-messages':
        return 'Loading previous messages...';
      case 'chat-switch':
        return 'Switching chat...';
      default:
        return 'Loading...';
    }
  };

  const displayMessage = message || getDefaultMessage();

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      {/* Loading text */}
      <div className="text-center">
        <p className="text-gray-600 font-medium text-sm mb-1">{displayMessage}</p>
        {/* Animated dots */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default MessageLoader; 