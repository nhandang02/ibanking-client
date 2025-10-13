// User types
export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  availableBalance: string;
  isActive: boolean;
}

// Authentication types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  password: string;
  email: string;
  fullName: string;
  phoneNumber: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken?: string;
    user: User;
  };
}

// Tuition types
export interface Tuition {
  id: string;
  studentId: string;
  studentName: string;
  amount: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TuitionResponse {
  success: boolean;
  data: Tuition;
}

export interface TuitionListResponse {
  success: boolean;
  data: Tuition[];
}

// Payment types
export interface PaymentRequest {
  studentId: string;
  tuitionAmount: string;
}

export interface PaymentResponse {
  success: boolean;
  data: {
    success: boolean;
    sagaId: string;
    paymentId: string;
    message: string;
  };
}

// OTP types
export interface OTPVerifyRequest {
  paymentId: string;
  otp: string;
}

export interface OTPVerifyResponse {
  success: boolean;
  data: {
    success: boolean;
    data: {
      paymentId: string;
      status: string;
      message: string;
    };
  };
}

export interface OTPInfo {
  paymentId: string;
  otpExpiry: string;
  attemptsRemaining: number;
  status: string;
}

export interface OTPInfoResponse {
  success: boolean;
  data: OTPInfo;
}

// API Error types
export interface APIError {
  statusCode: number;
  message: string;
}

// Form types
export interface LoginFormData {
  username: string;
  password: string;
}

export interface PaymentFormData {
  studentId: string;
}

// Payment flow states
export type PaymentStep = 'form' | 'otp' | 'success' | 'error';

export interface PaymentState {
  step: PaymentStep;
  paymentId?: string;
  tuitionInfo?: Tuition;
  error?: string;
  otpInfo?: OTPInfo;
}
