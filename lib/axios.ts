import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Always send cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// A bare axios client without interceptors for internal calls like token refresh
const bareClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let currentAccessToken: string | null = null;
let authFailureCallback: (() => void) | null = null;

export const setAccessToken = (token: string | null) => {
  currentAccessToken = token;
};

export const setAuthFailureCallback = (callback: (() => void) | null) => {
  authFailureCallback = callback;
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (currentAccessToken) {
      config.headers.Authorization = `Bearer ${currentAccessToken}`;
      console.log('Sending request to:', config.url, 'with Authorization header');
    } else {
      console.warn('Sending request to:', config.url, 'without Authorization token!');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      // Do not attempt to refresh if the failing call is the refresh itself
      const requestUrl = originalRequest?.url as string | undefined;
      const isRefreshCall = requestUrl?.includes('/auth/refresh');

      if (isRefreshCall) {
        if (authFailureCallback) authFailureCallback();
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        if (authFailureCallback) authFailureCallback();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Use bare client to avoid interceptor recursion
        const refreshResponse = await bareClient.get('/auth/refresh');
        console.log('Token refreshed successfully, retrying original request...');

        if (refreshResponse.data?.data?.accessToken) {
          const newAccessToken = refreshResponse.data.data.accessToken;
          console.log('New access token received, updating...');
          setAccessToken(newAccessToken);
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        console.log('Token refresh failed, calling auth failure callback...');
        if (authFailureCallback) authFailureCallback();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);