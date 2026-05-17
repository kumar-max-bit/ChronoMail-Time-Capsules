import React, { useState, useEffect } from 'react';
import apiService from './apiService.js';
import { formatBytes, timeAgo } from './utils.js';
import { toast } from 'react-hot-toast';
import { SettingToggleCard, SettingInputCard } from './SettingCards.jsx';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ totalUsers: 0, activeCapsules: 0, pendingDelivery: 0, deliverySuccessRate: 0, openRate: 0, totalStorageBytes: 0 });
  const [users, setUsers] = useState([]);
  const [capsules, setCapsules] = useState([]);
  const [settings, setSettings] = useState({ allowNewRegistrations: true, maxAttachmentSizeMB: 10, maintenanceMode: false, requireEmailVerification: true, maxCapsulesPerUser: 50, maxRecipientsPerCapsule: 10, maxAdmins: 1 });
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminKey, setAdminKey] = useState('');

  useEffect(() => {
    if (user?.isAdmin) {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [
        statsData,
        usersData,
        capsulesData,
        settingsData,
        activityData,
      ] = await Promise.all([
        apiService.getAdminStats(user.token),
        apiService.getAdminUsers(user.token),
        apiService.getAdminCapsules(user.token),
        apiService.getAdminSettings(user.token),
        apiService.getAdminActivity(user.token),
      ]);

      setStats(statsData);
      setUsers(usersData);
      setCapsules(capsulesData);
      setSettings(settingsData);
      setActivities(activityData);
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user and all their capsules? This cannot be undone.")) return;
    try {
      await apiService.deleteAdminUser(id, user.token);
      setUsers(users.filter(u => u._id !== id));
      toast.success('User deleted successfully.');
    } catch (e) { 
      toast.error('Failed to delete user: ' + e.message);
    }
  };

  const handleDeleteCapsule = async (id) => {
    if (!window.confirm("Are you sure you want to delete this capsule?")) return;
    try {
      await apiService.deleteAdminCapsule(id, user.token);
      setCapsules(capsules.filter(c => c._id !== id));
      toast.success('Capsule deleted successfully.');
    } catch (e) {
      toast.error('Failed to delete capsule: ' + e.message);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await apiService.updateAdminSettings(settings, user.token);
      setSettings(res.settings);
      toast.success('Settings updated successfully!');
    } catch (err) {
      toast.error('Failed to update settings: ' + err.message);
    }
  };

  const latestSystem = activities.find(a => a.type === 'system');
  const latestCapsule = activities.find(a => a.type === 'capsule');
  const latestAuth = activities.find(a => a.type === 'auth');
  const latestSecurity = activities.find(a => a.type === 'security');

  if (!user?.isAdmin) {
    return (
      <div className="glass-card empty-state" style={{ marginTop: '20px' }}>
        <div className="empty-icon" style={{ color: 'var(--error)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        </div>
        <h3>Admin Authentication Required</h3>
        <p>You must provide the secret key to gain administrator privileges.</p>
        {user ? (
          <div className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
            <input 
              type="password" 
              placeholder="Enter Admin Key" 
              value={adminKey} 
              onChange={(e) => setAdminKey(e.target.value)}
              style={{ padding: '12px', borderRadius: '8px', border: '2px solid #6366f1', background: '#ffffff', color: '#000000', outline: 'none', width: '250px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}
            />
            <button className="btn btn-primary" onClick={async () => {
               try {
                 const data = await apiService.request('/api/admin/promote', 'POST', { adminKey }, user.token);
                 if (data.error) throw new Error(data.error);
                 const updatedUser = { ...user, token: data.token, isAdmin: true };
                 localStorage.setItem('tcUser', JSON.stringify(updatedUser));
                 window.location.reload();
               } catch(e) { toast.error(e.message || "Invalid Key"); }
            }}>
              Authenticate 
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
            </button>
          </div>
        ) : (
          <p className="mt-4" style={{ color: '#f59e0b' }}>Please login first to request admin access.</p>
        )}
      </div>
    );
  }

  return (
    <section className="admin-section" style={{ marginTop: '20px' }}>
      <div className="dashboard-header" style={{ marginBottom: '30px', textAlign: 'center' }}>
        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '15px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
          System Administration
        </span>
        <h2 style={{ fontSize: '2rem', background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '10px', fontWeight: '700' }}>Admin Control Panel</h2>
        <p style={{ color: '#cbd5e1' }}>Manage users, monitor time capsules, and configure system settings.</p>
      </div>

      <div className="admin-layout" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {/* Sidebar */}
        <div className="glass-card admin-sidebar" style={{ flex: '1 1 200px', padding: '20px', height: 'fit-content' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li><button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline-slate'} full-width`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => setActiveTab('overview')}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg> Overview</button></li>
            <li><button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline-slate'} full-width`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => setActiveTab('users')}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Users</button></li>
            <li><button className={`btn ${activeTab === 'capsules' ? 'btn-primary' : 'btn-outline-slate'} full-width`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => setActiveTab('capsules')}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> All Capsules</button></li>
            <li><button className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-outline-slate'} full-width`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => setActiveTab('settings')}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> System Settings</button></li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="glass-card admin-content" style={{ flex: '3 1 400px', padding: '30px' }}>
          {activeTab === 'overview' && !isLoading && (
            <div className="fade-in">
              <h3 style={{ marginBottom: '20px' }}>System Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '15px' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#6366f1', marginBottom: '5px' }}>{stats.totalUsers}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Total Users</div>
                </div>
                <div style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '5px' }}>{stats.activeCapsules}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Active Capsules</div>
                </div>
                <div style={{ background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ec4899', marginBottom: '5px' }}>{stats.pendingDelivery}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Pending Delivery</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '5px' }}>{stats.deliverySuccessRate}%</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Delivery Success</div>
                </div>
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '5px' }}>{stats.openRate}%</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Email Open Rate</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '5px' }}>{formatBytes(stats.totalStorageBytes)}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Media Storage Used</div>
                </div>
              </div>
              
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '20px' }}>
                  <h5 style={{ color: '#3b82f6', marginTop: 0, marginBottom: '15px', fontSize: '1.05rem' }}>Recent System Activity</h5>
                  <ul style={{ color: 'var(--text-main)', lineHeight: '1.8', margin: 0, paddingLeft: '0', listStyle: 'none', fontSize: '0.95rem' }}>
                    <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#10b981', display: 'flex' }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
                      <div><strong>System:</strong> {latestSystem ? <>{latestSystem.action} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({timeAgo(latestSystem.createdAt)})</span></> : <span style={{ color: 'var(--text-muted)' }}>No recent system events.</span>}</div>
                    </li>
                    <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#3b82f6', display: 'flex' }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg></span>
                      <div><strong>Background Job:</strong> {latestCapsule ? <>{latestCapsule.action} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({timeAgo(latestCapsule.createdAt)})</span></> : <span style={{ color: 'var(--text-muted)' }}>No recent background jobs.</span>}</div>
                    </li>
                    <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#6366f1', display: 'flex' }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                      <div><strong>Auth:</strong> {latestAuth ? <>{latestAuth.action} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({timeAgo(latestAuth.createdAt)})</span></> : <span style={{ color: 'var(--text-muted)' }}>No recent auth events.</span>}</div>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#f59e0b', display: 'flex' }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                      <div><strong>Security:</strong> {latestSecurity ? <>{latestSecurity.action} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({timeAgo(latestSecurity.createdAt)})</span></> : <span style={{ color: 'var(--text-muted)' }}>No recent security alerts.</span>}</div>
                    </li>
                  </ul>
                </div>
            </div>
          )}
          
          {activeTab === 'users' && !isLoading && (
            <div className="fade-in">
              <h3 style={{ marginBottom: '20px' }}>Manage Users</h3>
              <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                      <th style={{ padding: '12px 15px', color: '#cbd5e1' }}>Name</th>
                      <th style={{ padding: '12px 15px', color: '#cbd5e1' }}>Email</th>
                      <th style={{ padding: '12px 15px', color: '#cbd5e1' }}>Status</th>
                      <th style={{ padding: '12px 15px', color: '#cbd5e1' }}>Role</th>
                      <th style={{ padding: '12px 15px', color: '#cbd5e1', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '12px 15px' }}>{u.name}</td>
                        <td style={{ padding: '12px 15px' }}>{u.email}</td>
                        <td style={{ padding: '12px 15px' }}>{u.isVerified ? 'Verified' : 'Pending'}</td>
                        <td style={{ padding: '12px 15px' }}>{u.isAdmin ? 'Admin' : 'User'}</td>
                        <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                          <button className="btn btn-outline-slate delete-btn" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDeleteUser(u._id)} disabled={u._id === user._id}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'capsules' && !isLoading && (
             <div className="fade-in">
               <h3 style={{ marginBottom: '20px' }}>Global Capsule Repository</h3>
               <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                 <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                   <thead>
                     <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                      <th style={{ padding: '12px 15px', color: '#cbd5e1' }}>Sender</th>
                      <th style={{ padding: '12px 15px', color: '#cbd5e1' }}>Recipients</th>
                      <th style={{ padding: '12px 15px', color: '#cbd5e1' }}>Delivery Date</th>
                      <th style={{ padding: '12px 15px', color: '#cbd5e1' }}>Status</th>
                      <th style={{ padding: '12px 15px', color: '#cbd5e1', textAlign: 'right' }}>Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {capsules.map(c => (
                       <tr key={c._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                         <td style={{ padding: '12px 15px' }}>{c.userId?.email || 'Unknown'}</td>
                         <td style={{ padding: '12px 15px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.recipients}>{c.recipients}</td>
                         <td style={{ padding: '12px 15px' }}>{new Date(c.date).toLocaleDateString()}</td>
                         <td style={{ padding: '12px 15px' }}>{c.sent ? 'Sent' : 'Pending'}</td>
                         <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                           <button className="btn btn-outline-slate delete-btn" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDeleteCapsule(c._id)}>
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Delete
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          )}

          {activeTab === 'settings' && !isLoading && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ margin: 0 }}>System Settings</h3>
                <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.2)' }}>Admin Configuration</span>
              </div>
              
              <form onSubmit={handleUpdateSettings}>
                <SettingToggleCard
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                  title="Allow New Registrations"
                  description="Enable or disable public sign-ups across the entire application. Existing users will still be able to log in."
                  checked={settings.allowNewRegistrations}
                  onChange={(e) => setSettings({ ...settings, allowNewRegistrations: e.target.checked })}
                />
                <SettingInputCard
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>}
                  title="Max Attachment Size"
                  description="Limits the file size users can upload for a single capsule. Higher limits will increase server storage costs."
                  value={settings.maxAttachmentSizeMB}
                  onChange={(e) => setSettings({ ...settings, maxAttachmentSizeMB: Number(e.target.value) })}
                  unit="MB"
                  min="1"
                  max="1000"
                />
                <SettingToggleCard
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>}
                  title="Maintenance Mode"
                  description="Temporarily disable access to the application for all non-admin users. Useful during upgrades."
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  color="error"
                />
                <SettingToggleCard
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>}
                  title="Require Email Verification"
                  description="Force new users to verify their email address via OTP before they can log in."
                  checked={settings.requireEmailVerification}
                  onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                />
                <SettingInputCard
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>}
                  title="Max Capsules Per User"
                  description="Limits the total number of capsules a single user can create to prevent database abuse."
                  value={settings.maxCapsulesPerUser}
                  onChange={(e) => setSettings({ ...settings, maxCapsulesPerUser: Number(e.target.value) })}
                  min="1"
                  max="10000"
                />
                <SettingInputCard
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                  title="Max Recipients Per Capsule"
                  description="Limits how many email addresses a user can send a single capsule to. Helps prevent spamming."
                  value={settings.maxRecipientsPerCapsule}
                  onChange={(e) => setSettings({ ...settings, maxRecipientsPerCapsule: Number(e.target.value) })}
                  min="1"
                  max="1000"
                />
                <SettingInputCard
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>}
                  title="Max Administrators"
                  description="Limits the maximum number of users that can upgrade their accounts to Administrator status using the secret key."
                  value={settings.maxAdmins}
                  onChange={(e) => setSettings({ ...settings, maxAdmins: Number(e.target.value) })}
                  min="1"
                  max="100"
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '12px 30px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {isLoading && <div style={{ textAlign: 'center', padding: '40px', color: '#cbd5e1' }}>⏳ Loading system data...</div>}
        </div>
      </div>
    </section>
  );
}