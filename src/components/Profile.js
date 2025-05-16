import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import Toast from './Toast';
import useCountUp from '../hooks/useCountUp';
import config from '../config/config';
import './Profile.css';

function Profile() {  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useUser();
    // Form states
  const [activeTab, setActiveTab] = useState(() => 
    location.state?.activeTab || 'Dashboard'
  );
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [realName, setRealName] = useState('');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [oldWithdrawPass, setOldWithdrawPass] = useState('');
  const [newWithdrawPass, setNewWithdrawPass] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  
  // Data states
  const [transactions, setTransactions] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalIncome: 0,
    totalRecharge: 0,
    totalAssets: 0,
    totalWithdraw: 0,
    todaysIncome: 0,
    teamIncome: 0
  });

  // Loading state with usage in UI
  const [isLoading, setIsLoading] = useState(false);

  // Formatted values using useCountUp
  const animatedTotalIncome = useCountUp(summaryData?.totalIncome || 0);
  const animatedTotalRecharge = useCountUp(summaryData?.totalRecharge || 0);
  const animatedTotalWithdraw = useCountUp(summaryData?.totalWithdraw || 0);
  const animatedTotalAssets = useCountUp(summaryData?.totalAssets || 0);
  const animatedTodaysIncome = useCountUp(summaryData?.todaysIncome || 0);
  const animatedTeamIncome = useCountUp(summaryData?.teamIncome || 0);

  // Memoized helper functions
  const formatCurrency = useCallback((amount) => {
    if (!amount && amount !== 0) return '₹0.00';
    return `₹${amount.toFixed(2)}`;
  }, []);

  // Memoized data fetching functions
  const fetchTransactions = useCallback(async () => {
    if (!user?.phone) return;
    try {
      setIsLoading(true);
      const res = await axios.get(`${config.serverUrl}/api/auth/transactions/${user.phone}`);
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setToastMessage('Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  }, [user?.phone]);

  const fetchInvestments = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(`${config.serverUrl}/api/auth/investments/${user.id}`);
      setInvestments(res.data || []);
    } catch (err) {
      console.error('Error fetching investments:', err);
      setToastMessage('Failed to fetch investments');
    }
  }, [user?.id]);

  const calculateSummary = useCallback(() => {
    if (!user) {
      setSummaryData({
        totalIncome: 0,
        totalRecharge: 0,
        totalWithdraw: 0,
        totalAssets: 0,
        todaysIncome: 0,
        teamIncome: 0
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const summary = transactions.reduce((acc, tx) => {
      const txDate = new Date(tx.date);
      
      switch(tx.type) {
        case 'Earning':
          acc.totalIncome += tx.amount;
          if (txDate >= today) {
            acc.todaysIncome += tx.amount;
          }
          break;
        case 'Recharge':
          acc.totalRecharge += tx.amount;
          break;
        case 'Withdraw':
          acc.totalWithdraw += tx.amount;
          break;
        case 'Referral Bonus':
          acc.teamIncome += tx.amount;
          break;
        default:
          break;
      }
      return acc;
    }, {
      totalIncome: 0,
      totalRecharge: 0,
      totalWithdraw: 0,
      todaysIncome: 0,
      teamIncome: 0
    });
    
    const totalInvestments = investments.reduce((sum, inv) => sum + (inv.investedAmount || 0), 0);
    summary.totalAssets = totalInvestments + (user?.wallet || 0);
    
    setSummaryData(summary);
  }, [user, transactions, investments]);

  // Memoized form submission handlers
  const updateBank = useCallback(async () => {
    if (!user?.phone || !accountNumber || !ifsc || !realName) {
      setToastMessage('Please fill in all bank details');
      return;
    }

    try {
      const res = await axios.post(`${config.serverUrl}/api/auth/profile/update-bank`, {
        phone: user.phone,
        accountNumber,
        realName,
        ifscCode: ifsc
      });
      
      if (res.status === 200) {
        const updatedUser = {
          ...user,
          bankInfo: {
            accountNumber,
            realName,
            ifscCode: ifsc
          }
        };
        
        // First update the context to reflect changes immediately
        updateUser(updatedUser);
        // Immediately update local state to reflect changes
        setAccountNumber(accountNumber);
        setIfsc(ifsc);
        setRealName(realName);
        // Then show success message
        setToastMessage('Bank details updated successfully');
      }
    } catch (err) {
      console.error('Error updating bank details:', err);
      setToastMessage(err.response?.data?.msg || 'Failed to update bank details');
    }
  }, [user, updateUser, accountNumber, ifsc, realName]);

  const changeLoginPass = useCallback(async () => {
    if (!user?.phone || !oldPass || !newPass) return;
    try {
      const res = await axios.post(`${config.serverUrl}/api/auth/profile/change-login-password`, {
        phone: user.phone,
        oldPassword: oldPass,
        newPassword: newPass,
      });
      setToastMessage(res.data.msg);
      setOldPass('');
      setNewPass('');
    } catch (err) {
      setToastMessage(err.response?.data?.msg || 'Error updating login password');
    }
  }, [user?.phone, oldPass, newPass]);

  const changeWithdrawPass = useCallback(async () => {
    if (!user?.phone || !oldWithdrawPass || !newWithdrawPass) return;
    try {
      const res = await axios.post(`${config.serverUrl}/api/auth/profile/change-withdraw-password`, {
        phone: user.phone,
        oldWithdrawPassword: oldWithdrawPass,
        newWithdrawPassword: newWithdrawPass,
      });
      setToastMessage(res.data.msg);
      setOldWithdrawPass('');
      setNewWithdrawPass('');
    } catch (err) {
      setToastMessage(err.response?.data?.msg || 'Error updating withdraw password');
    }
  }, [user?.phone, oldWithdrawPass, newWithdrawPass]);

  // Effects
  useEffect(() => {
    if (user?.phone) {
      fetchTransactions();
      fetchInvestments();
    }
  }, [user, fetchTransactions, fetchInvestments]);

  useEffect(() => {
    calculateSummary();
  }, [calculateSummary]);

  // Effect to manage bank info form state
  useEffect(() => {
    if (activeTab === 'BankInfo') {
      // Clear any previous toast messages
      setToastMessage('');
      
      if (user?.bankInfo) {
        // Set form fields to current bank info
        setAccountNumber(user.bankInfo.accountNumber || '');
        setIfsc(user.bankInfo.ifscCode || '');
        setRealName(user.bankInfo.realName || '');
      } else {
        // Reset form fields if no bank info exists
        setAccountNumber('');
        setIfsc('');
        setRealName('');
      }
    }
  }, [activeTab, user?.bankInfo]);

  const renderForm = (title, inputs, onSubmit) => (
    <div className="tab-content">
      {activeTab !== 'Dashboard' && (
        <button 
          className="back-button" 
          onClick={() => setActiveTab('Dashboard')}
          aria-label="Back to Dashboard"
        >
          Back to Dashboard
        </button>
      )}
      <h3>{title}</h3>
      <form onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}>
        {inputs}
      </form>
    </div>
  );

  const hasBankInfo = Boolean(
    user?.bankInfo &&
    typeof user.bankInfo.accountNumber === 'string' && user.bankInfo.accountNumber.trim() !== '' &&
    typeof user.bankInfo.ifscCode === 'string' && user.bankInfo.ifscCode.trim() !== '' &&
    typeof user.bankInfo.realName === 'string' && user.bankInfo.realName.trim() !== ''
  );

  const renderBankInfoSection = () => (
    <div className="bank-info-section">
      {hasBankInfo ? (
        <div className="current-bank-info">
          <h4>Current Bank Details</h4>
          <div className="bank-info-display">
            <p><strong>Account Holder:</strong> {user.bankInfo.realName}</p>
            <p><strong>Account Number:</strong> {user.bankInfo.accountNumber}</p>
            <p><strong>IFSC Code:</strong> {user.bankInfo.ifscCode}</p>
          </div>
          <h4>Update Bank Details</h4>
        </div>
      ) : (
        <p className="no-bank-info">No bank details added yet. Please fill in your bank information below.</p>
      )}
      {/* Remove inner form, just render inputs/buttons */}
      <input
        placeholder="Real Name (as per bank account)"
        value={realName}
        onChange={(e) => setRealName(e.target.value)}
        type="text"
        aria-label="Real Name"
      />
      <input
        placeholder="Account Number"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="Account Number"
        maxLength={20}
      />
      <input
        placeholder="IFSC Code"
        value={ifsc}
        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
        type="text"
        autoCapitalize="characters"
        aria-label="IFSC Code"
        maxLength={11}
      />
      <button type="submit">
        {hasBankInfo ? 'Update' : 'Save'} Bank Info
      </button>
    </div>
  );

  // Fallback for no user
  if (!user) {
    return (
      <div className="profile-container">
        <h1>Profile</h1>
        <p>Please log in to view your profile.</p>
      </div>
    );
  }
  
  return (
    <div className="profile-container">
      <h1>Hello, {user.username}</h1>
      
      {activeTab === 'Dashboard' && (
        <>
          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <>
              <div className="summary-cards">
                <div className="card">
                  <h4>Total Income</h4>
                  <p>{formatCurrency(animatedTotalIncome)}</p>
                </div>
                <div className="card">
                  <h4>Total Recharge</h4>
                  <p>{formatCurrency(animatedTotalRecharge)}</p>
                </div>
                <div className="card">
                  <h4>Total Withdraw</h4>
                  <p>{formatCurrency(animatedTotalWithdraw)}</p>
                </div>
                <div className="card">
                  <h4>Total Assets</h4>
                  <p>{formatCurrency(animatedTotalAssets)}</p>
                </div>
                <div className="card">
                  <h4>Today's Income</h4>
                  <p>{formatCurrency(animatedTodaysIncome)}</p>
                </div>
                <div className="card">
                  <h4>Team Income</h4>
                  <p>{formatCurrency(animatedTeamIncome)}</p>
                </div>
              </div>
              
              <div className="menu-list">
                <div className="menu-item" onClick={() => navigate('/my-investments')} role="button" tabIndex={0}>
                  <span className="menu-icon" aria-hidden="true">📋</span>
                  <span className="menu-text">My Order</span>
                  <span className="menu-arrow" aria-hidden="true">›</span>
                </div>
                <div className="menu-item" onClick={() => setActiveTab('BankInfo')}>
                  <span className="menu-icon">🏦</span>
                  <span className="menu-text">Bank Info</span>
                  <span className="menu-arrow">›</span>
                </div>
                <div className="menu-item" onClick={() => setActiveTab('LoginPassword')}>
                  <span className="menu-icon">🔒</span>
                  <span className="menu-text">Change Login Password</span>
                  <span className="menu-arrow">›</span>
                </div>
                <div className="menu-item" onClick={() => setActiveTab('WithdrawPassword')}>
                  <span className="menu-icon">🔑</span>
                  <span className="menu-text">Change Withdrawal Password</span>
                  <span className="menu-arrow">›</span>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'BankInfo' && renderForm(
        'Bank Info',
        renderBankInfoSection(),
        updateBank
      )}

      {activeTab === 'LoginPassword' && renderForm(
        'Change Login Password',
        <>
          <input
            type="password"
            placeholder="Old Password"
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
          />
          <input
            type="password"
            placeholder="New Password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
          />
          <button type="submit">Change Login Password</button>
        </>,
        changeLoginPass
      )}

      {activeTab === 'WithdrawPassword' && renderForm(
        'Change Withdrawal Password',
        <>
          <input
            type="password"
            placeholder="Old Withdrawal Password"
            value={oldWithdrawPass}
            onChange={(e) => setOldWithdrawPass(e.target.value)}
          />
          <input
            type="password"
            placeholder="New Withdrawal Password"
            value={newWithdrawPass}
            onChange={(e) => setNewWithdrawPass(e.target.value)}
          />
          <button type="submit">Change Withdrawal Password</button>
        </>,
        changeWithdrawPass
      )}

      {toastMessage && (
        <Toast 
          message={toastMessage} 
          onClose={() => setToastMessage('')}
        />
      )}
    </div>
  );
}

export default Profile;
