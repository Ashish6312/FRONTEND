import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedAdminRoute = ({ children }) => {
  const [isValidAdmin, setIsValidAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateAdminToken = () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setIsValidAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        ));

        if (payload.role !== 'admin' || !payload.username) {
          localStorage.removeItem('adminToken');
          setIsValidAdmin(false);
        } else {
          setIsValidAdmin(true);
        }
      } catch (e) {
        console.error('Error validating admin token:', e);
        localStorage.removeItem('adminToken');
        setIsValidAdmin(false);
      }
      setIsLoading(false);
    };

    validateAdminToken();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isValidAdmin ? children : <Navigate to="/admin/login" replace />;
};

export default ProtectedAdminRoute;
