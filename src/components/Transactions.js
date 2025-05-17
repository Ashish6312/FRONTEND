import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Toast from './Toast';
import './Transactions.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import io from 'socket.io-client';
import config from '../config/config';

const socket = io('/socket.io', {
  transports: ['websocket', 'polling']
});


function Transactions() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(location.state?.activeTab?.toLowerCase() === 'withdraw' ? 'Withdraw' : 'Recharge');
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [transactionPassword, setTransactionPassword] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showWallet, setShowWallet] = useState(false);
  const [walletBalance, setWalletBalance] = useState(user?.wallet || 0);
  const [earningsStats, setEarningsStats] = useState({
    totalEarned: 0,
    todayEarned: 0,
    yesterdayEarned: 0,
    lastWeekEarned: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [filter] = useState('all'); // 'all', 'recharge', 'withdraw', 'earning'
  const [walletBreakdown, setWalletBreakdown] = useState({ earnedInWallet: 0, rechargedInWallet: 0 });
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);

  // Sync wallet balance with user object
  useEffect(() => {
    if (user && user.wallet !== undefined) {
      setWalletBalance(user.wallet);
    }
  }, [user]);

  // Calculate earnings statistics from transactions
  const calculateEarningsStats = useCallback((transactions) => {
    // Filter only earning transactions
    const earningTransactions = transactions.filter(tx => tx.type === 'Earning');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    let totalEarned = 0;
    let todayEarned = 0;
    let yesterdayEarned = 0;
    let lastWeekEarned = 0;
    
    earningTransactions.forEach(tx => {
      const txDate = new Date(tx.date);
      txDate.setHours(0, 0, 0, 0);
      
      // Total earnings
      totalEarned += tx.amount;
      
      // Today's earnings
      if (txDate.getTime() === today.getTime()) {
        todayEarned += tx.amount;
      }
      
      // Yesterday's earnings
      if (txDate.getTime() === yesterday.getTime()) {
        yesterdayEarned += tx.amount;
      }
      
      // Last week's earnings
      if (txDate >= lastWeekStart && txDate <= today) {
        lastWeekEarned += tx.amount;
      }
    });
    
    setEarningsStats({
      totalEarned,
      todayEarned,
      yesterdayEarned,
      lastWeekEarned
    });
  }, []);

  const calculateWalletBreakdown = useCallback((txs) => {
    const totalEarnings = txs
      .filter(tx => tx.type === 'Earning')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalRecharged = txs
      .filter(tx => tx.type === 'Recharge' && tx.status.toLowerCase() === 'success')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalWithdrawn = txs
      .filter(tx => tx.type === 'Withdraw' && tx.status.toLowerCase() !== 'rejected')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const earnedInWallet = Math.max(totalEarnings - totalWithdrawn, 0);
    const rechargedInWallet = Math.max(totalRecharged - (walletBalance - earnedInWallet), 0);
    return { earnedInWallet, rechargedInWallet, totalEarnings, totalWithdrawn };
  }, [walletBalance]);

  // Fetch transaction history and calculate earnings statistics
  const fetchTransactions = useCallback(async () => {
    if (!user?.phone) return;
    
    setIsLoading(true);
    try {
      const response = await axios.get(`${config.serverUrl}/api/auth/transactions/${user.phone}`);
      const allTransactions = response.data.transactions;
      
      // Apply filter if needed
      if (filter !== 'all') {
        const filteredTransactions = allTransactions.filter(
          tx => tx.type.toLowerCase() === filter.toLowerCase()
        );
        setTransactions(filteredTransactions);
      } else {
        setTransactions(allTransactions);
      }
      
      // Calculate earnings statistics
      calculateEarningsStats(allTransactions);
      
      // Calculate wallet breakdown
      const { earnedInWallet, rechargedInWallet, totalWithdrawn } = calculateWalletBreakdown(allTransactions);
      setWalletBreakdown({ earnedInWallet, rechargedInWallet });
      setTotalWithdrawn(totalWithdrawn);
    } catch (error) {
      if (error.response?.status === 401) {
        setToastMessage('Session expired. Please log in again.');
        navigate('/login');
      } else if (error.response?.status === 404) {
        setTransactions([]);
        setToastMessage('No transactions found');
      } else {
        console.error('Error fetching transactions:', error);
        setToastMessage('Failed to fetch transaction history');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.phone, filter, navigate, calculateEarningsStats, calculateWalletBreakdown]);

  // Socket.io connection for real-time wallet updates
  useEffect(() => {
    socket.on('walletUpdated', (data) => {
      if (user && (data.userId === user._id || data.userId === user.id)) {
        // Update user in context and localStorage
        const updatedUser = { ...user, wallet: data.newWallet };
        updateUser(updatedUser);
        setWalletBalance(data.newWallet);
        
        // Show notification based on transaction type
        if (data.transactionType === 'Earning') {
          setToastMessage(`💰 ₹${data.amount} earned from ${data.planName || 'your investment'}!`);
        } else if (data.amount > 0) {
          setToastMessage(`💰 ₹${data.amount} credited to your wallet!`);
        }
        
        // Refresh transaction history to update all calculations
        fetchTransactions();
      }
    });

    // Add polling for payment status
    socket.on('paymentComplete', (data) => {
      if (data.phone === user?.phone) {
        updateUser({ ...user, wallet: data.wallet });
        setWalletBalance(data.wallet);
        setToastMessage('Payment successful! Wallet updated.');
        setAmount('');
        setTransactionPassword('');
        // Refresh transaction history to update all calculations
        fetchTransactions();
      }
    });

    return () => {
      socket.off('walletUpdated');
      socket.off('paymentComplete');
    };
  }, [user, updateUser, fetchTransactions]);

  // Redirect to login if user is not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  // Fetch transactions on component mount and when user changes
  useEffect(() => {
    if (user?.phone) {
      fetchTransactions();
    }
  }, [user?.phone, fetchTransactions]);

  // Update activeTab when state changes
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab.charAt(0).toUpperCase() + location.state.activeTab.slice(1));
    }
  }, [location.state]);

  const handleRecharge = async (e) => {
    e.preventDefault();
    const rechargeAmount = parseFloat(amount);
    
    if (!rechargeAmount || isNaN(rechargeAmount)) {
      return setToastMessage('Please enter a valid amount');
    }
    
    if (rechargeAmount < 480) {
      return setToastMessage('Minimum recharge amount is ₹480');
    }
    
    if (rechargeAmount > 50000) {
      return setToastMessage('Maximum recharge amount is ₹50,000');
    }

    try {
      const orderRes = await axios.post(`${config.serverUrl}/api/auth/create-order`, { 
        amount: rechargeAmount,
        phone: user.phone 
      });

      if (orderRes.data.payUrl) {
        window.open(orderRes.data.payUrl, '_blank');
        setToastMessage('Payment window opened. Please complete your payment.');
      } else {
        setToastMessage('Failed to initiate payment. Please try again.');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setToastMessage(error.response?.data?.msg || 'Failed to initiate payment');
      
      // Clear amount on error
      setAmount('');
    }
  };
    
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get appropriate badge class based on transaction type
  const getTransactionBadgeClass = (type) => {
    switch (type.toLowerCase()) {
      case 'recharge':
        return 'badge-success';
      case 'withdraw':
        return 'badge-warning';
      case 'earning':
        return 'badge-info';
      case 'purchase':
        return 'badge-primary';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'status-success';
      case 'processing':
        return 'status-processing';
      case 'approved':
        return 'status-success';
      case 'rejected':
        return 'status-failed';
      case 'pending':
        return 'status-pending';
      default:
        return 'status-pending';
    }
  };

  const getStatusMessage = (transaction) => {
    if (transaction.type === 'Withdraw') {
      switch (transaction.status.toLowerCase()) {
        case 'processing':
          return 'Your withdrawal request is being processed';
        case 'approved':
          return 'Withdrawal approved, money will be credited soon';
        case 'rejected':
          return transaction.description?.includes('Admin remarks') 
            ? transaction.description 
            : 'Withdrawal request rejected';
        case 'success':
          return 'Withdrawal successful';
        default:
          return transaction.description || transaction.status;
      }
    }
    return transaction.description || transaction.status;
  };

  // Conditional rendering for user
  if (!user) {
    return <p>Loading user data...</p>;
  }

  return (
    <div className="transactions-container">
      <h1>Transactions</h1>
      <div className="wallet-section">
        <p>
          Wallet Balance: ₹
{showWallet ? walletBalance : '******'}
          <button
            onClick={() => setShowWallet(!showWallet)}
            style={{
              marginLeft: 10,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {showWallet ? '👁️' : '🙈'}
          </button>
        </p>
        <div style={{ fontSize: 14, color: '#b71c1c', marginTop: 4 }}>
          <span>Earned: ₹{walletBreakdown.earnedInWallet.toFixed(2)}</span> | <span>Recharged: ₹{walletBreakdown.rechargedInWallet.toFixed(2)}</span>
        </div>
      </div>
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage('')}
        />
      )}
      <div className="tab-section">
        <button onClick={() => setActiveTab('Recharge')} className={activeTab === 'Recharge' ? 'active' : ''}>
          Recharge
        </button>
        <button onClick={() => setActiveTab('Withdraw')} className={activeTab === 'Withdraw' ? 'active' : ''}>
          Withdraw
        </button>
        <button onClick={() => setActiveTab('TransactionHistory')} className={activeTab === 'TransactionHistory' ? 'active' : ''}>
          Transaction History
        </button>
        <button onClick={() => setActiveTab('EarningStats')} className={activeTab === 'EarningStats' ? 'active' : ''}>
          Earning Stats
        </button>
      </div>
      {/* Bank Details Card */}
      {user?.bankInfo && user.bankInfo.accountNumber && user.bankInfo.ifscCode && user.bankInfo.realName ? (
        <div className="bank-details-card">
          <div className="bank-title">Your Bank Details</div>
          <div className="bank-row">
            <span className="bank-label">Account Holder:</span>
            <span className="bank-value">{user.bankInfo.realName}</span>
          </div>
          <div className="bank-row">
            <span className="bank-label">Account Number:</span>
            <span className="bank-value">{user.bankInfo.accountNumber}</span>
          </div>
          <div className="bank-row">
            <span className="bank-label">IFSC Code:</span>
            <span className="bank-value">{user.bankInfo.ifscCode}</span>
          </div>
        </div>
      ) : (
        <div className="bank-details-card" style={{color:'#b71c1c'}}>
          <div className="bank-title">Your Bank Details</div>
          <div>No bank details found. Please add your bank info in your profile.</div>
        </div>
      )}
      {activeTab === 'Recharge' && (
        <form onSubmit={handleRecharge}>
          <div className="fixed-amounts">
            <button type="button" onClick={() => setAmount(480)}>₹480</button>
            <button type="button" onClick={() => setAmount(500)}>₹500</button>
            <button type="button" onClick={() => setAmount(1000)}>₹1000</button>
            <button type="button" onClick={() => setAmount(2000)}>₹2000</button>
          </div>
                      <input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
                          />
                    <button type="submit">Recharge</button>
        </form>
      )}
      {activeTab === 'Withdraw' && (
        <div>
          
          <form className="transaction-form" onSubmit={async (e) => {
            e.preventDefault();
                        if (!user?.bankInfo || !user.bankInfo.accountNumber || !user.bankInfo.ifscCode || !user.bankInfo.realName) {
              setToastMessage('Bank details required for withdrawal. Redirecting to bank details section...');
              navigate('/profile', { state: { activeTab: 'BankInfo' } });
              return;
            }
            if (!amount) return setToastMessage('Please enter an amount');
            if (amount < 100) return setToastMessage('Withdraw amount must be at least ₹100');
            if (amount > walletBreakdown.earnedInWallet) return setToastMessage('You can only withdraw your earned amount.');
            const amountToUser = amount * 0.9;
            const withdrawalFee = amount * 0.1;
            setToastMessage(`You will be charged ₹${withdrawalFee.toFixed(2)} as withdrawal fee. You will receive ₹${amountToUser.toFixed(2)}.`);
            try {
              const response = await axios.post(`${config.serverUrl}/api/auth/transaction/withdraw`, {
                phone: user.phone,
                amount: amount,
                transactionPassword,
                bankInfo: user.bankInfo
              });
              if (response.status === 200) {
                const updatedUser = { ...user, wallet: response.data.wallet };
                updateUser(updatedUser);
                setWalletBalance(response.data.wallet);
                setToastMessage('Withdrawal request submitted! Your request is being processed.');
                setAmount('');
                setTransactionPassword('');
                fetchTransactions();
                            }
            } catch (error) {
              if (error.response?.status === 400) {
                if (error.response.data.missingBankDetails) {
                  setToastMessage('Please complete your bank details before withdrawing');
                  setTimeout(() => {
                    navigate('/profile', { state: { activeTab: 'BankInfo' } });
                  }, 2000);
                  return;
                }
                if (error.response.data.msg === 'Invalid transaction password') {
                  setToastMessage('Invalid transaction password');
                  return;
                }
                setToastMessage(error.response.data.msg || 'Withdrawal request failed');
              } else {
                setToastMessage('Failed to process withdraw');
}
            }
          }}>
                          <input
className="transaction-input"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={walletBreakdown.earnedInWallet}
              />
                          <input
className="transaction-input"
                type="password"
                placeholder="Enter transaction password"
                value={transactionPassword}
                onChange={(e) => setTransactionPassword(e.target.value)}
                              />
                        <button className="transaction-button" type="submit">Withdraw</button>
          </form>
        </div>
      )}
      {activeTab === 'TransactionHistory' && (
        <div className="transaction-history">
          <h2>Transaction History</h2>
          <div className="stats-cards-container">
            <div className="stats-card total-earned">
              <div className="stats-label">Total Earned</div>
              <div className="stats-value">₹{earningsStats.totalEarned.toFixed(2)}</div>
            </div>
            <div className="stats-card total-withdrawn">
              <div className="stats-label">Total Withdrawn</div>
              <div className="stats-value">₹{totalWithdrawn.toFixed(2)}</div>
            </div>
            <div className="stats-card withdrawable-amount">
              <div className="stats-label">Withdrawable Amount</div>
              <div className="stats-value">₹{walletBreakdown.earnedInWallet.toFixed(2)}</div>
            </div>
          </div>
          {isLoading ? (
            <p>Loading transactions...</p>
                    ) : (
<div>
              {transactions.length === 0 ? (
                <p>No transactions found</p>
              ) : (
                <div>
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <tr key={index} className={transaction.type === 'Withdraw' && transaction.status.toLowerCase() === 'processing' ? 'highlight' : ''}>
                    <td>{formatDate(transaction.date)}</td>
                    <td>
                      <span className={`badge ${getTransactionBadgeClass(transaction.type)}`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td>₹{transaction.amount.toFixed(2)}</td>
                    <td>
                      <span className={`status ${getStatusBadgeClass(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td>{getStatusMessage(transaction)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
              )}
            </div>
          )}
        </div>
      )}
      {activeTab === 'EarningStats' && (
        <div className="earning-stats">
          <h2>Earning Statistics</h2>
          <div className="stats-cards-container">
            <div className="stats-card total-earned">
              <div className="stats-label">Total Earned</div>
              <div className="stats-value">₹{earningsStats.totalEarned.toFixed(2)}</div>
            </div>
            <div className="stats-card today-earned">
              <div className="stats-label">Today's Earnings</div>
              <div className="stats-value">₹{earningsStats.todayEarned.toFixed(2)}</div>
            </div>
            <div className="stats-card yesterday-earned">
              <div className="stats-label">Yesterday's Earnings</div>
              <div className="stats-value">₹{earningsStats.yesterdayEarned.toFixed(2)}</div>
            </div>
            <div className="stats-card lastweek-earned">
              <div className="stats-label">Last Week's Earnings</div>
              <div className="stats-value">₹{earningsStats.lastWeekEarned.toFixed(2)}</div>
            </div>
          </div>
          <h3>Recent Earnings</h3>
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.filter(tx => tx.type === 'Earning').map((earning, idx) => (
                  <tr key={idx}>
                    <td>{formatDate(earning.date)}</td>
                    <td>₹{earning.amount.toFixed(2)}</td>
                    <td>{earning.description || 'Daily Income'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Transactions;