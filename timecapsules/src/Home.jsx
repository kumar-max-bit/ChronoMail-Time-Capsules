import React from 'react';

export default function Home({ user, onLoginClick }) {
  return (
    <section className="fade-in" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
      {/* Hero Banner */}
      <div style={{ marginBottom: '60px', marginTop: '20px' }}>
        <span className="badge" style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px',
          padding: '10px 20px',
          fontSize: '0.9rem',
          fontWeight: '600',
          background: 'rgba(99, 102, 241, 0.1)',
          color: '#a855f7',
          borderRadius: '9999px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          Welcome to ChronoMail
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
        <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3.8rem)', fontWeight: '700', lineHeight: '1.1', marginBottom: '20px' }}>
          Send a message to the <br />
          <span className="highlight">future.</span>
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary, #94a3b8)', maxWidth: '700px', margin: '0 auto 40px', lineHeight: '1.6' }}>
          Securely store and schedule messages, photos, and memories for yourself or your loved ones. We'll safely encrypt and deliver them exactly when the time is right.
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ padding: '15px 35px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => window.location.hash = '#create'}>
            Create a Capsule
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 2.67-2 3.5 0 1 2 1.5 2.5 1.5s2.5-.5 2.5-1.5c0-.83-.5-2.24-2-3.5Z"/><path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><path d="M23 15V3a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v12"/><path d="M11 7h6"/><path d="M11 11h6"/></svg>
          </button>
          {!user ? (
            <button className="btn btn-primary" style={{ padding: '15px 35px', fontSize: '1.1rem' }} onClick={onLoginClick}>
              Login / Register
            </button>
          ) : (
          <button className="btn btn-outline" style={{ padding: '15px 35px', fontSize: '1.1rem' }} onClick={() => window.location.hash = '#dashboard'}>
              Go to Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Key Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '60px', flexWrap: 'wrap' }}>
         <div style={{ padding: '25px clamp(15px, 4vw, 40px)', minWidth: 'min(100%, 200px)', flex: '1 1 200px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '2.5rem', color: '#6366f1', margin: '0 0 5px 0', fontWeight: '700' }}>100%</h2>
            <p style={{ color: '#cbd5e1', margin: 0, fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.9rem' }}>Encrypted</p>
         </div>
         <div style={{ padding: '25px clamp(15px, 4vw, 40px)', minWidth: 'min(100%, 200px)', flex: '1 1 200px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '2.5rem', color: '#a855f7', margin: '0 0 5px 0', fontWeight: '700' }}>Forever</h2>
            <p style={{ color: '#cbd5e1', margin: 0, fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.9rem' }}>Storage</p>
         </div>
         <div style={{ padding: '25px clamp(15px, 4vw, 40px)', minWidth: 'min(100%, 200px)', flex: '1 1 200px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '2.5rem', color: '#10b981', margin: '0 0 5px 0', fontWeight: '700' }}>Global</h2>
            <p style={{ color: '#cbd5e1', margin: 0, fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.9rem' }}>Delivery</p>
         </div>
      </div>
      
      {/* Feature Highlight Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '30px' }}>
        <div style={{ padding: 'clamp(25px, 5vw, 40px) clamp(15px, 4vw, 30px)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', marginBottom: '5px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <h3 style={{ fontSize: '1.4rem', margin: 0, color: '#f8fafc' }}>Military-Grade Security</h3>
          <p style={{ color: '#cbd5e1', margin: 0, lineHeight: '1.6' }}>Your capsules are end-to-end encrypted with AES-256 before ever touching our databases. Your privacy is mathematically guaranteed.</p>
        </div>
        
        <div style={{ padding: 'clamp(25px, 5vw, 40px) clamp(15px, 4vw, 30px)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
          <div style={{ background: 'rgba(168, 85, 247, 0.1)', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', marginBottom: '5px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 14v4"/><path d="m15 17-3 1-3-1"/></svg>
          </div>
          <h3 style={{ fontSize: '1.4rem', margin: 0, color: '#f8fafc' }}>Precision Scheduling</h3>
          <p style={{ color: '#cbd5e1', margin: 0, lineHeight: '1.6' }}>Pick an exact date—tomorrow, next year, or 50 years from now. Set up recurring birthday or anniversary messages easily.</p>
        </div>
        
        <div style={{ padding: 'clamp(25px, 5vw, 40px) clamp(15px, 4vw, 30px)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
          <div style={{ background: 'rgba(236, 72, 153, 0.1)', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', marginBottom: '5px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h3 style={{ fontSize: '1.4rem', margin: 0, color: '#f8fafc' }}>Dead Man's Switch</h3>
          <p style={{ color: '#cbd5e1', margin: 0, lineHeight: '1.6' }}>A failsafe feature that automatically dispatches your most important messages and documents if you are inactive for over a year.</p>
        </div>
      </div>
    </section>
  );
}