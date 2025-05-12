"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }
    
    try {
      // This is just a UI implementation - no actual password reset
      console.log("Attempting to reset password");
      
      // Simulate a successful password reset
      setTimeout(() => {
        setIsSuccess(true);
        setIsLoading(false);
        
        // After showing success, redirect to login
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }, 1500);
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to reset password');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-0 shadow-lg rounded-lg overflow-hidden">
          <div className="p-6 space-y-2 text-center">
            <h1 className="text-3xl font-bold">Reset Password</h1>
            <p className="text-gray-500">
              {isSuccess 
                ? "Your password has been reset successfully" 
                : "Enter your new password"}
            </p>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md mb-6 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            {isSuccess ? (
              <div className="bg-green-50 text-green-700 p-4 rounded-md mb-6 flex items-center gap-3">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Password reset successful</p>
                  <p className="text-sm mt-1">Your password has been successfully reset. Redirecting to login...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium">New Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={isLoading}
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Resetting password...</span>
                    </div>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </form>
            )}
          </div>
          
          {!isSuccess && (
            <div className="p-6 border-t text-center">
              <div className="text-sm text-gray-600">
                <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Back to login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage; 