import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import Toast from './Toast';
import './Invite.css';
import config from '../config/config';

function Invite() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [teamData, setTeamData] = useState({ referrals: [], stats: null });
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    // Fetch referrals and calculate new referral earnings logic
    const fetchTeamAndStats = async () => {
      if (user?.inviteCode) {
        try {
          setLoading(true);
          // Fetch all referrals (team)
          const referralsRes = await axios.get(`${config.serverUrl}/api/auth/profile/referrals/${user.inviteCode}`);
          const referrals = referralsRes.data.referrals || [];

          // Fetch the user's current referral earnings
          const earningsRes = await axios.get(`${config.serverUrl}/api/auth/referral-earnings/${user.phone}`);
          const referralEarnings = earningsRes.data.totalEarnings || 0;

          // Build referral stats for each level
          let totalReferrals = 0;
          let levelStats = {
            level1: { count: 0, earnings: 0 },
            level2: { count: 0, earnings: 0 },
            level3: { count: 0, earnings: 0 }
          };

          // For each referral, check their level
          for (const member of referrals) {
            const level = member.level;
            if (![1,2,3].includes(level)) continue;
            levelStats[`level${level}`].count++;
            totalReferrals++;
            
            // Get earnings for this member from their transactions
            const referralTransactions = await axios.get(`${config.serverUrl}/api/auth/referral-transactions/${user.phone}/${member.phone}`);
            member.earnings = referralTransactions.data.totalEarnings || 0;
            levelStats[`level${level}`].earnings += member.earnings;
          }

          setTeamData({
            referrals,
            stats: {
              totalReferralEarnings: referralEarnings,
              totalReferrals,
              level1: levelStats.level1,
              level2: levelStats.level2,
              level3: levelStats.level3
            }
          });
        } catch (err) {
          setToastMessage('Failed to load team data. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTeamAndStats();
  }, [user, navigate]);
  
  if (!user) {
    return <div className="invite-container">Please log in to view your invite page.</div>;
  }

  const inviteLink = `${window.location.origin}/register?ref=${user.inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setToastMessage('✅ Invite link copied to clipboard!');
  };

  return (
    <div className="invite-container">
      <div className="invite-card">
        <h1>🎉 Invite Friends</h1>
        <p className="invite-description">
          Share your invite link and earn rewards when friends join your team!
        </p>

        <div className="invite-link-section">
          <input type="text" value={inviteLink} readOnly className="invite-link-input" />
          <div className="invite-actions">
            <button onClick={handleCopy} className="invite-button">📋 Copy</button>
            <button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(inviteLink)}`, '_blank')}
              className="invite-button whatsapp"
            >
              📤 WhatsApp
            </button>
          </div>
        </div>
      </div>      {loading ? (
        <div className="loading">Loading team data...</div>
      ) : (
        <>
          <div className="stats-section">
            <h2>📊 Referral Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card total">
                <h3>Total Referral Earnings</h3>
                <p>₹{teamData.stats?.totalReferralEarnings?.toFixed(2) || 0}</p>
                <small>{teamData.stats?.totalReferrals || 0} Total Referrals</small>
              </div>
              <div className="stat-card level-1">
                <h3>Level 1 (Direct)</h3>
                <p>₹{teamData.stats?.level1?.earnings?.toFixed(2) || 0}</p>
                <small>{teamData.stats?.level1?.count || 0} Members • 25% of each member's successful recharge</small>
              </div>
              <div className="stat-card level-2">
                <h3>Level 2</h3>
                <p>₹{teamData.stats?.level2?.earnings?.toFixed(2) || 0}</p>
                <small>{teamData.stats?.level2?.count || 0} Members • 3% of each member's successful recharge</small>
              </div>
              <div className="stat-card level-3">
                <h3>Level 3</h3>
                <p>₹{teamData.stats?.level3?.earnings?.toFixed(2) || 0}</p>
                <small>{teamData.stats?.level3?.count || 0} Members • 2% of each member's successful recharge</small>
              </div>
            </div>
      </div>

      <div className="team-section">
        <h2>👥 Your Team Members</h2>
            {teamData.referrals.length > 0 ? (
              <div className="level-tabs">
                {[1, 2, 3].map(level => {
                  const levelMembers = teamData.referrals.filter(member => member.level === level);
                  if (levelMembers.length === 0) return null;
                    return (
                    <div key={level} className={`level-tab level-${level}`}>
                      <h3>Level {level} Members</h3>
          <ul className="team-list">
                        {levelMembers.map((member) => (
              <li key={member._id} className="team-member">
                <div className="member-info">
                              <span className="member-username">
                                <strong>🧑 {member.username}</strong>
                              </span>
                              <span className="member-phone">📱 {member.phone}</span>
                              <span className="member-joined">
                                🗓️ Joined {new Date(member.joinedAt).toLocaleDateString()}
                              </span>
                              <span className="member-earnings">
                                💰 Earned you ₹{member.earnings}
                              </span>
                </div>
              </li>
            ))}
          </ul>
                    </div>
                  );
                })}
              </div>
        ) : (
              <p className="no-members">You have no team members yet. Share your invite code to start earning!</p>
        )}
      </div>
        </>
      )}

      {/* Toast Notification */}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}

export default Invite;
