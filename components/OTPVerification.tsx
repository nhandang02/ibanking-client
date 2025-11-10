'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { otpAPI, paymentAPI } from '@/services/api';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { formatCurrency } from '@/lib/utils';
import { 
  Shield, 
  Mail, 
  Clock, 
  RefreshCw, 
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Tuition, OTPInfo } from '@/types';

const otpSchema = z.object({
  otp: z.string().min(6, 'Mã OTP phải có 6 chữ số').max(6, 'Mã OTP phải có 6 chữ số'),
});

type OTPFormData = z.infer<typeof otpSchema>;

interface OTPVerificationProps {
  paymentId: string;
  tuitionInfo?: Tuition;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
  onCancelSuccess?: () => void; // Callback when cancel is successful
}

export default function OTPVerification({
  paymentId,
  tuitionInfo,
  onSuccess,
  onError,
  onCancel,
  onCancelSuccess,
}: OTPVerificationProps) {
  const RESEND_COOLDOWN_SECONDS = 120;
  const OTP_TOTAL_SECONDS = 300; // 5 minutes
  const [otpInfo, setOtpInfo] = useState<OTPInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string>('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [resendCooldown, setResendCooldown] = useState<number>(RESEND_COOLDOWN_SECONDS);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Load retry count from localStorage on component mount
  useEffect(() => {
    const savedRetryCount = localStorage.getItem(`otp_retry_${paymentId}`);
    if (savedRetryCount) {
      const count = parseInt(savedRetryCount, 10);
      setRetryCount(count);
      setAttemptsRemaining(5 - count);
      console.log(`Loaded retry count from localStorage: ${count}`);
    }
  }, [paymentId]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const resendIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });

  const otpValue = watch('otp');

  // Fetch OTP info on component mount
  useEffect(() => {
    const fetchOTPInfo = async () => {
      try {
        const response = await otpAPI.getInfo(paymentId);
        setOtpInfo(response.data);
        setAttemptsRemaining(response.data.attemptsRemaining);
      } catch (err: unknown) {
        const anyErr = err as { response?: { data?: { message?: string } } } | undefined;
        onError(anyErr?.response?.data?.message || 'Không thể lấy thông tin OTP');
      }
    };

    fetchOTPInfo();
  }, [paymentId, onError]);

  // Helper to start/update the 5-minute OTP countdown using an absolute expiry timestamp
  const startOtpCountdownTimer = (expireAtMs: number) => {
    const update = () => {
      const now = Date.now();
      const remainingMs = Math.max(0, expireAtMs - now);

      if (remainingMs <= 0) {
        setTimeRemaining('Đã hết hạn');
        setTimeRemainingSeconds(0);
        localStorage.removeItem(`otp_expire_until_${paymentId}`);
        localStorage.removeItem(`otp_retry_${paymentId}`);
        localStorage.removeItem(`otp_resend_until_${paymentId}`);
        localStorage.removeItem('payment_state'); // Clear payment state when OTP expires
        if (intervalRef.current) clearInterval(intervalRef.current);
        onError('Mã OTP đã hết hạn. Vui lòng tạo thanh toán mới.');
        return;
      }

      const remainingSeconds = Math.floor(remainingMs / 1000);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      setTimeRemainingSeconds(remainingSeconds);
    };

    update();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(update, 1000);
  };

  // Initialize or restore the 5-minute OTP countdown on mount from localStorage
  useEffect(() => {
    const key = `otp_expire_until_${paymentId}`;
    const savedExpireStr = localStorage.getItem(key);
    const now = Date.now();

    if (savedExpireStr) {
      const savedExpire = parseInt(savedExpireStr, 10);
      if (!Number.isNaN(savedExpire) && savedExpire > now) {
        startOtpCountdownTimer(savedExpire);
        return () => {
          if (intervalRef.current) clearInterval(intervalRef.current);
        };
      }
    }

    const expireAt = now + OTP_TOTAL_SECONDS * 1000;
    localStorage.setItem(key, expireAt.toString());
    startOtpCountdownTimer(expireAt);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, onError]);

  // Helper to start/update the resend cooldown timer using an absolute timestamp
  const startResendCooldownTimer = (cooldownUntilMs: number) => {
    const update = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((cooldownUntilMs - now) / 1000));
      setResendCooldown(remaining);
      if (remaining <= 0) {
        localStorage.removeItem(`otp_resend_until_${paymentId}`);
        if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
      }
    };

    update();
    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    resendIntervalRef.current = setInterval(update, 1000);
  };

  // Initialize or restore resend cooldown from localStorage on mount
  useEffect(() => {
    const key = `otp_resend_until_${paymentId}`;
    const savedUntilStr = localStorage.getItem(key);
    const now = Date.now();

    if (savedUntilStr) {
      const savedUntil = parseInt(savedUntilStr, 10);
      if (!Number.isNaN(savedUntil) && savedUntil > now) {
        startResendCooldownTimer(savedUntil);
        return () => {
          if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
        };
      }
    }

    const until = now + RESEND_COOLDOWN_SECONDS * 1000;
    localStorage.setItem(key, until.toString());
    startResendCooldownTimer(until);

    return () => {
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const onSubmit = async (data: OTPFormData) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await otpAPI.verify({
        paymentId,
        otp: data.otp,
      });

      if (response.data.success) {
        // Clear localStorage on successful payment
        localStorage.removeItem(`otp_retry_${paymentId}`);
        console.log(`Cleared retry count from localStorage for payment: ${paymentId}`);
        onSuccess();
      } else {
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        setAttemptsRemaining(5 - newRetryCount);
        
        // Save retry count to localStorage
        localStorage.setItem(`otp_retry_${paymentId}`, newRetryCount.toString());
        console.log(`Saved retry count to localStorage: ${newRetryCount}`);
        
        // Check if exceeded max attempts
        if (newRetryCount >= 5) {
          // Clear localStorage when max attempts reached
          localStorage.removeItem(`otp_retry_${paymentId}`);
          localStorage.removeItem(`otp_expire_until_${paymentId}`);
          localStorage.removeItem(`otp_resend_until_${paymentId}`);
          localStorage.removeItem('payment_state'); // Clear payment state when max attempts reached
          console.log(`Max attempts reached, cleared localStorage for payment: ${paymentId}`);
          // Component will automatically render the "out of attempts" card
          // Don't call onError to avoid duplicate error display
          return;
        }
        
        setError(`Mã OTP không đúng. Còn lại ${5 - newRetryCount} lần thử.`);
        
        // Clear OTP input for next attempt
        setValue('otp', '');
      }
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } } | undefined;
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      setAttemptsRemaining(5 - newRetryCount);
      
      // Save retry count to localStorage
      localStorage.setItem(`otp_retry_${paymentId}`, newRetryCount.toString());
      console.log(`Saved retry count to localStorage (error): ${newRetryCount}`);
      
      // Check if exceeded max attempts
      if (newRetryCount >= 5) {
        // Clear all localStorage related to this payment when max attempts reached
        localStorage.removeItem(`otp_retry_${paymentId}`);
        localStorage.removeItem(`otp_expire_until_${paymentId}`);
        localStorage.removeItem(`otp_resend_until_${paymentId}`);
        localStorage.removeItem('payment_state'); // Clear payment state when max attempts reached
        console.log(`Max attempts reached, cleared all localStorage for payment: ${paymentId}`);
        // Component will automatically render the "out of attempts" card
        // Don't call onError to avoid duplicate error display
        return;
      }
      
      setError(anyErr?.response?.data?.message || `Xác thực OTP thất bại. Còn lại ${5 - newRetryCount} lần thử.`);
      
      // Clear OTP input for next attempt
      setValue('otp', '');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = async () => {
    try {
      setIsCancelling(true);
      // Call API to cancel payment
      // apiClient will automatically add Authorization header via interceptor
      console.log('Cancelling payment:', paymentId);
      const response = await paymentAPI.cancel(paymentId);
      console.log('Payment cancel response:', response);
      
      // Check if the cancellation was successful
      if (response.success) {
        console.log('Payment cancelled successfully');
        // Notify parent component to show success toast
        onCancelSuccess?.();
      } else {
        // API returned success: false
        const errorMessage = response.data?.message || 'Không thể hủy thanh toán';
        console.error('Payment cancellation failed:', errorMessage);
        onError(errorMessage);
      }
    } catch (err: unknown) {
      console.error('Failed to cancel payment:', err);
      const anyErr = err as { response?: { status?: number; data?: { message?: string } } } | undefined;
      if (anyErr?.response?.status === 401) {
        console.error('Unauthorized - token may be missing or invalid');
        onError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        // Show error message from API or default error
        const errorMessage = anyErr?.response?.data?.message || 'Không thể hủy thanh toán. Vui lòng thử lại.';
        onError(errorMessage);
      }
    } finally {
      // Clear all localStorage related to this payment when canceling
      localStorage.removeItem(`otp_retry_${paymentId}`);
      localStorage.removeItem(`otp_expire_until_${paymentId}`);
      localStorage.removeItem(`otp_resend_until_${paymentId}`);
      localStorage.removeItem('payment_state'); // Clear payment state when canceling
      console.log(`Cleared all localStorage on cancel for payment: ${paymentId}`);
      setIsCancelling(false);
      setShowCancelConfirm(false);
      onCancel();
    }
  };

  const handleCancelCancel = () => {
    setShowCancelConfirm(false);
  };

  const handleResendOTP = async () => {
    try {
      setIsResending(true);
      setError('');
      
      await paymentAPI.resendOTP(paymentId);
      
      // Refresh OTP info
      const response = await otpAPI.getInfo(paymentId);
      setOtpInfo(response.data);
      setAttemptsRemaining(response.data.attemptsRemaining);
      setValue('otp', '');

      // Restart the 2-minute cooldown after a resend
      const until = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
      localStorage.setItem(`otp_resend_until_${paymentId}`, until.toString());
      startResendCooldownTimer(until);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } } | undefined;
      setError(anyErr?.response?.data?.message || 'Không thể gửi lại mã OTP');
    } finally {
      setIsResending(false);
    }
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setValue('otp', value);
  };

  const handleCreateNewPayment = () => {
    // Clear all localStorage related to this payment
    localStorage.removeItem(`otp_retry_${paymentId}`);
    localStorage.removeItem(`otp_expire_until_${paymentId}`);
    localStorage.removeItem(`otp_resend_until_${paymentId}`);
    localStorage.removeItem('payment_state');
    console.log(`Cleared all localStorage for payment: ${paymentId}`);
    // Just close modal and reset form, no need to call API cancel
    onCancel();
  };

  if (attemptsRemaining <= 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Đã hết số lần thử</h3>
            <p className="text-gray-600 mb-6">
              Bạn đã nhập sai mã OTP quá nhiều lần. Vui lòng tạo thanh toán mới.
            </p>
            <Button onClick={handleCreateNewPayment} className="w-full">
              Tạo thanh toán mới
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Xác thực OTP
        </CardTitle>
        <CardDescription>
          Nhập mã OTP đã được gửi đến email của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Cancel Confirmation Dialog */}
          {showCancelConfirm ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Xác nhận hủy thanh toán
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Bạn có chắc chắn muốn hủy giao dịch thanh toán này không? 
                Hành động này không thể hoàn tác.
              </p>
              {tuitionInfo && (
                <div className="p-3 bg-gray-50 rounded-lg mb-6">
                  <p className="text-sm text-gray-700">
                    <strong>Mã sinh viên:</strong> {tuitionInfo.studentId}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Số tiền:</strong> {formatCurrency(tuitionInfo.amount)}
                  </p>
                </div>
              )}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCancelCancel}
                  className="flex-1"
                  disabled={isCancelling}
                >
                  Không, tiếp tục thanh toán
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelConfirm}
                  className="flex-1"
                  loading={isCancelling}
                >
                  Có, hủy thanh toán
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Payment Summary */}
              {tuitionInfo && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-2">Thông tin thanh toán</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Mã sinh viên:</strong> {tuitionInfo.studentId}</p>
                    <p><strong>Tên sinh viên:</strong> {tuitionInfo.studentName}</p>
                    <p><strong>Số tiền:</strong> 
                      <span className="text-lg font-bold text-red-600 ml-2">
                        {formatCurrency(tuitionInfo.amount)}
                      </span>
                    </p>
                  </div>
                </div>
              )}

          {/* OTP Info */}
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                Mã OTP đã được gửi đến email
              </div>
              <div className="flex items-center text-sm font-medium text-orange-600">
                <Clock className="h-4 w-4 mr-2" />
                {timeRemaining}
              </div>
            </div>
            
            {/* Warning Message */}
            <div className={`border rounded-md p-3 mb-3 ${
              timeRemainingSeconds <= 30 
                ? 'bg-red-100 border-red-200' 
                : 'bg-orange-100 border-orange-200'
            }`}>
              <div className="flex items-start">
                <div className="shrink-0">
                  <svg className={`h-5 w-5 ${
                    timeRemainingSeconds <= 30 ? 'text-red-400' : 'text-orange-400'
                  }`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    timeRemainingSeconds <= 30 ? 'text-red-800' : 'text-orange-800'
                  }`}>
                    {timeRemainingSeconds <= 30 
                      ? '⚠️ Thời gian sắp hết! Thanh toán sẽ tự động hủy'
                      : 'Thanh toán sẽ tự động hủy sau 5 phút'
                    }
                  </h3>
                  <div className={`mt-1 text-sm ${
                    timeRemainingSeconds <= 30 ? 'text-red-700' : 'text-orange-700'
                  }`}>
                    <p>
                      {timeRemainingSeconds <= 30 
                        ? 'Hãy nhanh chóng nhập mã OTP để hoàn tất thanh toán!'
                        : 'Vui lòng nhập mã OTP trong thời gian quy định để hoàn tất thanh toán.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Thời gian còn lại</span>
                <span>{timeRemaining}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    timeRemainingSeconds <= 30 
                      ? 'bg-red-500' 
                      : timeRemainingSeconds <= 60 
                        ? 'bg-orange-500' 
                        : 'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.max(0, (timeRemainingSeconds / 300) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">
                  Số lần thử còn lại: <span className="font-medium text-blue-600">{attemptsRemaining}/5</span>
                </span>
                <span className="text-gray-400">
                  Đã thử: <span className="font-medium">{retryCount}/5</span>
                </span>
              </div>
              
              {/* Attempts Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    retryCount >= 4 ? 'bg-red-500' : 
                    retryCount >= 2 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(retryCount / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Warning Alert for Low Attempts */}
          {retryCount >= 3 && retryCount < 5 && (
            <Alert variant="destructive">
              <AlertDescription>
                ⚠️ Cảnh báo: Bạn chỉ còn {5 - retryCount} lần thử. Nếu nhập sai quá 5 lần, giao dịch sẽ bị hủy tự động.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* OTP Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input
                {...register('otp')}
                label="Mã OTP"
                placeholder="Nhập 6 chữ số"
                value={otpValue}
                onChange={handleOTPChange}
                error={errors.otp?.message}
                helperText="Nhập mã OTP 6 chữ số đã được gửi đến email"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelClick}
                className="flex-1"
                disabled={isCancelling}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Hủy thanh toán
              </Button>
              
              <Button
                type="submit"
                className="flex-1"
                loading={isLoading}
                disabled={!otpValue || otpValue.length !== 6 || isLoading}
              >
                {isLoading ? 'Đang xác thực...' : 'Xác thực'}
              </Button>
            </div>
          </form>

          {/* Resend OTP */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Không nhận được mã OTP?</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendOTP}
              loading={isResending}
              disabled={isResending || resendCooldown > 0}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {resendCooldown > 0
                ? `Gửi lại mã OTP (${Math.floor(resendCooldown / 60)}:${(resendCooldown % 60)
                    .toString()
                    .padStart(2, '0')})`
                : 'Gửi lại mã OTP'}
            </Button>
          </div>

              {/* Security Notice */}
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <Shield className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 shrink-0" />
                  <div className="text-xs text-yellow-800">
                    <p className="font-medium mb-1">Lưu ý bảo mật:</p>
                    <ul className="space-y-1">
                      <li>• Mã OTP có thời hạn 2 phút</li>
                      <li>• Không chia sẻ mã OTP với bất kỳ ai</li>
                      <li>• Hệ thống sẽ tự động hủy thanh toán sau 5 phút không hoạt động</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
