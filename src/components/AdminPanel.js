import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import config from '../config/config';
import './AdminPanel.css';

const AdminPanel = () => {
  const [plans, setPlans] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [successfulWithdrawals, setSuccessfulWithdrawals] = useState([]);
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' or 'withdrawals'
  const [form, setForm] = useState({
    name: '',
    price: '',
    dailyIncome: '',
    planType: 'PlanA',
    image: null
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const checkToken = () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        return JSON.parse(jsonPayload);
      } catch (e) {
        console.error('Error decoding token:', e);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
    } else {
      const payload = checkToken();
      if (!payload || payload.role !== 'admin') {
        localStorage.removeItem('adminToken');
        setMessage('Invalid admin token. Please log in again.');
        navigate('/admin/login');
      } else {
        fetchPlans(token);
        fetchPendingWithdrawals();
        fetchSuccessfulWithdrawals();
      }
    }
  }, [navigate]);

  const fetchPlans = async (token) => {
    try {
      const res = await axios.get(`${config.serverUrl}/api/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(res.data);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setMessage('Failed to fetch plans. Please try again.');
    }
  };

  const fetchPendingWithdrawals = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${config.serverUrl}/api/auth/admin/withdrawals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingWithdrawals(response.data);
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
      setMessage('Failed to fetch pending withdrawals');
    }
  };

  const fetchSuccessfulWithdrawals = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${config.serverUrl}/api/auth/admin/withdrawals/successful`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessfulWithdrawals(response.data);
    } catch (error) {
      console.error('Failed to fetch successful withdrawals:', error);
      setMessage('Failed to load successful withdrawals');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setForm({ ...form, image: file });

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setMessage('No authentication token found. Please log in again.');
        navigate('/admin/login');
        return;
      }

      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('price', form.price);
      formData.append('dailyIncome', form.dailyIncome);
      formData.append('planType', form.planType);
      if (form.image) {
        formData.append('image', form.image);
      }      const axiosConfig = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      };      if (editingPlan) {
        await axios.put(`${config.serverUrl}/api/plans/${editingPlan._id}`, formData, axiosConfig);
        setMessage('Plan updated successfully!');
      } else {
        await axios.post(`${config.serverUrl}/api/plans`, formData, axiosConfig);
        setMessage('Plan added successfully!');
      }

      setForm({ name: '', price: '', dailyIncome: '', planType: 'PlanA', image: null });
      setPreviewImage(null);
      setEditingPlan(null);
      fetchPlans(token);
    } catch (err) {
      console.error('Failed to save plan:', err);
      if (err.response) {
        if (err.response.status === 403 || err.response.status === 401) {
          setMessage('Unauthorized. Please log in again.');
          localStorage.removeItem('adminToken');
          navigate('/admin/login');
        } else {
          setMessage(`Failed to save plan: ${err.response.data.message || 'Try again.'}`);
        }
      } else {
        setMessage('Network error. Please try again.');
      }
    }
  };

  const handleEdit = (plan) => {
    setForm({
      name: plan.name,
      price: plan.price,
      dailyIncome: plan.dailyIncome,
      planType: plan.planType,
      image: null
    });    setEditingPlan(plan);
    setPreviewImage(plan.image ? `${config.serverUrl}${plan.image}` : null);
    setMessage('');
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${config.serverUrl}/api/plans/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Plan deleted successfully!');
      fetchPlans(token);
    } catch (err) {
      console.error('Failed to delete plan:', err);
      setMessage('Failed to delete plan. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const handleWithdrawalAction = async (transactionId, status, remarks = '') => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`${config.serverUrl}/api/auth/admin/withdrawal/${transactionId}/update-status`, 
        { status, remarks },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setMessage(`Withdrawal ${status.toLowerCase()} successfully`);
      fetchPendingWithdrawals(); // Refresh the list
    } catch (error) {
      console.error('Failed to update withdrawal:', error);
      setMessage('Failed to update withdrawal status');
    }
  };

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>

      {message && <p className="message">{message}</p>}

      <button className="logout-button" onClick={handleLogout}>Logout</button>

      <div className="admin-tabs">
        <button 
          onClick={() => setActiveTab('plans')}
          className={activeTab === 'plans' ? 'active' : ''}
        >
          Manage Plans
        </button>
        <button 
          onClick={() => setActiveTab('withdrawals')}
          className={activeTab === 'withdrawals' ? 'active' : ''}
        >
          Pending Withdrawals
        </button>
        <button 
          onClick={() => setActiveTab('successful-withdrawals')}
          className={activeTab === 'successful-withdrawals' ? 'active' : ''}
        >
          Successful Withdrawals
        </button>
      </div>

      {activeTab === 'plans' ? (
        <>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <input
              type="text"
              placeholder="Plan Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Daily Income"
              value={form.dailyIncome}
              onChange={(e) => setForm({ ...form, dailyIncome: e.target.value })}
              required
            />
            <select
              value={form.planType}
              onChange={(e) => setForm({ ...form, planType: e.target.value })}
            >
              <option value="PlanA">Plan A</option>
              <option value="Welfare">Welfare</option>
            </select>

            <input type="file" accept="image/*" onChange={handleImageChange} />

            {previewImage && (
              <img src={previewImage} alt="Preview" style={{ width: '100px', margin: '10px 0' }} />
            )}

            <button type="submit">{editingPlan ? 'Update Plan' : 'Add Plan'}</button>
          </form>

          <div className="plan-list">
            {plans.map((plan) => (
              <div key={plan._id} className="plan-item">
                <h4>{plan.name}</h4>
                <p>Price: ₹{plan.price}</p>
                <p>Daily Income: ₹{plan.dailyIncome}</p>
                <p>Type: {plan.planType}</p>            {plan.image && (
                  <img
                    src={`${config.serverUrl}${plan.image}`}
                    alt={plan.name}
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                  />
                )}
                <button onClick={() => handleEdit(plan)}>Edit</button>
                <button onClick={() => handleDelete(plan._id)}>Delete</button>
              </div>
            ))}
          </div>
        </>
      ) : activeTab === 'withdrawals' ? (
        <div className="withdrawal-requests">
          <h3>Pending Withdrawal Requests</h3>
          {pendingWithdrawals.length === 0 ? (
            <p>No pending withdrawal requests</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Amount</th>
                  <th>Final Amount</th>
                  <th>Date</th>
                  <th>Bank Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingWithdrawals.map(withdrawal => (
                  <tr key={withdrawal._id}>
                    <td>{withdrawal.phone}</td>
                    <td>₹{withdrawal.amount}</td>
                    <td>₹{withdrawal.finalAmount !== undefined && withdrawal.finalAmount !== null ? withdrawal.finalAmount : (withdrawal.amount ? (withdrawal.amount * 0.9).toFixed(2) : '-')}</td>
                    <td>{new Date(withdrawal.date).toLocaleString()}</td>
                    <td>
                      <div style={{fontSize: '0.95em'}}>
                        <div><strong>Name:</strong> {withdrawal.bankInfo?.realName || '-'}</div>
                        <div><strong>Account:</strong> {withdrawal.bankInfo?.accountNumber || '-'}</div>
                        <div><strong>IFSC:</strong> {withdrawal.bankInfo?.ifscCode || '-'}</div>
                      </div>
                    </td>
                    <td className="withdrawal-actions">
                      <button 
                        onClick={() => handleWithdrawalAction(withdrawal._id, 'Approved')}
                        className="approve-btn"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleWithdrawalAction(withdrawal._id, 'Rejected')}
                        className="reject-btn"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="successful-withdrawals">
          <h3>Successful Withdrawals</h3>
          {successfulWithdrawals.length === 0 ? (
            <p>No successful withdrawals</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Amount</th>
                  <th>Final Amount</th>
                  <th>Date</th>
                  <th>Bank Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {successfulWithdrawals.map(withdrawal => (
                  <tr key={withdrawal._id}>
                    <td>{withdrawal.phone}</td>
                    <td>₹{withdrawal.amount}</td>
                    <td>₹{withdrawal.finalAmount !== undefined && withdrawal.finalAmount !== null ? withdrawal.finalAmount : (withdrawal.amount ? (withdrawal.amount * 0.9).toFixed(2) : '-')}</td>
                    <td>{new Date(withdrawal.date).toLocaleString()}</td>
                    <td>
                      <div style={{fontSize: '0.95em'}}>
                        <div><strong>Name:</strong> {withdrawal.bankInfo?.realName || '-'}</div>
                        <div><strong>Account:</strong> {withdrawal.bankInfo?.accountNumber || '-'}</div>
                        <div><strong>IFSC:</strong> {withdrawal.bankInfo?.ifscCode || '-'}</div>
                      </div>
                    </td>
                    <td>
                      <span className="success-status">Success</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
