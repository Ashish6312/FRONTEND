// src/App.js
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import { NotificationProvider } from './context/NotificationContext';
import { UserProvider, useUser } from './context/UserContext';
import './styles/theme.css';

import Header from './components/Header';
import Register from './components/Register';
import Login from './components/Login';
import Profile from './components/Profile';
import Home from './components/Home';
import Invite from './components/Invite';
import Transactions from './components/Transactions';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import MyInvestments from './components/MyInvestments';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useUser();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Layout component with conditional header
const Layout = ({ children }) => {
  const location = useLocation();
  const { user } = useUser();
  const hideHeaderRoutes = ['/login', '/register', '/admin/login'];

  return (
    <>
      {user && !hideHeaderRoutes.includes(location.pathname) && <Header />}
      {children}
    </>
  );
};

function App() {
  return (
    <NotificationProvider>
      <UserProvider>
        <Router>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedAdminRoute>
                  <AdminPanel />
                </ProtectedAdminRoute>
              } />

              {/* Protected User Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/home" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/invite" element={
                <ProtectedRoute>
                  <Invite />
                </ProtectedRoute>
              } />
              <Route path="/transactions" element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              } />
              <Route path="/investments" element={
                <ProtectedRoute>
                  <MyInvestments />
                </ProtectedRoute>
              } />
              <Route path="/my-investments" element={
                <ProtectedRoute>
                  <MyInvestments />
                </ProtectedRoute>
              } />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Layout>
        </Router>
      </UserProvider>
    </NotificationProvider>
  );
}

export default App;
