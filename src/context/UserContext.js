import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      // Ensure bank info is properly initialized
      return {
        ...parsedUser,
        bankInfo: parsedUser.bankInfo || {
          accountNumber: '',
          ifscCode: '',
          realName: ''
        }
      };
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  const updateUser = (newUserData) => {
    // Ensure bank info is properly handled during updates
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

  const login = async (userData) => {
    try {
      setIsLoading(true);
      // Ensure bank info is properly initialized during login
      const userWithBankInfo = {
        ...userData,
        bankInfo: userData.bankInfo || {
          accountNumber: '',
          ifscCode: '',
          realName: ''
        }
      };
      setUser(userWithBankInfo);
      localStorage.setItem('user', JSON.stringify(userWithBankInfo));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsLoading(true);
    try {
      setUser(null);
      localStorage.removeItem('user');
      sessionStorage.removeItem('welcomeModalShown');
    } finally {
      setIsLoading(false);
    }
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
