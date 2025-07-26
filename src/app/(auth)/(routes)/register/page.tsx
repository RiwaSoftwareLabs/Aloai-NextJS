"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { registerUser, checkSession } from '@/lib/supabase/auth';

type ErrorWithMessage = {
  message?: string;
};

function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
  }, [isRedirected, router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError(null);
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }
    
    try {
      const result = await registerUser({
        email,
        password,
        displayName,
      });
      if (result.success) {
        // Redirect after successful registration using router
        router.push('/login?registered=true');
      } else {
        // Handle registration error
        const errorMessage = (result.error as ErrorWithMessage)?.message || 'Registration failed';
        setError(errorMessage);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = (error as ErrorWithMessage)?.message || 'Failed to register';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-0 shadow-lg rounded-lg overflow-hidden">
          <div className="p-6 space-y-2 text-center">
            <img src="/logo.png" alt="Aloai Logo" className="mx-auto mb-4 h-20 w-20 object-contain" />
            <h1 className="text-3xl font-bold">Create Account</h1>
            <p className="text-gray-500">
              Sign up to get started with Aloai
            </p>
          </div>
          <div className="p-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md mb-6 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="displayName" className="block text-sm font-medium">Display Name</label>
                <input
                  id="displayName"
                  type="text"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
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
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium">Confirm Password</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-black hover:bg-neutral-800 text-white font-medium py-2 px-4 rounded-md transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <span>Sign Up</span>
                )}
              </button>
            </form>
          </div>
          <div className="p-6 border-t text-center">
            <div className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-black hover:text-black focus:text-black font-medium"><span>Sign in <ArrowRight className="inline h-3 w-3 text-black" /></span></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const RegisterPage = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>}>
      <RegisterForm />
    </Suspense>
  );
};

export default RegisterPage; 