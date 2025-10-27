'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { paymentAPI } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { formatCurrency } from '@/lib/utils';
import { 
  Building2, 
  LogOut,
  RefreshCw,
  History,
  Calendar,
  CreditCard,
  User,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Info,
  Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, PaymentSagaModal } from '@/components';
import { PaymentHistory } from '@/types';

export default function PaymentHistoryPage() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isSagaModalOpen, setIsSagaModalOpen] = useState(false);

  // Debug payments state changes
  useEffect(() => {
    console.log('Payments state changed:', payments);
    console.log('Payments length:', payments.length);
  }, [payments]);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await paymentAPI.getHistory();
        console.log('Payment history response:', response);
        console.log('Response data:', response.data);
        console.log('Response data.data:', response.data.data);
        // Handle nested data structure from API response
        setPayments(response.data.data);
      } catch (err: unknown) {
        console.error('Payment history fetch error:', err);
        
        // Handle different error structures
        let errorMessage = 'Không thể tải lịch sử thanh toán';
        
        if (err && typeof err === 'object') {
          const errorObj = err as any;
          
          // Handle axios error structure
          if (errorObj.response?.data?.msg) {
            errorMessage = errorObj.response.data.msg;
          } else if (errorObj.response?.data?.message) {
            errorMessage = errorObj.response.data.message;
          } else if (errorObj.message) {
            errorMessage = errorObj.message;
          } else if (errorObj.code === 403) {
            errorMessage = 'Không có quyền truy cập lịch sử thanh toán';
          }
        }
        
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchPaymentHistory();
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleViewSagaDetails = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setIsSagaModalOpen(true);
  };

  const handleCloseSagaModal = () => {
    setIsSagaModalOpen(false);
    setSelectedPaymentId(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'Thành công';
      case 'cancelled':
        return 'Đã hủy';
      case 'failed':
      case 'error':
        return 'Thất bại';
      case 'pending':
        return 'Đang xử lý';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'failed':
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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
                <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push('/dashboard')}>
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
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button variant="outline" size="sm" onClick={handleBackToDashboard}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Quay lại Dashboard
                  </Button>
                  <div className="flex items-center space-x-2">
                    <History className="h-6 w-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Lịch sử thanh toán</h2>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Làm mới
                </Button>
              </div>
              <p className="text-gray-600 mt-2">
                Xem tất cả các giao dịch thanh toán học phí của bạn
              </p>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isLoading ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                      <p className="text-gray-600">Đang tải lịch sử thanh toán...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : payments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có giao dịch nào</h3>
                      <p className="text-gray-600 mb-6">
                        Bạn chưa thực hiện giao dịch thanh toán học phí nào.
                      </p>
                      <Button onClick={handleBackToDashboard}>
                        Thực hiện thanh toán
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <Card key={payment.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <CreditCard className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  Thanh toán học phí
                                </h3>
                                <p className="text-sm text-gray-600">
                                  ID: {payment.id}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">Mã SV:</span>
                                  <span className="text-sm font-medium">{payment.studentId}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">Số dư trước:</span>
                                  <span className="text-sm font-medium">{formatCurrency(payment.payerBalance)}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">Ngày:</span>
                                  <span className="text-sm font-medium">{formatDate(payment.createdAt)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">Số tiền:</span>
                                  <span className="text-lg font-bold text-red-600">
                                    {formatCurrency(payment.tuitionAmount)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mb-4">
                              <p className="text-sm text-gray-600">
                                <strong>Điều khoản:</strong> {payment.paymentTerms}
                              </p>
                            </div>
                          </div>

                          <div className="ml-4 flex flex-col items-end space-y-2">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(payment.status)}`}>
                              {getStatusIcon(payment.status)}
                              <span className="ml-2">{getStatusText(payment.status)}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSagaDetails(payment.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Chi tiết
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Saga Modal */}
      {selectedPaymentId && (
        <PaymentSagaModal
          paymentId={selectedPaymentId}
          isOpen={isSagaModalOpen}
          onClose={handleCloseSagaModal}
        />
      )}
    </ProtectedRoute>
  );
}
