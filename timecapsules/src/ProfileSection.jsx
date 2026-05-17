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
        <div role="dialog" className="modal-overlay" onClick={() => setShowPhotoModal(false)} style={{ zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px', padding: '30px 20px', textAlign: 'center' }}>
            <button className="close-btn" onClick={() => setShowPhotoModal(false)}>&times;</button>
            <h3 style={{ marginTop: 0, marginBottom: '25px', fontSize: '1.25rem', fontWeight: '600' }}>Profile Photo</h3>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '25px' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid rgba(255, 255, 255, 0.1)', background: user?.profilePhoto ? `url(${user.profilePhoto}) center/cover` : 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: '#fff', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }}>
                {!user?.profilePhoto && (user?.name ? user.name.charAt(0).toUpperCase() : '👤')}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button className="btn btn-primary" onClick={handleEditClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', fontWeight: '600', borderRadius: '10px' }}>
                Upload New Photo
              </button>
              {user?.profilePhoto && (
                <button className="btn btn-outline-slate" onClick={handleRemoveClick} style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', fontWeight: '600', borderRadius: '10px' }}>
                  Remove Photo
                </button>
              )}
              <button onClick={() => setShowPhotoModal(false)} style={{ marginTop: '5px', padding: '10px', background: 'transparent', border: 'none', color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer', fontWeight: '500', fontSize: '0.95rem' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}