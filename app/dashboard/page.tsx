'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { tuitionAPI, paymentAPI } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { formatCurrency } from '@/lib/utils';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Wallet, 
  GraduationCap, 
  CreditCard,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PaymentState } from '@/types';
import { OTPVerification, ProtectedRoute } from '@/components';

const paymentSchema = z.object({
  studentId: z.string().min(1, 'Vui lòng nhập mã sinh viên'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function DashboardPage() {
  const { user, logout, refreshUser, isAuthenticated } = useAuth();
  const router = useRouter();
  const [paymentState, setPaymentState] = useState<PaymentState>({ step: 'form' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load payment state from localStorage on component mount
  useEffect(() => {
    const savedPaymentState = localStorage.getItem('payment_state');
    if (savedPaymentState) {
      try {
        const parsedState = JSON.parse(savedPaymentState);
        console.log('Loaded payment state from localStorage:', parsedState);
        setPaymentState(parsedState);
      } catch (error) {
        console.error('Failed to parse saved payment state:', error);
        localStorage.removeItem('payment_state');
      }
    }
  }, []);

  // Debug log
  useEffect(() => {
    console.log('Dashboard: Component mounted, user:', user, 'isAuthenticated:', isAuthenticated);
    if (user) {
      console.log('Dashboard: User object structure:', {
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        availableBalance: user.availableBalance
      });
      console.log('Dashboard: Full user object:', JSON.stringify(user, null, 2));
    }
  }, [user, isAuthenticated]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      studentId: '',
    },
  });

  const studentId = watch('studentId');

  // Auto-fetch tuition info when student ID is entered
  useEffect(() => {
    const fetchTuitionInfo = async () => {
      if (studentId && studentId.length >= 6) {
        try {
          const response = await tuitionAPI.getByStudentId(studentId);
          setPaymentState(prev => ({
            ...prev,
            tuitionInfo: response.data,
            error: undefined,
          }));
        } catch (err: unknown) {
          const anyErr = err as { response?: { data?: { message?: string } } } | undefined;
          setPaymentState(prev => ({
            ...prev,
            tuitionInfo: undefined,
            error: anyErr?.response?.data?.message || 'Không tìm thấy thông tin học phí',
          }));
        }
      } else {
        setPaymentState(prev => ({
          ...prev,
          tuitionInfo: undefined,
          error: undefined,
        }));
      }
    };

    const timeoutId = setTimeout(fetchTuitionInfo, 500);
    return () => clearTimeout(timeoutId);
  }, [studentId]);

  const onSubmit = async (data: PaymentFormData) => {
    if (!paymentState.tuitionInfo) {
      setError('Vui lòng kiểm tra thông tin học phí trước khi thanh toán');
      return;
    }

    // Check if user has sufficient balance
    const userBalance = parseFloat(user?.availableBalance || '0');
    const tuitionAmount = parseFloat(paymentState.tuitionInfo.amount);
    
    if (userBalance < tuitionAmount) {
      setError('Số dư tài khoản không đủ để thanh toán');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const response = await paymentAPI.create({
        studentId: data.studentId,
        tuitionAmount: paymentState.tuitionInfo.amount,
      });

      console.log('Payment creation response:', response.data);
      console.log('Using paymentId:', response.data.paymentId);

      const newState = {
        step: 'otp' as const,
        paymentId: response.data.paymentId, // Use actual paymentId for OTP verification
        tuitionInfo: paymentState.tuitionInfo,
      };
      setPaymentState(newState);
      localStorage.setItem('payment_state', JSON.stringify(newState));
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } } | undefined;
      setError(anyErr?.response?.data?.message || 'Tạo thanh toán thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handlePaymentSuccess = async () => {
    setPaymentState({ step: 'success' });
    // Clear localStorage on successful payment
    localStorage.removeItem('payment_state');
    console.log('Payment successful, cleared payment state from localStorage');
    
    try {
      await refreshUser(); // Refresh user balance
      console.log('User data refreshed successfully after payment');
    } catch (error) {
      console.error('Failed to refresh user data after payment:', error);
      // Don't redirect to login on refresh failure after successful payment
      // The user data should still be available from the previous state
    }
  };

  const handlePaymentError = (error: string) => {
    setPaymentState({ step: 'error', error });
  };

  const resetPayment = () => {
    setPaymentState({ step: 'form' });
    localStorage.removeItem('payment_state'); // Clear localStorage when resetting
    setValue('studentId', '');
    setError('');
  };

  return (
    <ProtectedRoute>
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Đang tải thông tin...</p>
          </div>
        </div>
      ) : !user ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Đang tải thông tin người dùng...</p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">TDTU I-Banking</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Xin chào, {user.fullName}</span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Đăng xuất
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* User Info Card */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Thông tin tài khoản
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Họ và tên</p>
                      <p className="text-sm font-medium">{user.fullName}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Số điện thoại</p>
                      <p className="text-sm font-medium">{user.phoneNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Mail className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Wallet className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Số dư khả dụng</p>
                        <p className="text-lg font-bold text-green-600">
                        {formatCurrency(user.availableBalance)}
                        </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Form */}
            <div className="lg:col-span-2">
              {paymentState.step === 'form' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Thanh toán học phí
                    </CardTitle>
                    <CardDescription>
                      Nhập mã sinh viên để thanh toán học phí
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-4">
                        <Input
                          {...register('studentId')}
                          label="Mã sinh viên"
                          placeholder="Nhập mã sinh viên (VD: 522H0006)"
                          error={errors.studentId?.message}
                          helperText="Mã sinh viên phải có ít nhất 6 ký tự"
                        />

                        {paymentState.tuitionInfo && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                              <GraduationCap className="h-4 w-4 mr-2" />
                              Thông tin học phí
                            </h3>
                            <div className="space-y-2 text-sm">
                              <p><strong>Mã sinh viên:</strong> {paymentState.tuitionInfo.studentId}</p>
                              <p><strong>Tên sinh viên:</strong> {paymentState.tuitionInfo.studentName}</p>
                              <p><strong>Số tiền học phí:</strong> 
                                <span className="text-lg font-bold text-red-600 ml-2">
                                  {formatCurrency(paymentState.tuitionInfo.amount)}
                                </span>
                              </p>
                            </div>
                          </div>
                        )}

                        {paymentState.error && (
                          <Alert variant="destructive">
                            <AlertDescription>{paymentState.error}</AlertDescription>
                          </Alert>
                        )}

                        {paymentState.tuitionInfo && (
                          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <h4 className="font-medium text-yellow-900 mb-2">Điều kiện thanh toán:</h4>
                            <ul className="text-sm text-yellow-800 space-y-1">
                              <li>• Số dư tài khoản: {formatCurrency(user.availableBalance)}</li>
                              <li>• Số tiền cần thanh toán: {formatCurrency(paymentState.tuitionInfo.amount)}</li>
                              <li>• Hệ thống chỉ cho phép thanh toán toàn bộ số tiền học phí</li>
                              <li>• Sau khi xác nhận, hệ thống sẽ gửi mã OTP qua email</li>
                            </ul>
                          </div>
                        )}
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        loading={isLoading}
                        disabled={!paymentState.tuitionInfo || isLoading}
                      >
                        {isLoading ? 'Đang tạo thanh toán...' : 'Xác nhận thanh toán'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {paymentState.step === 'otp' && paymentState.paymentId && (
                <OTPVerification
                  paymentId={paymentState.paymentId}
                  tuitionInfo={paymentState.tuitionInfo}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onCancel={resetPayment}
                />
              )}

              {paymentState.step === 'success' && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Thanh toán thành công!</h3>
                      <p className="text-gray-600 mb-6">
                        Học phí đã được thanh toán thành công. Email xác nhận đã được gửi đến địa chỉ email của bạn.
                      </p>
                      <Button onClick={resetPayment} className="w-full">
                        Thanh toán mới
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {paymentState.step === 'error' && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Thanh toán thất bại</h3>
                      <p className="text-gray-600 mb-6">
                        {paymentState.error || 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.'}
                      </p>
                      <Button onClick={resetPayment} className="w-full">
                        Thử lại
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </ProtectedRoute>
  );
}