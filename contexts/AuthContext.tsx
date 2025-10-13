'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, LoginRequest, AuthResponse } from '@/types';
import { apiClient, setAccessToken, setAuthFailureCallback } from '@/lib/axios';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user && !!accessToken;

  // Function to handle auth failure and redirect to login
  const handleAuthFailure = () => {
    console.log('AuthContext: Authentication failed, redirecting to login...');
    setAccessTokenState(null); // Clear React state
    setAccessToken(null); // Clear global axios token
    setUser(null);
    
    // Clear refresh token cookie
    document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    console.log('AuthContext: Refresh token cookie cleared on auth failure');
    
    router.push('/login');
  };

  // Set auth failure callback for axios interceptor
  useEffect(() => {
    setAuthFailureCallback(handleAuthFailure);
    
    // Cleanup on unmount
    return () => {
      setAuthFailureCallback(null);
    };
  }, []);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('AuthContext: Checking authentication on app start...');
        
        // First, try to refresh token to get new access token
        try {
          const refreshResponse = await apiClient.get('/auth/refresh');
          console.log('AuthContext: Token refreshed successfully');
          
          // Check if new access token is provided in refresh response
          if (refreshResponse.data?.data?.accessToken) {
            const newAccessToken = refreshResponse.data.data.accessToken;
            console.log('AuthContext: New access token received from refresh');
            setAccessTokenState(newAccessToken);
            setAccessToken(newAccessToken);
          }
        } catch (refreshError) {
          console.log('AuthContext: Token refresh failed, trying /auth/me directly');
        }
        
        // Then get user info
        const response = await apiClient.get('/auth/me');
        console.log('AuthContext: /auth/me response:', response.data);
        
        // Extract user data - handle different response structures
        let userData;
        if (response.data.data && response.data.data.user) {
          // Structure: { data: { user: {...} } }
          userData = response.data.data.user;
        } else if (response.data.data && response.data.data.data) {
          // Structure: { data: { data: {...} } } - nested data
          userData = response.data.data.data;
        } else if (response.data.data) {
          // Structure: { data: {...} } - user data directly
          userData = response.data.data;
        } else {
          // Structure: { ... } - user data at root level
          userData = response.data;
        }
        
        // If userData still has nested structure, extract the inner data
        if (userData && userData.data) {
          userData = userData.data;
        }
        
        console.log('AuthContext: User data extracted:', userData);
        
        console.log('AuthContext: User is authenticated, restoring session...');
        setUser(userData);
        
      } catch (error) {
        console.log('AuthContext: No valid session found, user needs to login');
        setAccessTokenState(null);
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      console.log('AuthContext: Starting login process...');
      const response = await apiClient.post<AuthResponse>('/auth/signin', credentials);
      const { accessToken: token, user: userData } = response.data.data;
      
      console.log('AuthContext: Login successful, storing tokens...');
      console.log('AuthContext: Response headers:', response.headers);
      console.log('AuthContext: Cookies after login:', document.cookie);
      
      // Check if refresh token is in response data
      const { refreshToken } = response.data.data;
      if (refreshToken) {
        console.log('AuthContext: Refresh token received, setting cookie...');
        // Set refresh token cookie manually
        document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`;
        console.log('AuthContext: Refresh token cookie set');
      }
      
      // Store access token in state and update axios
      setAccessTokenState(token); // Update React state
      setAccessToken(token); // Update global axios token
      setUser(userData);
      console.log('AuthContext: User state updated:', userData);
      console.log('AuthContext: Access token stored:', !!token);
    } catch (error: any) {
      console.error('AuthContext: Login failed:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear state and update axios
      setAccessTokenState(null); // Clear React state
      setAccessToken(null); // Clear global axios token
      setUser(null);
      
      // Clear refresh token cookie
      document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      console.log('AuthContext: Refresh token cookie cleared');
    }
  };

  const refreshUser = async () => {
    try {
      console.log('AuthContext: Refreshing user data...');
      const response = await apiClient.get('/auth/me');
      
      // Extract user data with same logic as checkAuth
      let userData;
      if (response.data.data && response.data.data.user) {
        userData = response.data.data.user;
      } else if (response.data.data && response.data.data.data) {
        userData = response.data.data.data;
      } else if (response.data.data) {
        userData = response.data.data;
      } else {
        userData = response.data;
      }
      
      // If userData still has nested structure, extract the inner data
      if (userData && userData.data) {
        userData = userData.data;
      }
      
      setUser(userData);
      console.log('AuthContext: User data refreshed successfully');
    } catch (error) {
      console.error('AuthContext: Failed to refresh user data:', error);
      // Don't redirect to login on refresh failure, just throw error
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
