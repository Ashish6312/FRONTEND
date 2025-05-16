import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import './NotificationBell.css';

const NotificationBell = () => {
  const { notifications, clearNotifications } = useNotification();
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  return (
    <div className="notification-bell">
      <button
        className="bell-icon"
        onClick={toggleDropdown}
        title="Notifications"
      >
        🔔
        {notifications.length > 0 && (
          <span className="notification-count">{notifications.length}</span>
        )}
      </button>
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>Notifications</h4>
            <div className="header-buttons">
              <button
                className="clear-all-button"
                onClick={clearNotifications}
                disabled={notifications.length === 0}
              >
                Clear All
              </button>
              <button className="close-button" onClick={closeDropdown}>✖</button>
            </div>
          </div>
          <div className="notification-list">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div key={notification.id} className="notification-item">
                  {notification.message}
                </div>
              ))
            ) : (
              <p className="no-notifications">No new notifications</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
