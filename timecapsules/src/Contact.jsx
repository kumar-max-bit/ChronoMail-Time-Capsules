import React, { useState, useEffect } from 'react';
import apiService from './apiService.js';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [status, setStatus] = useState({ loading: false, error: null, success: false });

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (parseInt(captchaAnswer, 10) !== captchaNum1 + captchaNum2) {
      setStatus({ loading: false, error: 'Incorrect answer to the security question.', success: false });
      return;
    }

    setStatus({ loading: true, error: null, success: false });
    try {
      await apiService.request('/api/contact', 'POST', { name, email, message });
      setStatus({ loading: false, error: null, success: true });
      setName('');
      setEmail('');
      setMessage('');
      setCaptchaAnswer('');
      generateCaptcha();
    } catch (err) {
      setStatus({ loading: false, error: err.message || 'Failed to send message.', success: false });
    }
  };

  return (
    <section className="glass-card contact-section" style={{ padding: '50px 40px', marginTop: '20px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <span className="badge" style={{ display: 'inline-block', marginBottom: '15px' }}>Support ✨</span>
        <h2 style={{ fontSize: '2rem', marginBottom: '10px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Get in Touch</h2>
        <p style={{ color: 'var(--text-secondary, #64748b)' }}>Have questions, feedback, or need help with your time capsules? We'd love to hear from you.</p>
      </div>
      
      {status.success ? (
        <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', textAlign: 'center', color: '#10b981' }}>
          <h4>🎉 Thank You!</h4>
          <p>Your message has been sent successfully. We'll get back to you shortly.</p>
        </div>
      ) : (
        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} onSubmit={handleSubmit}>
           <div className="input-group">
              <label>Your Name</label>
              <input type="text" placeholder="John Doe" required value={name} onChange={e => setName(e.target.value)} />
           </div>
           <div className="input-group">
              <label>Email Address</label>
              <input type="email" placeholder="john@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
           </div>
           <div className="input-group">
              <label>Message</label>
              <textarea rows="5" placeholder="How can we help?" required value={message} onChange={e => setMessage(e.target.value)} style={{ width: '100%', resize: 'vertical', minHeight: '120px' }}></textarea>
           </div>
           <div className="input-group" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
              <label style={{ fontWeight: 'bold', color: '#a855f7' }}>Security Question: What is {captchaNum1} + {captchaNum2}?</label>
              <input type="number" placeholder="Your answer" required value={captchaAnswer} onChange={e => setCaptchaAnswer(e.target.value)} />
           </div>
           {status.error && <div style={{ color: '#ef4444', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px' }}>{status.error}</div>}
           <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '1.1rem', marginTop: '10px' }} disabled={status.loading}>
             {status.loading ? 'Sending...' : 'Send Message'}
           </button>
        </form>
      )}
    </section>
  );
}