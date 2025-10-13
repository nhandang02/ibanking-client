import { apiClient } from '@/lib/axios';
import {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  User,
  Tuition,
  TuitionResponse,
  TuitionListResponse,
  PaymentRequest,
  PaymentResponse,
  OTPVerifyRequest,
  OTPVerifyResponse,
  OTPInfoResponse,
} from '@/types';

// Authentication APIs
export const authAPI = {
  signin: (credentials: LoginRequest): Promise<AuthResponse> =>
    apiClient.post('/auth/signin', credentials).then(res => res.data),

  signup: (userData: SignupRequest): Promise<AuthResponse> =>
    apiClient.post('/auth/signup', userData).then(res => res.data),

  me: (): Promise<{ success: boolean; data: User }> =>
    apiClient.get('/auth/me').then(res => res.data),

  logout: (): Promise<{ success: boolean; data: { message: string } }> =>
    apiClient.post('/auth/logout').then(res => res.data),

  logoutAll: (): Promise<{ success: boolean; data: { message: string } }> =>
    apiClient.get('/auth/logout-all').then(res => res.data),

  refresh: (): Promise<AuthResponse> =>
    apiClient.get('/auth/refresh').then(res => res.data),
};

// Tuition APIs
export const tuitionAPI = {
  getByStudentId: (studentId: string): Promise<TuitionResponse> =>
    apiClient.get(`/tuition/${studentId}`).then(res => res.data),

  getAll: (): Promise<TuitionListResponse> =>
    apiClient.get('/tuition').then(res => res.data),
};

// Payment APIs
export const paymentAPI = {
  create: (paymentData: PaymentRequest): Promise<PaymentResponse> =>
    apiClient.post('/payments', paymentData).then(res => res.data),

  resendOTP: (paymentId: string): Promise<{ success: boolean; data: { message: string } }> =>
    apiClient.post(`/payments/resend-otp/${paymentId}`).then(res => res.data),
};

// OTP APIs
export const otpAPI = {
  verify: (otpData: OTPVerifyRequest): Promise<OTPVerifyResponse> =>
    apiClient.post('/otp/verify', otpData).then(res => res.data),

  getInfo: (paymentId: string): Promise<OTPInfoResponse> =>
    apiClient.get(`/otp/info/${paymentId}`).then(res => res.data),
};

// Health check
export const healthAPI = {
  check: (): Promise<{
    status: string;
    timestamp: string;
    services: Record<string, string>;
  }> =>
    apiClient.get('/health').then(res => res.data),
};
