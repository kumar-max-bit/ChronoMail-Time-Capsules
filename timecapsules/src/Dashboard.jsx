import React from 'react';
import CapsuleCard from './CapsuleCard.jsx';

export default function Dashboard({
  user,
  capsules,
  filter,
  setFilter,
  displayedCapsules,
  isLoadingCapsules,
  onDelete,
  onEdit,
  onLoginClick,
}) {
  if (!user) {
    return (
      <section style={{ width: '100%' }}>
        <div className="section-header">
          <h2>Your Dashboard</h2>
          <p>Manage your pending and sent time capsules.</p>
        </div>
        <div className="glass-card empty-state">
          <div className="empty-icon" style={{ color: 'var(--primary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <h3>Authentication Required</h3>
          <p>You must be logged in to view your history and scheduled capsules.</p>
          <button onClick={onLoginClick} className="btn btn-primary mt-4">Login Now</button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ width: '100%' }}>
      <div className="glass-card">
        <div className="dashboard-header">
          <div className="header-text">
            <h2>Your Dashboard</h2>
            <p>Manage your pending and sent time capsules.</p>
          </div>
          <div className="filter-group">
            <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-slate'}`} onClick={() => setFilter('all')}>All ({capsules.length})</button>
            <button className={`btn ${filter === 'scheduled' ? 'btn-primary' : 'btn-outline-slate'}`} onClick={() => setFilter('scheduled')}>Scheduled ({capsules.filter(c => !c.sent).length})</button>
            <button className={`btn ${filter === 'sent' ? 'btn-primary' : 'btn-outline-slate'}`} onClick={() => setFilter('sent')}>Sent ({capsules.filter(c => c.sent).length})</button>
          </div>
        </div>

        {isLoadingCapsules && (
          <div className="empty-state">
            <div className="empty-icon" style={{ color: 'var(--primary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <h3>Loading Capsules...</h3>
            <p>Please wait while we fetch your time capsules.</p>
          </div>
        )}

        {!isLoadingCapsules && (
          displayedCapsules.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ opacity: 0.5 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z" /><polyline points="15 9 18 9 18 11" /><path d="M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2" /></svg>
              </div>
              <h3>No Capsules Found</h3>
              <p>{filter !== 'all' ? `You have no ${filter} capsules.` : "You haven't scheduled or sent any time capsules yet."}</p>
              <a href="#create" className="btn btn-outline-slate mt-4" style={{ textDecoration: 'none' }}>Create One</a>
            </div>
          ) : (
            <div className="capsule-grid">
              {displayedCapsules.map(capsule => (
                <CapsuleCard
                  key={capsule.id}
                  capsule={capsule}
                  onDelete={onDelete}
                  onEdit={onEdit}
                />
              ))}
            </div>
          )
        )}
      </div>
    </section>
  );
}