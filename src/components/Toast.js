import React, { useEffect, useState } from 'react';
import './Toast.css';

function Toast({ message, onClose, duration = 3000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const closeTimeout = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Remove after animation
    }, duration);

    return () => clearTimeout(closeTimeout);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for fade-out animation
  };

  return (
    <div className={`toast-container ${isVisible ? 'show' : 'hide'}`}>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={handleClose}>×</button>
    </div>
  );
}

export default Toast;
