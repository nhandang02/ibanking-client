# 🏦 TDTU I-Banking System - Frontend

Hệ thống thanh toán học phí TDTU được xây dựng với Next.js, TypeScript, Tailwind CSS, React Hook Form và Axios.

## 🚀 Tính năng

- **Đăng nhập/Đăng xuất**: Xác thực người dùng với JWT token
- **Thanh toán học phí**: Giao diện thanh toán với validation đầy đủ
- **Xác thực OTP**: Xác thực 2FA qua email
- **Quản lý tài khoản**: Hiển thị thông tin và số dư tài khoản
- **Responsive Design**: Giao diện thân thiện trên mọi thiết bị
- **Error Handling**: Xử lý lỗi toàn diện với thông báo rõ ràng

## 🛠️ Công nghệ sử dụng

- **Next.js 15**: React framework với App Router
- **TypeScript**: Type safety và better developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **React Hook Form**: Form management với validation
- **Zod**: Schema validation
- **Axios**: HTTP client với interceptors
- **Lucide React**: Icon library

## 📋 Yêu cầu hệ thống

- Node.js 18+ 
- npm hoặc yarn
- Backend API server chạy trên `http://localhost:4000`

## 🚀 Cài đặt và chạy

1. **Clone repository và cài đặt dependencies:**
```bash
npm install
# hoặc
yarn install
```

2. **Tạo file environment:**
```bash
# Tạo file .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
```

3. **Chạy development server:**
```bash
npm run dev
# hoặc
yarn dev
```

4. **Mở trình duyệt:**
```
http://localhost:3000
```

## 📱 Hướng dẫn sử dụng

### 1. Đăng nhập
- Truy cập `http://localhost:3000`
- Hệ thống sẽ tự động chuyển hướng đến trang đăng nhập
- Sử dụng tài khoản demo:
  - **Username**: `demo@tdtu.edu.vn`
  - **Password**: `password123`

### 2. Thanh toán học phí
- Sau khi đăng nhập, bạn sẽ thấy dashboard
- Nhập mã sinh viên (VD: `522H0006`)
- Hệ thống sẽ tự động tìm thông tin học phí
- Kiểm tra số dư và thông tin thanh toán
- Nhấn "Xác nhận thanh toán"

### 3. Xác thực OTP
- Sau khi tạo thanh toán, hệ thống sẽ gửi OTP qua email
- Nhập mã OTP 6 chữ số
- Nhấn "Xác thực" để hoàn tất thanh toán

## 🏗️ Cấu trúc dự án

```
├── app/                    # Next.js App Router
│   ├── dashboard/         # Trang dashboard chính
│   ├── login/            # Trang đăng nhập
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page (redirect)
├── components/           # React components
│   ├── ui/              # UI components (Button, Input, Card, etc.)
│   ├── OTPVerification.tsx
│   └── ProtectedRoute.tsx
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication context
├── lib/                 # Utility libraries
│   ├── axios.ts         # Axios configuration
│   └── utils.ts         # Helper functions
├── services/            # API services
│   └── api.ts           # API endpoints
└── types/               # TypeScript type definitions
    └── index.ts
```

## 🔧 Cấu hình

### API Configuration
File `lib/axios.ts` chứa cấu hình Axios:
- Base URL: `http://localhost:4000`
- Auto token refresh
- Request/Response interceptors
- Error handling

### Environment Variables
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000  # Backend API URL
```

## 🎨 UI/UX Features

- **Modern Design**: Clean và professional interface
- **Responsive**: Hoạt động tốt trên desktop, tablet, mobile
- **Loading States**: Loading indicators cho tất cả actions
- **Error Handling**: Clear error messages và recovery options
- **Form Validation**: Real-time validation với helpful messages
- **Accessibility**: Keyboard navigation và screen reader support

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Auto Token Refresh**: Seamless token renewal
- **Protected Routes**: Route protection với middleware
- **Input Validation**: Client-side và server-side validation
- **OTP Verification**: Two-factor authentication

## 🚨 Business Rules Implementation

### Payment Rules
- ✅ **Concurrent Payment Prevention**: Chỉ 1 thanh toán cho mỗi studentId
- ✅ **Full Payment Only**: Phải thanh toán đủ số tiền học phí
- ✅ **Balance Check**: Kiểm tra số dư trước khi thanh toán
- ✅ **OTP Expiry**: OTP có thời hạn 2 phút
- ✅ **Auto Timeout**: Thanh toán tự động hủy sau 2 phút

### UI/UX Rules
- ✅ **Auto-fill Payer Info**: Thông tin người thanh toán tự động điền
- ✅ **Real-time Tuition Lookup**: Tìm thông tin học phí theo studentId
- ✅ **Transaction Confirmation**: Button chỉ enable khi đủ điều kiện
- ✅ **OTP Verification**: Xác thực OTP trước khi hoàn tất

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Error**
   - Kiểm tra backend server có chạy trên port 4000
   - Kiểm tra CORS configuration

2. **Authentication Issues**
   - Clear browser cookies và localStorage
   - Kiểm tra token expiry

3. **OTP Not Received**
   - Kiểm tra email spam folder
   - Sử dụng chức năng "Gửi lại mã OTP"

## 📞 Support

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra console logs trong browser
2. Kiểm tra network requests trong DevTools
3. Đảm bảo backend API đang chạy và accessible

## 📄 License

Dự án này được phát triển cho mục đích học tập tại TDTU.
