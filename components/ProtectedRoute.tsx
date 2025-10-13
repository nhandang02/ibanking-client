'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  console.log('ProtectedRoute: isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('ProtectedRoute: User not authenticated, redirecting to login...');
      // Use window.location.href for immediate redirect
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Đang kiểm tra xác thực...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect immediately (don't show loading)
  if (!isAuthenticated) {
    return null; // Return null while redirecting
  }

  return <>{children}</>;
}
