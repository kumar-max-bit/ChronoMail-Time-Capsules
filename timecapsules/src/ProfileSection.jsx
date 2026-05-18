import React, { useState, useRef } from 'react';

export default function ProfileSection({ user, onLogout, onPhotoUpload, onPhotoRemove, onScheduledClick }) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const fileInputRef = useRef(null);

  const handleEditClick = () => {
    setShowPhotoModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveClick = () => {
    setShowPhotoModal(false);
    onPhotoRemove();
  };

  return (
    <>
      <section className="top-profile-container glass-card">
        <div className="profile-details">
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div className="profile-avatar" style={{ cursor: 'pointer', background: user?.profilePhoto ? `url(${user.profilePhoto}) center/cover` : 'linear-gradient(135deg, #6366f1, #a855f7)' }} title="Manage photo" onClick={() => setShowPhotoModal(true)}>
              {!user?.profilePhoto && (user?.name ? user.name.charAt(0).toUpperCase() : '👤')}
              {isUploadingPhoto && <div className="spinner"></div>} {/* Loading spinner */}
              <input type="file" ref={fileInputRef} accept="image/*" hidden onChange={async (e) => { setIsUploadingPhoto(true); await onPhotoUpload(e); setIsUploadingPhoto(false); }} disabled={isUploadingPhoto} />
              <div className="avatar-overlay">
                <span className="avatar-overlay-icon">📷</span>
              </div>
            </div>
          </div>
          <div className="profile-info">
            <h3 className="greeting">Welcome, {user?.name || 'Time Traveler'}!</h3>
            <p className="email">{user?.email}</p>
          </div>
        </div>
        <div className="profile-actions">
          <button className="btn btn-primary" onClick={onScheduledClick}>⏱️ Scheduled Messages</button>
          <button className="btn btn-outline-slate" onClick={onLogout}>Logout</button>
          {!user?.isAdmin && (
            <button className="btn btn-outline-slate" onClick={() => window.location.hash = '#admin'} title="Upgrade to Administrator">🔑 Admin Access</button>
          )}
        </div>
      </section>

      {showPhotoModal && (
        <div role="dialog" className="modal-overlay" onClick={() => setShowPhotoModal(false)} style={{ zIndex: 1000, backdropFilter: 'blur(10px)', backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px', padding: '32px 24px', textAlign: 'center', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.15)', background: 'rgba(255, 255, 255, 0.95)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button className="close-btn" onClick={() => setShowPhotoModal(false)} style={{ top: '16px', right: '20px', color: '#94a3b8', fontSize: '1.6rem', transition: 'color 0.2s' }}>&times;</button>
            <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '1.3rem', fontWeight: '700', color: '#1e293b' }}>Manage Profile Photo</h3>
            <p style={{ margin: '0 0 28px 0', fontSize: '0.9rem', color: '#64748b' }}>Customize your chronological time traveler identity</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
              <div style={{ position: 'relative', display: 'inline-block', padding: '6px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #a855f7)', boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)' }}>
                <div style={{ width: '110px', height: '110px', borderRadius: '50%', border: '4px solid #fff', background: user?.profilePhoto ? `url(${user.profilePhoto}) center/cover` : 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.8rem', color: '#64748b', overflow: 'hidden' }}>
                  {!user?.profilePhoto && (user?.name ? user.name.charAt(0).toUpperCase() : '👤')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <button className="btn btn-primary" onClick={handleEditClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontWeight: '600', borderRadius: '12px', width: '100%', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)', transition: 'all 0.2s' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                Upload New Photo
              </button>
              
              {user?.profilePhoto && (
                <button className="btn" onClick={handleRemoveClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontWeight: '600', borderRadius: '12px', width: '100%', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.04)', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  Remove Photo
                </button>
              )}
              
              <button onClick={() => setShowPhotoModal(false)} style={{ marginTop: '8px', padding: '10px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#1e293b'} onMouseLeave={(e) => e.target.style.color = '#64748b'}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}