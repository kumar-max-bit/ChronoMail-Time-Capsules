import React from 'react';

export default function About() {
  return (
    <section className="about-section dark-glass-card" style={{ padding: '50px 40px', marginTop: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '15px' }}>
          Discover Our Mission
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
        <h2 style={{ fontSize: '2.5rem', background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '15px' }}>About ChronoMail</h2>
        <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
          Welcome to the future of messaging. Our platform allows you to securely store and schedule messages, photos, and memories to be delivered at a specific time in the future.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' }}>
        <div style={{ padding: '30px 25px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)', textAlign: 'center', transition: 'all 0.3s ease' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h3 style={{ marginBottom: '10px', fontSize: '1.3rem', color: '#fff' }}>Security First</h3>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', lineHeight: '1.5', fontSize: '0.95rem' }}>Your capsules are end-to-end encrypted. Not even we can read your scheduled messages before their delivery date.</p>
        </div>
        
        <div style={{ padding: '30px 25px', borderRadius: '16px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.1)', textAlign: 'center', transition: 'all 0.3s ease' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h3 style={{ marginBottom: '10px', fontSize: '1.3rem', color: '#fff' }}>Precision Delivery</h3>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', lineHeight: '1.5', fontSize: '0.95rem' }}>Choose exact dates and times, or set up recurring yearly capsules for birthdays and anniversaries.</p>
        </div>

        <div style={{ padding: '30px 25px', borderRadius: '16px', background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.1)', textAlign: 'center', transition: 'all 0.3s ease' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          </div>
          <h3 style={{ marginBottom: '10px', fontSize: '1.3rem', color: '#fff' }}>Memories Attached</h3>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', lineHeight: '1.5', fontSize: '0.95rem' }}>Don't just send text. Attach your favorite photos, audio notes, or video messages to make your messages special.</p>
        </div>
      </div>
    </section>
  );
}