import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import config from '../config/config';
import './MyInvestments.css';

const MyInvestments = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvestments = async () => {
      if (!user || !user.id) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${config.serverUrl}/api/auth/investments/${user.id}`);
        setInvestments(res.data);
      } catch (error) {
        console.error('Error fetching investments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvestments();
  }, [user]);

  // Redirect if no user
  useEffect(() => {
    if (!user && !loading) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="investments-container">
        <h2>Your Investments</h2>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="investments-container">
      <h2>Your Investments</h2>
      {investments.length === 0 ? (
        <div className="no-investments-container">
          <p className="no-investments">You don't have any active investments.</p>
          <button 
            onClick={() => navigate('/')} 
            className="profile-button"
          >
            Browse Investment Plans
          </button>
        </div>
      ) : (
        <div className="investment-grid">
          {investments.map((inv) => (
            <div key={inv._id || `inv-${Date.now()}-${Math.random()}`} className="investment-card">
              <div className="investment-header">
                <span className="plan-name">{inv.planName}</span>
                <span className="plan-type">{inv.planType}</span>
              </div>
              {inv.image && (
                <img 
                  src={`${config.serverUrl}${inv.image}`} 
                  alt={inv.planName} 
                  style={{ 
                    width: '100%', 
                    height: '200px', 
                    objectFit: 'cover',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}
                />
              )}
              <div className="investment-details">
                <span className="investment-date">
                  <small>Started On</small>
                  {new Date(inv.purchaseDate).toLocaleDateString('en-IN')}
                </span>
                <span className="investment-amount">
                  <small>Invested</small>
                  ₹{inv.investedAmount}
                </span>
                <span className="daily-income">
                  <small>Daily Income</small>
                  ₹{inv.dailyIncome}
                </span>
                <span className="total-earned">
                  <small>Total Earned</small>
                  ₹{inv.totalEarned || 0}
                </span>
                <span className={`status ${inv.status.toLowerCase()}`}>
                  <small>Status</small>
                  {inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <button 
        className="profile-button"
        onClick={() => navigate('/profile')}
      >
        🖥️ Back to Dashboard
      </button>
    </div>
  );
};

export default MyInvestments;
