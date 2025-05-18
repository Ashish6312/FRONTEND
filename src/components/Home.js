import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useUser } from '../context/UserContext';
import io from 'socket.io-client';
import config from '../config/config';
import './Home.css';
import './Modal.css';
import Toast from './Toast';
import Carousel from 'react-multi-carousel';
import 'react-multi-carousel/lib/styles.css';
import Modal from 'react-modal';

const socket = io(`${config.serverUrl}`, {
  transports: ['websocket', 'polling']
});


const carouselImages = [
  '/images/carousel1.jpg',
  '/images/carousel2.jpg',
  '/images/carousel3.jpg'
];

function Home() {
  const navigate = useNavigate();
  const { user, updateUser } = useUser();
  const { addNotification, notifications, removeNotification } = useNotification();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('PlanA'); // Add activeTab state with default value
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Extract userId for useEffect dependency
  const userId = user?.id || user?._id;

  // Debug user state
  useEffect(() => {
    console.log('User state changed:', { userId, username: user?.username });
  }, [user, userId]);

  // Welcome modal logic
  useEffect(() => {
    if (!sessionStorage.getItem('welcomeModalShown') && user?.id) {
      console.log('Showing welcome modal for user:', user.id);
      setShowWelcomeModal(true);
      sessionStorage.setItem('welcomeModalShown', 'true');
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchPlans = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${config.serverUrl}/api/plans`);
        setPlans(res.data);
      } catch (err) {
        console.error('Failed to fetch plans:', err);
        setError('Failed to load plans. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [user, navigate]);

  // Socket connection and event listeners
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server with socket ID:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    const handleWalletUpdate = (data) => {
      console.log('Wallet update received:', data);

      if (user && (data.userId === user._id || data.userId === user.id)) {
        console.log('Updating wallet for current user');

        const updatedUser = { ...user, wallet: data.newWallet };
        updateUser(updatedUser);

        addNotification(`💰 Your wallet has been updated!`);
      }
    };

    socket.on('walletUpdated', handleWalletUpdate);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('walletUpdated', handleWalletUpdate);
    };
  }, [user, updateUser, addNotification]);

  const handleBuyPlan = async (plan) => {
    if (!user || !user.id) {
      navigate('/login');
      return;
    }

    try {
      const res = await axios.post(`${config.serverUrl}/api/purchases`, {
        userId: user.id,
        planId: plan._id,
        planType: plan.planType,
        price: plan.price,
        dailyIncome: plan.dailyIncome,
      });

      const updatedWallet = res.data.updatedWallet;
      const updatedUser = { ...user, wallet: updatedWallet };
      updateUser(updatedUser);

      addNotification(`✅ You purchased the ${plan.name} plan!`);

      // Add a small delay before redirecting to ensure the notification is seen
      setTimeout(() => {
        navigate('/investments');
      }, 1500);
    } catch (error) {
      console.error('Purchase failed:', error.response?.data || error.message);
      if (error.response?.data?.msg === 'Insufficient wallet balance') {
        addNotification('❌ Insufficient wallet balance. Please add more funds.');
      } else {
        addNotification('❌ Failed to purchase plan. Please try again.');
      }
    }
  };

  const handleRecharge = () => {
    navigate('/transactions', { state: { activeTab: 'recharge' } });
  };

  const handleWithdraw = () => {
    navigate('/transactions', { state: { activeTab: 'withdraw' } });
  };

  const calculatePlanMetrics = (plan) => {
    return {
      yearlyIncome: plan.dailyIncome * (plan.duration || 365)
    };
  };

  return (
    <div className="home">
      {showWelcomeModal && (
        <Modal
          isOpen={showWelcomeModal}
          onRequestClose={() => setShowWelcomeModal(false)}
          className="welcome-modal"
          overlayClassName="welcome-modal-overlay"
          closeTimeoutMS={200}
          ariaHideApp={false}
        >
          <div style={{ textAlign: 'center', padding: 24 }}>
            <img src="\logo.svg" alt="Logo" style={{ width: 120, marginBottom: 16 }} />
            <h2>Welcome to EarnEase</h2>
            <p style={{ fontWeight: 500, margin: '12px 0' }}>
               <span style={{ color: '#e53935', fontWeight: 700 }}>Earn Much Profit 🎊🎉
 </span> <br/>
              10% Tax on each withdrawal<br/>
              Minimum withdrawal <span style={{ color: '#e53935', fontWeight: 700 }}>₹150</span><br/>
              Minimum deposit <span style={{ color: '#e53935', fontWeight: 700 }}>₹480</span><br/>
              Invitation bonus up to <span style={{ color: '#e53935', fontWeight: 700 }}>30%</span><br/>
              <br/>
              <b>Level 1 = 25%</b><br/>
              <b>Level 2 = 3%</b><br/>
              <b>Level 3 = 2%</b>
            </p>
            <button onClick={() => setShowWelcomeModal(false)} style={{ marginTop: 16, padding: '10px 32px', background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Close</button>
          </div>
        </Modal>
      )}

      <h2 className="home-username">Welcome, {user?.username || 'Guest'}!</h2>

      {/* Carousel Section */}
      <div className="carousel-section" style={{ margin: '20px 0' }}>
        <Carousel
          additionalTransfrom={0}
          arrows
          autoPlay
          autoPlaySpeed={3000}
          centerMode={false}
          className=""
          containerClass="carousel-container"
          dotListClass=""
          draggable
          focusOnSelect={false}
          infinite
          itemClass=""
          keyBoardControl
          minimumTouchDrag={80}
          renderButtonGroupOutside={false}
          renderDotsOutside={false}
          responsive={{
            desktop: { breakpoint: { max: 3000, min: 1024 }, items: 1 },
            tablet: { breakpoint: { max: 1024, min: 464 }, items: 1 },
            mobile: { breakpoint: { max: 464, min: 0 }, items: 1 }
          }}
          showDots
          sliderClass=""
          slidesToSlide={1}
          swipeable
        >
          {carouselImages.map((img, idx) => (
            <div key={idx} style={{ width: '100%', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
              <img src={img} alt={`carousel-${idx}`} style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 12, objectFit: 'cover' }} />
            </div>
          ))}
        </Carousel>
      </div>

      <div className="wallet-section">
        <p>
          Wallet Balance: ₹{user?.wallet || 0}
        </p>
        <div className="wallet-actions">
          <button className="action-button recharge" onClick={handleRecharge}>
            <span className="icon">💰</span>
            Recharge
          </button>
          <button className="action-button withdraw" onClick={handleWithdraw}>
            <span className="icon">💸</span>
            Withdraw
          </button>
        </div>
      </div>

      {loading && <p>Loading plans...</p>}
      {error && <p className="error">{error}</p>}

      <div className="options-section">
        <button onClick={() => window.open("https://t.me/+UgBu843A-21iZTU1")}>Telegram</button>
        <button onClick={() => window.open("https://t.me/ONE_PLUS_CS")}>Contact</button>
      </div>

      <div className="tab-section">
        <button
          onClick={() => setActiveTab('PlanA')}
          className={`tab-button ${activeTab === 'PlanA' ? 'active' : ''}`}
        >
          Plan A
        </button>
        <button
          onClick={() => setActiveTab('Welfare')}
          className={`tab-button ${activeTab === 'Welfare' ? 'active' : ''}`}
        >
          Welfare Plan
        </button>
      </div>

      <div className="plans-section">
        {plans.filter((plan) => plan.planType === activeTab).length > 0 ? (
          plans
            .filter((plan) => plan.planType === activeTab)
            .map((plan) => {
              const metrics = calculatePlanMetrics(plan);
              return (
                <div key={plan._id} className="plan-card">
                  {plan.image && (
                    <img
                      src={`${config.serverUrl}${plan.image}`}
                      alt={plan.name}
                      style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                    />
                  )}
                  <h3>{plan.name}</h3>
                  <p className="price">Investment: ₹{plan.price}</p>
                  <p className="daily-income">Daily Income: ₹{plan.dailyIncome}</p>
                  <div className="plan-metrics">
                    <p className="duration">Duration: {plan.duration || 365} days</p>
                    <p className="total-income">Total Income: ₹{metrics.yearlyIncome}</p>
                  </div>
                  <button onClick={() => handleBuyPlan(plan)}>Buy Now</button>
                </div>
              );
            })
        ) : (
          <p>No plans available in this category.</p>
        )}
      </div>

      {/* Render Toast notifications */}
      <div className="toast-container">
        {notifications.map((notif) => (
          <Toast
            key={notif.id}
            message={notif.message}
            onClose={() => removeNotification(notif.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default Home;
