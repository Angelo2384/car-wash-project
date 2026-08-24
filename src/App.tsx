/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingScreen from "./screens/auth/LandingScreen";
import FoamEffect from "./components/ui/FoamEffect";
import AuthLayout from './screens/auth/AuthLayout';
import Login from './screens/auth/Login';
import SignUpChoice from './screens/auth/SignUpChoice';
import CustomerSignUp from './screens/auth/CustomerSignUp';
import StaffActivation from './screens/auth/StaffActivation';
import ForgotPassword from './screens/auth/ForgotPassword';
import VerifyEmail from './screens/auth/VerifyEmail';
import CustomerDashboardLayout from './screens/dashboard/customer/CustomerDashboardLayout';
import CustomerDashboard from './screens/dashboard/customer/CustomerDashboard';
import CustomerAppointments from './screens/dashboard/customer/CustomerAppointments';
import CustomerReschedule from './screens/dashboard/customer/CustomerReschedule';
import CustomerCancel from './screens/dashboard/customer/CustomerCancel';
import CustomerProfile from './screens/dashboard/customer/CustomerProfile';
import StaffDashboard from './screens/dashboard/staff/StaffDashboard';
import AdminDashboard from './screens/dashboard/admin/AdminDashboard';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              <>
                <FoamEffect />
                <LandingScreen />
              </>
            } />
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<SignUpChoice />} />
              <Route path="signup/customer" element={<CustomerSignUp />} />
              <Route path="signup/staff" element={<StaffActivation />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="verify-email" element={<VerifyEmail />} />
            </Route>
            <Route path="/dashboard/customer" element={<CustomerDashboardLayout />}>
              <Route index element={<CustomerDashboard />} />
              <Route path="profile" element={<CustomerProfile />} />
              <Route path="appointments" element={<CustomerAppointments />} />
              <Route path="appointments/reschedule" element={<CustomerReschedule />} />
              <Route path="appointments/cancel" element={<CustomerCancel />} />
            </Route>
            <Route path="/dashboard/staff" element={<StaffDashboard />} />
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
