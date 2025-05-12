"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // This is just a UI implementation - no actual password reset
      console.log("Attempting to send password reset email to:", email);
      
      // Simulate a successful password reset request
      setTimeout(() => {
        setIsSuccess(true);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to send password reset email');
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
                ? "Check your email for reset instructions" 
                : "Enter your email to receive reset instructions"}
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
                  <p className="font-medium">Password reset email sent</p>
                  <p className="text-sm mt-1">Please check your email for instructions to reset your password.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
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
                      <span>Sending reset link...</span>
                    </div>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </form>
            )}
          </div>
          
          <div className="p-6 border-t text-center">
            <div className="text-sm text-gray-600">
              <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage; 