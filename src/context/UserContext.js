import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser({
            ...parsedUser,
            bankInfo: parsedUser.bankInfo && typeof parsedUser.bankInfo === 'object' && parsedUser.bankInfo.accountNumber !== undefined
              ? parsedUser.bankInfo
              : { accountNumber: '', ifscCode: '', realName: '' }
          });
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const updateUser = (newUserData) => {
    const updatedUser = {
      ...user,
      ...newUserData,
      bankInfo: {
        accountNumber: newUserData.bankInfo?.accountNumber ?? user?.bankInfo?.accountNumber ?? '',
        ifscCode: newUserData.bankInfo?.ifscCode ?? user?.bankInfo?.ifscCode ?? '',
        realName: newUserData.bankInfo?.realName ?? user?.bankInfo?.realName ?? ''
      }
    };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Add login and logout functions for useUser
  const login = async (userData) => {
    setUser({
      ...userData,
      bankInfo: userData.bankInfo && typeof userData.bankInfo === 'object' && userData.bankInfo.accountNumber !== undefined
        ? userData.bankInfo
        : { accountNumber: '', ifscCode: '', realName: '' }
    });
    localStorage.setItem('user', JSON.stringify({
      ...userData,
      bankInfo: userData.bankInfo && typeof userData.bankInfo === 'object' && userData.bankInfo.accountNumber !== undefined
        ? userData.bankInfo
        : { accountNumber: '', ifscCode: '', realName: '' }
    }));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    sessionStorage.removeItem('welcomeModalShown');
  };

  const value = {
    user,
    updateUser,
    login,
    logout,
    isLoading
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Custom hook for protected route checks
export const useAuthGuard = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  return !!user;
};
