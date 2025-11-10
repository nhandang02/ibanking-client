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
  RefreshCw,
  History
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PaymentState } from '@/types';
import { OTPVerification, ProtectedRoute } from '@/components';
import { ToastContainer } from '@/components/ui/Toast';

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
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>>([]);

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

  // Load payment state from localStorage on component mount
  // Restore state based on whether it's a page reload or navigation
  useEffect(() => {
    const savedPaymentState = localStorage.getItem('payment_state');
    const isNavigationReturn = sessionStorage.getItem('dashboard_navigation') === 'true';
    
    console.log('Dashboard mount - savedPaymentState:', !!savedPaymentState, 'isNavigationReturn:', isNavigationReturn);
    
    if (savedPaymentState) {
      try {
        const parsedState = JSON.parse(savedPaymentState);
        console.log('Loaded payment state from localStorage:', parsedState);
        
        if (isNavigationReturn) {
          // If returning from navigation, restore all states including 'otp'
          // This allows users to continue their payment flow after visiting other pages
          console.log('Restoring state from navigation return:', parsedState);
          
          // Validate that state has required data before restoring
          if (parsedState.step === 'otp' && !parsedState.paymentId) {
            console.error('Invalid OTP state - missing paymentId, clearing state');
            localStorage.removeItem('payment_state');
            setPaymentState({ step: 'form' });
            sessionStorage.removeItem('dashboard_navigation');
            return;
          }
          
          setPaymentState(parsedState);
          
          // Restore studentId to form if we have tuitionInfo and step is 'form'
          if (parsedState.tuitionInfo && parsedState.step === 'form') {
            // Use setTimeout to ensure form is ready, and use the studentId from tuitionInfo
            setTimeout(() => {
              setValue('studentId', parsedState.tuitionInfo.studentId, { shouldValidate: false });
              console.log('Restored studentId to form:', parsedState.tuitionInfo.studentId);
            }, 100);
          }
          
          // Clear the navigation flag
          sessionStorage.removeItem('dashboard_navigation');
          console.log('State restored successfully:', parsedState.step, parsedState);
        } else if (parsedState.step === 'form' || parsedState.step === 'success') {
          // On page reload, restore 'form' or 'success' states
          console.log('Restoring state from page reload:', parsedState);
          setPaymentState(parsedState);
          // Restore studentId to form if we have tuitionInfo and step is 'form'
          if (parsedState.tuitionInfo && parsedState.step === 'form') {
            // Use setTimeout to ensure form is ready, and use the studentId from tuitionInfo
            setTimeout(() => {
              setValue('studentId', parsedState.tuitionInfo.studentId, { shouldValidate: false });
              console.log('Restored studentId to form:', parsedState.tuitionInfo.studentId);
            }, 100);
          }
        } else if (parsedState.step === 'otp') {
          // On page reload, restore 'otp' state if it has valid paymentId and tuitionInfo
          // This allows users to continue their payment after reload
          if (parsedState.paymentId && parsedState.tuitionInfo) {
            console.log('Restoring OTP state from page reload:', parsedState);
            setPaymentState(parsedState);
          } else {
            // Clear invalid OTP state from localStorage on reload
            console.log('Invalid OTP state - missing paymentId or tuitionInfo, clearing state');
            localStorage.removeItem('payment_state');
            setPaymentState({ step: 'form' });
          }
        } else {
          // Clear invalid state from localStorage on reload
          console.log('Clearing invalid payment state from localStorage (reload):', parsedState.step);
          localStorage.removeItem('payment_state');
          setPaymentState({ step: 'form' });
        }
      } catch (error) {
        console.error('Failed to parse saved payment state:', error);
        localStorage.removeItem('payment_state');
        setPaymentState({ step: 'form' });
      }
    } else if (isNavigationReturn) {
      // If navigation flag is set but no saved state, clear the flag
      console.log('Navigation return but no saved state, clearing flag');
      sessionStorage.removeItem('dashboard_navigation');
    }
  }, [setValue]);

  // Save payment state to localStorage whenever it changes
  useEffect(() => {
    // Only save if state has meaningful data (not just initial empty state)
    if (paymentState.step === 'form' && paymentState.tuitionInfo) {
      localStorage.setItem('payment_state', JSON.stringify(paymentState));
      console.log('Saved payment state to localStorage (form with tuitionInfo):', paymentState);
    } else if (paymentState.step === 'otp') {
      // For OTP step, ensure we have paymentId before saving
      if (paymentState.paymentId) {
        localStorage.setItem('payment_state', JSON.stringify(paymentState));
        console.log('Saved payment state to localStorage (otp):', paymentState);
      } else {
        console.warn('OTP state missing paymentId, not saving to localStorage');
      }
    } else if (paymentState.step === 'success' || paymentState.step === 'error') {
      localStorage.setItem('payment_state', JSON.stringify(paymentState));
      console.log('Saved payment state to localStorage:', paymentState);
    }
  }, [paymentState]);

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

  // Auto-fetch tuition info when student ID is entered
  // Skip fetch if we already have tuitionInfo for this studentId (e.g., restored from localStorage)
  useEffect(() => {
    const fetchTuitionInfo = async () => {
      // Skip if we already have tuitionInfo for this studentId
      if (paymentState.tuitionInfo && paymentState.tuitionInfo.studentId === studentId) {
        console.log('Skipping fetch - already have tuitionInfo for studentId:', studentId);
        return;
      }

      if (studentId && studentId.length >= 6) {
        try {
          const response = await tuitionAPI.getByStudentId(studentId);
          const newState = {
            step: 'form' as const,
            tuitionInfo: response.data,
            error: undefined,
          };
          setPaymentState(newState);
          // Save to localStorage immediately
          localStorage.setItem('payment_state', JSON.stringify(newState));
          console.log('Fetched and saved tuition info:', newState);
        } catch (err: unknown) {
          const anyErr = err as { response?: { data?: { message?: string } } } | undefined;
          setPaymentState(prev => ({
            ...prev,
            tuitionInfo: undefined,
            error: anyErr?.response?.data?.message || 'Không tìm thấy thông tin học phí',
          }));
        }
      } else if (!studentId) {
        // Only clear if studentId is empty (not when it changes to a different value)
        setPaymentState(prev => ({
          ...prev,
          tuitionInfo: undefined,
          error: undefined,
        }));
      }
    };

    const timeoutId = setTimeout(fetchTuitionInfo, 500);
    return () => clearTimeout(timeoutId);
  }, [studentId, paymentState.tuitionInfo]);

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
    
    // Reset form to initial state
    setValue('studentId', '');
    setError('');
    console.log('Form reset after successful payment');
    
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
    // Clear localStorage when payment fails or is cancelled
    localStorage.removeItem('payment_state');
    console.log('Payment error/cancelled, cleared payment state from localStorage');
    setPaymentState({ step: 'error', error });
    // Show error toast
    showToast(error, 'error');
  };

  const resetPayment = () => {
    setPaymentState({ step: 'form' });
    localStorage.removeItem('payment_state'); // Clear localStorage when resetting
    setValue('studentId', '');
    setError('');
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
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
              <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
                // Clear navigation flag when clicking logo (staying on same page)
                sessionStorage.removeItem('dashboard_navigation');
                router.push('/dashboard');
              }}>
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">TDTU I-Banking</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Xin chào, {user.fullName}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    // Set navigation flag before navigating away
                    sessionStorage.setItem('dashboard_navigation', 'true');
                    router.push('/payment-history');
                  }}
                >
                  <History className="h-4 w-4 mr-2" />
                  Lịch sử
                </Button>
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
                      Điền thông tin để thanh toán học phí cho sinh viên TDTU
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      {/* Section 1: Payer Information */}
                      <div className="space-y-4">
                        <div className="border-b pb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <User className="h-5 w-5 mr-2 text-blue-600" />
                            1. Thông tin người thanh toán
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Họ và tên
                              </label>
                              <input
                                type="text"
                                value={user.fullName}
                                disabled
                                className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-gray-100 text-gray-700 cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Số điện thoại
                              </label>
                              <input
                                type="text"
                                value={user.phoneNumber}
                                disabled
                                className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-gray-100 text-gray-700 cursor-not-allowed"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Email
                              </label>
                              <input
                                type="email"
                                value={user.email}
                                disabled
                                className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-gray-100 text-gray-700 cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Tuition Information */}
                        <div className="border-b pb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <GraduationCap className="h-5 w-5 mr-2 text-green-600" />
                            2. Thông tin học phí
                          </h3>
                          <div className="space-y-4">
                            <Input
                              {...register('studentId')}
                              label="Mã sinh viên"
                              placeholder="Nhập mã sinh viên (VD: 522H0006)"
                              error={errors.studentId?.message}
                              helperText="Nhập mã sinh viên để hệ thống tự động lấy thông tin học phí"
                            />

                            {paymentState.tuitionInfo ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Tên sinh viên
                                  </label>
                                  <input
                                    type="text"
                                    value={paymentState.tuitionInfo.studentName}
                                    disabled
                                    className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-gray-100 text-gray-700 cursor-not-allowed"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Số tiền học phí cần thanh toán
                                  </label>
                                  <input
                                    type="text"
                                    value={formatCurrency(paymentState.tuitionInfo.amount)}
                                    disabled
                                    className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-gray-100 text-gray-700 cursor-not-allowed font-bold text-red-600"
                                  />
                                </div>
                              </div>
                            ) : paymentState.error ? (
                              <Alert variant="destructive">
                                <AlertDescription>{paymentState.error}</AlertDescription>
                              </Alert>
                            ) : null}
                          </div>
                        </div>

                        {/* Section 3: Payment Information */}
                        <div className="pb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Wallet className="h-5 w-5 mr-2 text-yellow-600" />
                            3. Thông tin thanh toán
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Số dư khả dụng
                              </label>
                              <input
                                type="text"
                                value={formatCurrency(user.availableBalance)}
                                disabled
                                className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-gray-100 text-gray-700 cursor-not-allowed font-bold text-green-600"
                              />
                            </div>
                            {paymentState.tuitionInfo && (
                              <>
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Số tiền học phí cần thanh toán
                                  </label>
                                  <input
                                    type="text"
                                    value={formatCurrency(paymentState.tuitionInfo.amount)}
                                    disabled
                                    className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-gray-100 text-gray-700 cursor-not-allowed font-bold text-red-600"
                                  />
                                </div>
                                {parseFloat(user.availableBalance) < parseFloat(paymentState.tuitionInfo.amount) && (
                                  <Alert variant="destructive">
                                    <AlertDescription>
                                      Số dư tài khoản không đủ để thanh toán. Vui lòng nạp thêm tiền.
                                    </AlertDescription>
                                  </Alert>
                                )}
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                  <h4 className="font-medium text-blue-900 mb-2">Điều khoản và điều kiện:</h4>
                                  <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• Hệ thống chỉ cho phép thanh toán toàn bộ số tiền học phí (không cho phép thanh toán từng phần)</li>
                                    <li>• Sau khi xác nhận, hệ thống sẽ gửi mã OTP qua email để xác thực giao dịch</li>
                                  </ul>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Transaction Confirmation Button */}
                      <Button
                        type="submit"
                        className="w-full"
                        loading={isLoading}
                        disabled={
                          !paymentState.tuitionInfo || 
                          isLoading || 
                          !studentId ||
                          parseFloat(user.availableBalance) < parseFloat(paymentState.tuitionInfo?.amount || '0')
                        }
                      >
                        {isLoading ? 'Đang tạo thanh toán...' : 'Xác nhận giao dịch'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {paymentState.step === 'otp' && paymentState.paymentId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/10 backdrop-blur-sm">
                  <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200 border-2 border-gray-200">
                    <OTPVerification
                      paymentId={paymentState.paymentId}
                      tuitionInfo={paymentState.tuitionInfo}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                      onCancel={resetPayment}
                      onCancelSuccess={() => showToast('Giao dịch đã bị hủy', 'success')}
                    />
                  </div>
                </div>
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ProtectedRoute>
  );
}