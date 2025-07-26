"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { loginUser, checkSession, clearSessionCache } from '@/lib/supabase/auth';

type ErrorWithMessage = {
  message?: string;
};

const LoginContent = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  
  // Check for the redirected param to prevent loops
  const isRedirected = searchParams.has('redirected');
  
  useEffect(() => {
    // Only check authentication if not already redirected by middleware
    if (isRedirected) return;
    
    const checkAuth = async () => {
      const { isAuthenticated } = await checkSession();
      if (isAuthenticated) {
        router.push('/');
      }
    };
    
    checkAuth();
    
    // Check if user just registered
    const registered = searchParams.get('registered');
    if (registered === 'true') {
      setSuccessMessage('Account created successfully! Please check your email to verify your account.');
    }
  }, [searchParams, isRedirected, router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Clear session cache to ensure fresh login
      clearSessionCache();
      
      const result = await loginUser({
        email,
        password
      });
      
      if (result.success) {
        // Redirect immediately after successful login using router
        router.push('/');
      } else {
        // Handle login error
        const errorMessage = (result.error as ErrorWithMessage)?.message || 'Invalid credentials';
        setError(errorMessage);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = (error as ErrorWithMessage)?.message || 'Failed to sign in';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-100 shadow-lg rounded-xl overflow-hidden">
          <div className="p-6 space-y-2 text-center">
            <img src="/logo.png" alt="Aloai Logo" className="mx-auto mb-4 h-20 w-20 object-contain" />
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="text-gray-500">
              Sign in to your account to continue
            </p>
          </div>
          <div className="p-6">
            {successMessage && (
              <div className="bg-green-50 text-green-700 p-3 rounded-md mb-6 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{successMessage}</p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md mb-6 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            )}
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="block text-sm font-medium">Password</label>
                  <Link 
                    href="/forgot-password" 
                    className="text-xs text-black hover:text-black focus:text-black"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-black hover:bg-neutral-800 text-white font-medium py-3 px-4 rounded-lg transition-all relative overflow-hidden"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center">
                    Sign In
                  </span>
                )}
              </button>
            </form>
          </div>
          <div className="p-6 border-t border-gray-100 text-center">
            <div className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                <span className="text-black hover:text-black focus:text-black font-medium">Sign up <ArrowRight className="inline h-3 w-3 text-black" /></span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
};

export default LoginPage; 