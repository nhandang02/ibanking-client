# 🏦 Campus I-Banking Portal - Frontend

University tuition payment portal built with Next.js, TypeScript, Tailwind CSS, React Hook Form, and Axios.

## 🚀 Features

- **Auth**: Login/Logout with JWT-based authentication
- **Tuition Payments**: Guided payment flow with full validation
- **OTP Verification**: Email-based two-factor verification
- **Account Overview**: Balance and account details
- **Responsive UI**: Optimized for desktop, tablet, and mobile
- **Error Handling**: Clear, actionable error messaging

## 🛠️ Tech Stack

- **Next.js 15** with App Router
- **TypeScript** for static typing
- **Tailwind CSS** utility-first styling
- **React Hook Form** with **Zod** validation
- **Axios** with interceptors
- **Lucide React** icon set

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Backend API available at `http://localhost:4000`
- Backend reference: https://github.com/nhandang02/ibanking-subsystem-microservice

## 🚀 Setup & Run

1) **Install dependencies**
```bash
npm install
# or
yarn install
```

2) **Create environment file**
```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
```

3) **Start the dev server**
```bash
npm run dev
# or
yarn dev
```

4) **Open the app**
```
http://localhost:3000
```

## 📱 Usage Guide

### 1) Sign in
- Visit `http://localhost:3000` (auto-redirects to login)
- Demo account:
  - **Username**: `demo@example.edu`
  - **Password**: `password123`

### 2) Pay tuition
- After login, open the dashboard
- Enter a student ID (e.g., `STU0001`)
- The app fetches tuition details automatically
- Review balance and payment info
- Click **Confirm payment**

### 3) Verify OTP
- After creating a payment, an OTP is emailed
- Enter the 6-digit code
- Click **Verify** to finish

## 🏗️ Project Structure

```
├── app/                    # Next.js App Router
│   ├── dashboard/          # Dashboard page
│   ├── login/              # Login page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page (redirect)
├── components/             # React components
│   ├── ui/                 # UI components (Button, Input, Card, etc.)
│   ├── OTPVerification.tsx
│   └── ProtectedRoute.tsx
├── contexts/               # React contexts
│   └── AuthContext.tsx     # Authentication context
├── lib/                    # Utility libraries
│   ├── axios.ts            # Axios configuration
│   └── utils.ts            # Helper functions
├── services/               # API services
│   └── api.ts              # API endpoints
└── types/                  # TypeScript type definitions
    └── index.ts
```

## 🔧 Configuration

### API Configuration
`lib/axios.ts` defines the Axios setup:
- Base URL: `http://localhost:4000`
- Automatic token refresh
- Request/response interceptors
- Centralized error handling

### Environment Variables
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000  # Backend API URL
```

## 🎨 UI/UX Highlights

- **Modern design**: Clean, professional interface
- **Responsive**: Works across desktop, tablet, and mobile
- **Loading states**: Indicators for all key actions
- **Error handling**: Clear messages with recovery cues
- **Form validation**: Real-time checks with helpful feedback
- **Accessibility**: Keyboard navigation and screen reader support

## 🔒 Security Features

- **JWT authentication** for secure sessions
- **Automatic token refresh**
- **Protected routes** via middleware
- **Input validation** on client and server
- **OTP verification** for 2FA

## 🚨 Business Rules

### Payment Rules
- ✅ **Concurrent payment prevention**: Only one payment per studentId
- ✅ **Full payment only**: Must pay the full tuition amount
- ✅ **Balance check**: Ensure sufficient balance before paying
- ✅ **OTP expiry**: OTP expires after 2 minutes
- ✅ **Auto timeout**: Payment auto-cancels after 2 minutes

### UI/UX Rules
- ✅ **Auto-fill payer info**
- ✅ **Real-time tuition lookup** by studentId
- ✅ **Transaction confirmation** only when criteria are met
- ✅ **OTP verification** required before completion

## 🐛 Troubleshooting

### Common Issues

1. **API connection error**
   - Confirm the backend is running on port 4000
   - Verify CORS configuration

2. **Authentication issues**
   - Clear browser cookies and localStorage
   - Check token expiry

3. **OTP not received**
   - Check the email spam folder
   - Use **Resend OTP**

## 📞 Support

If you encounter issues:
1. Review browser console logs
2. Check network requests in DevTools
3. Ensure the backend API is running and reachable

## 📄 License

This project is developed for academic purposes at the university level.