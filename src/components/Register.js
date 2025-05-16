// src/components/Register.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import config from '../config/config';
import './Register.css'; // Import the CSS file

function Register() {
  const [form, setForm] = useState({
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    withdrawPassword: '',
    referredBy: '', // Invite code entered by the user
  });

  const [usernameError, setUsernameError] = useState(''); // State for username validation error
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const inviteCode = params.get('ref');
    if (inviteCode) {
      setForm((prevForm) => ({ ...prevForm, referredBy: inviteCode })); // Pre-fill invite code from URL
    }
  }, [location]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });

    // Clear username error when the user starts typing
    if (e.target.name === 'username') {
      setUsernameError('');
    }
  };

  const checkUsernameAvailability = async () => {
    try {
      const res = await axios.post(`${config.serverUrl}/api/auth/check-username`, {
        username: form.username,
      });
      if (res.data.msg === 'Username is already taken') {
        setUsernameError('Username is already taken');
      } else {
        setUsernameError('');
      }
    } catch (err) {
      console.error(err);
    }
  };
  

  const handleRegister = async (e) => {
    e.preventDefault();

    // Check if passwords match
    if (form.password !== form.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    // Check if username is valid


    try {
      // Send registration data to the server
      const res = await axios.post(`${config.serverUrl}/api/auth/register`, form);

      alert(res.data.msg);
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.msg || 'Registration failed');
    }
  };

  return (
    <div className="register-container">
      <h2 className="register-title">Register</h2>
      <form className="register-form" onSubmit={handleRegister}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          className="register-input"
          onChange={handleChange}
          onBlur={checkUsernameAvailability} // Check username availability on blur
          required
        />
        {usernameError && <p className="error-text">{usernameError}</p>}
        <input
          type="text"
          name="phone"
          placeholder="Phone"
          className="register-input"
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          className="register-input"
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          className="register-input"
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="withdrawPassword"
          placeholder="Withdrawal Password"
          className="register-input"
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="referredBy"
          placeholder="Invite Code (Optional)"
          className="register-input"
          value={form.referredBy}
          onChange={handleChange}
        />
        <button type="submit" className="register-button">Register</button>
      </form>
      <p className="register-footer">
        Already registered? <a href="/login" className="register-link">Login</a>
      </p>
    </div>
  );
}

export default Register;