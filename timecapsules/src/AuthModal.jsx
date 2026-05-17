import React, { useState, useEffect } from 'react';

export default function AuthModal({
  isOpen,
  onClose,
  isRegister,
  setIsRegister,
  authStep,
  setAuthStep,
  authName,
  setAuthName,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  otpVal,
  setOtpVal,
  handleAuth,
  handleVerifyOtp,
  handleForgotPassword,
  handleVerifyResetOtp,
  handleResetPassword,
  authError, // New prop for error messages
  handleGoogleLogin, // New prop for Google Auth
  isAuthLoading, // New prop for loading state
}) {
  if (!isOpen) return null;

  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = (e) => {
    e.preventDefault();
    if (resendCooldown === 0) {
      // We can re-use the handleAuth function to trigger a new OTP for the same email
      handleAuth(e); // This will trigger a new OTP send
      setResendCooldown(60); // Start 60-second cooldown
    }
  };

  return (
    <div role="dialog" className="modal-overlay" onClick={onClose}>
      <div className="modal-card auth-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>

        {authError && (
          <div className="error-message">{authError}</div>
        )}

        {authStep === 'credentials' && (
          <form onSubmit={handleAuth} className="auth-form">
            <h2 className="modal-title">{isRegister ? 'Create Your Account' : 'Welcome Back'}</h2>
            <p className="modal-subtitle">{isRegister ? 'Join us and start your journey to the future.' : 'Log in to access your time capsules.'}</p>

            {isRegister && (
              <div className="input-group">
                <label htmlFor="name">Name</label>
                <div className="input-wrapper">
                  <input id="name" type="text" value={authName} onChange={e => setAuthName(e.target.value)} required placeholder="e.g. John Doe" />
                </div>
              </div>
            )}
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <input id="email" type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required placeholder="you@example.com" />
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="password" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                Password
                {!isRegister && (
                  <a href="#" onClick={handleForgotPassword} style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none' }}>Forgot?</a>
                )}
              </label>
              <div className="input-wrapper">
                <input id="password" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required placeholder={isRegister ? "Create Password" : "••••••••"} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary full-width mt-4" disabled={isAuthLoading}>
              {isRegister ? 'Register' : 'Login'}
            </button>
            <div className="auth-switch-container mt-4">
              <button
                type="button"
                className={`auth-switch-btn ${!isRegister ? 'active' : ''}`}
                onClick={() => setIsRegister(false)}>Login</button>
              <button
                type="button"
                className={`auth-switch-btn ${isRegister ? 'active' : ''}`}
                onClick={() => setIsRegister(true)}>Register</button>
            </div>

            <div className="auth-divider" style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--glass-border, rgba(255,255,255,0.1))' }}></div>
              <span style={{ padding: '0 10px' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--glass-border, rgba(255,255,255,0.1))' }}></div>
            </div>

            <button
              type="button"
              className="btn btn-outline-slate full-width"
              onClick={handleGoogleLogin}
              disabled={isAuthLoading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: '20px' }} />
              Continue with Google
            </button>
          </form>
        )}

        {authStep === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="auth-form otp-form">
            <h2 className="modal-title">Verify Your Email</h2>
            <p className="modal-subtitle">We've sent a 6-digit code to <strong>{authEmail}</strong>. Please enter it below.</p>
            <div className="input-group">
              <label htmlFor="otp">Verification Code</label>
              <input
                id="otp"
                type="text"
                value={otpVal}
                onChange={e => setOtpVal(e.target.value)}
                required
                maxLength="6"
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
              />
            </div>
            <button type="submit" className="btn btn-primary full-width mt-4" disabled={isAuthLoading}>
              Verify & Login
            </button>
            <p className="auth-toggle">
              Didn't receive the code?{' '}
              <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || isAuthLoading}>
                {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
              </button>
              {' or '}
              <button type="button" onClick={() => setAuthStep('credentials')}>
                Change Email
              </button>
            </p>
          </form>
        )}

        {authStep === 'resetPassword' && (
          <form onSubmit={handleVerifyResetOtp} className="auth-form otp-form">
            <h2 className="modal-title">Verify Reset Code</h2>
            <p className="modal-subtitle">Enter the 6-digit code sent to <strong>{authEmail}</strong> to verify your identity.</p>
            <div className="input-group">
              <label htmlFor="reset-otp">Verification Code</label>
              <input
                id="reset-otp"
                type="text"
                value={otpVal}
                onChange={e => setOtpVal(e.target.value)}
                required
                maxLength="6"
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
              />
            </div>
            <button type="submit" className="btn btn-primary full-width mt-4" disabled={isAuthLoading}>
              Verify Code
            </button>
            <p className="auth-toggle mt-3">
              <button type="button" onClick={() => setAuthStep('credentials')}>
                Back to Login
              </button>
            </p>
          </form>
        )}

        {authStep === 'updatePassword' && (
          <form onSubmit={handleResetPassword} className="auth-form otp-form">
            <h2 className="modal-title">Create New Password</h2>
            <p className="modal-subtitle">Your identity has been verified. Please enter your new password below.</p>
            <div className="input-group">
              <label htmlFor="new-password">New Password</label>
              <input id="new-password" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary full-width mt-4" disabled={isAuthLoading}>
              Save New Password
            </button>
            <p className="auth-toggle mt-3">
              <button type="button" onClick={() => setAuthStep('credentials')}>
                Back to Login
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}