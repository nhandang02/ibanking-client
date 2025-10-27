'use client';

import React, { useState, useEffect } from 'react';
import { paymentAPI } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { formatCurrency } from '@/lib/utils';
import { 
  X, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  Info
} from 'lucide-react';
import { PaymentSaga, PaymentSagaStep, PaymentSagaCompletedStep } from '@/types';

interface PaymentSagaModalProps {
  paymentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentSagaModal: React.FC<PaymentSagaModalProps> = ({
  paymentId,
  isOpen,
  onClose,
}) => {
  const [saga, setSaga] = useState<PaymentSaga | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Debug saga state changes
  useEffect(() => {
    console.log('Saga state changed:', saga);
  }, [saga]);

  useEffect(() => {
    if (isOpen && paymentId) {
      fetchSagaDetails();
    }
  }, [isOpen, paymentId]);

  const fetchSagaDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await paymentAPI.getSaga(paymentId);
      console.log('Saga response:', response);
      console.log('Saga data:', response.data);
      console.log('Setting saga state:', response.data.data);
      setSaga(response.data.data);
    } catch (err: unknown) {
      console.error('Saga fetch error:', err);
      
      // Handle different error structures
      let errorMessage = 'Không thể tải chi tiết giao dịch';
      
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
          errorMessage = 'Không có quyền truy cập chi tiết giao dịch';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return 'Không có thông tin';
    
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Info className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Chi tiết giao dịch</h2>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Đang tải chi tiết giao dịch...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : saga ? (
            <div className="space-y-6">
              {/* Payment Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Info className="h-5 w-5 mr-2" />
                    Thông tin giao dịch
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Payment ID:</p>
                      <p className="font-medium">{saga.paymentId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Mã sinh viên:</p>
                      <p className="font-medium">{saga.studentId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Số tiền:</p>
                      <p className="font-bold text-red-600">{formatCurrency(saga.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email:</p>
                      <p className="font-medium">{saga.userEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Trạng thái:</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium border ${
                        saga.status === 'completed' ? 'text-green-600 bg-green-50 border-green-200' :
                        saga.status === 'failed' ? 'text-red-600 bg-red-50 border-red-200' :
                        saga.status === 'pending' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                        saga.status === 'compensating' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                        'text-gray-600 bg-gray-50 border-gray-200'
                      }`}>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span className="ml-2">
                          {saga.status === 'completed' ? 'Hoàn thành' :
                           saga.status === 'failed' ? 'Thất bại' :
                           saga.status === 'pending' ? 'Đang xử lý' :
                           saga.status === 'compensating' ? 'Đang hoàn tác' :
                           saga.status}
                        </span>
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Bước hiện tại:</p>
                      <p className="font-medium">{saga.currentStepIndex + 1}/{(saga.steps?.length || 0) + (saga.completedSteps?.length || 0)}</p>
                    </div>
                  </div>
                  
                  {saga.errorMessage && (
                    <div className="mt-4">
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Lý do thất bại:</strong> {saga.errorMessage}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>


              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tạo:</span>
                      <span>{formatDate(saga.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cập nhật:</span>
                      <span>{formatDate(saga.updatedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={fetchSagaDetails} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>
    </div>
  );
};
