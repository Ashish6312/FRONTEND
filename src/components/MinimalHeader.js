import React from 'react';
import { Link } from 'react-router-dom';
import './MinimalHeader.css'; // Import CSS for styling

const MinimalHeader = () => {
  return (
    <header className="minimal-header">
      <nav>
        <ul className="minimal-nav-links">
          <li>
            <Link to="/login">Login</Link>
          </li>
          <li>
            <Link to="/register">Register</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default MinimalHeader;