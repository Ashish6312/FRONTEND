import React, { createContext, useState, useContext } from 'react';
import Toast from '../components/Toast';
import './Notification.css';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message }]);
    // Removed auto remove notification after 3 seconds to keep notifications until explicit close
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearNotifications }}>
      <div className="notifications-wrapper">
        {notifications.map((notif) => (
          <Toast 
            key={notif.id}
            message={notif.message}
            onClose={() => removeNotification(notif.id)}
          />
        ))}
      </div>
      {children}
    </NotificationContext.Provider>
  );
};
