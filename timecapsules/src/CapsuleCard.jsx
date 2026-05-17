import React from 'react';

export default function CapsuleCard({ capsule, onDelete, onEdit }) {
  const isPending = !capsule.sent;
  const timeUntilDelivery = capsule.date ? new Date(capsule.date).getTime() - Date.now() : 0;
  const canEdit = isPending && (capsule.isDeadMansSwitch || timeUntilDelivery > 24 * 60 * 60 * 1000);

  return (
    <div className="capsule-card">
      <div className="capsule-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h4 className="capsule-subject" style={{ margin: 0 }}>{capsule.subject || 'No Subject'}</h4>
          <span className="badge" style={{ alignSelf: 'flex-start', fontSize: '0.7rem', padding: '3px 8px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 3.5 3.5L12 9l-3.5-3.5L12 2Z"/><path d="m18 10 3.5 3.5L18 17l-3.5-3.5L18 10Z"/><path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"/><path d="m6 10 3.5 3.5L6 17l-3.5-3.5L6 10Z"/></svg>
            {capsule.category || 'General'}
          </span>
          {capsule.isPhysical && (
            <span className="badge" style={{ alignSelf: 'flex-start', fontSize: '0.7rem', padding: '3px 8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Physical Letter
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {canEdit && (
            <button className="btn-icon" style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', opacity: 0.8, transition: '0.2s' }} onClick={() => onEdit(capsule)} title="Edit Capsule">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
          )}
          <button className="btn-icon delete-btn" style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', color: '#94a3b8', transition: 'all 0.2s' }} onClick={() => onDelete(capsule.id)} title="Delete Capsule">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>
      <div className="capsule-meta">
        <span className={`status-badge ${capsule.sent ? 'sent' : 'scheduled'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {capsule.sent ? (
            <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Sent</>
          ) : (
            <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Scheduled</>
          )}
        </span>
        <span className="date-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {capsule.isDeadMansSwitch ? (
            <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> After 1 Year Inactivity</>
          ) : (
            <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> {new Date(capsule.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</>
          )}
        </span>
      </div>
      <div className="capsule-body">
        <div className="security-notice" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          End-to-End Encrypted
        </div>
        <div className="recipient-list"><strong>To:</strong> {capsule.recipients}</div>
      </div>
      {capsule.fileName && (
        <div className="capsule-footer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          <span className="filename">{capsule.fileName}</span>
        </div>
      )}
    </div>
  );
}