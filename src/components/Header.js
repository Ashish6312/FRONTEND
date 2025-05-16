import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { useUser } from '../context/UserContext';
import logo from '../logo.svg';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;
  const navItems = [
    { path: '/home', label: 'Home', icon: '🏠' },
    { path: '/transactions', label: 'Wallet', icon: '💰' },
    { path: '/invite', label: 'Invite', icon: '👥' },
    { path: '/profile', label: 'Profile', icon: '👤' }
  ];

  return (
    <>
      {/* Desktop Header */}
      <header className="desktop-header">
        <div className="header-container">
          <div className="logo">
            <Link to="/home">
              <img src={logo} alt="EarnEase Logo" className="nav-logo" />
              <span>EarnEase</span>
            </Link>
          </div>
          <div className="nav-container">
            <nav>
              <ul className="nav-links">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="header-actions">
              <NotificationBell />
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>      {/* Mobile Bottom Navigation */}      <nav className="mobile-nav">
        <div className="mobile-nav-primary">
          <Link
            to="/home"
            className={`nav-link ${location.pathname === '/home' ? 'active' : ''}`}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </Link>
          <Link
            to="/transactions"
            className={`nav-link ${location.pathname === '/transactions' ? 'active' : ''}`}
          >
            <span className="nav-icon">💰</span>
            <span className="nav-label">Wallet</span>
          </Link>
          <Link to="/home" className="nav-link nav-logo-link">
            <img src={logo} alt="EarnEase Logo" className="nav-logo-mobile" />
            <span className="nav-label">EarnEase</span>
          </Link>
          <Link
            to="/invite"
            className={`nav-link ${location.pathname === '/invite' ? 'active' : ''}`}
          >
            <span className="nav-icon">👥</span>
            <span className="nav-label">Invite</span>
          </Link>
          <Link
            to="/profile"
            className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
          >
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profile</span>
          </Link>
          <button onClick={handleLogout} className="nav-link mobile-logout">
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Header;
