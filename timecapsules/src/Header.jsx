import React from 'react';
import NotificationBell from './NotificationBell.jsx';

export default function Header({ user, onLoginClick, currentView, notifications, onClearNotifications, onMarkNotificationsAsRead, onDeleteNotification }) {
  const activeStyle = { borderBottom: '2px solid #6366f1', color: '#6366f1' };

  return (
    <header className="navbar">
      <div className="nav-content">
        <div className="logo" onClick={() => window.location.hash = '#home'} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          ChronoMail
        </div>
        <nav className="nav-links">
          <a href="#home" style={currentView === 'home' ? activeStyle : {}}> Home</a>
          <a href="#create" style={currentView === 'create' ? activeStyle : {}}> Create</a>
          <a href="#dashboard" style={currentView === 'dashboard' ? activeStyle : {}}> Dashboard</a>
          <a href="#gallery" style={currentView === 'gallery' ? activeStyle : {}}> Gallery</a>
          {user && (
            <a href="#profile" style={{ display: 'flex', alignItems: 'center', gap: '5px', ...(currentView === 'profile' ? activeStyle : {}) }}>
              👤
              Profile
            </a>
          )}
          {user?.isAdmin && (
            <a href="#admin" style={currentView === 'admin' ? activeStyle : {}}> Admin</a>
          )}
          <a href="#about" style={currentView === 'about' ? activeStyle : {}}>ℹ About</a>
          <a href="#contact" style={currentView === 'contact' ? activeStyle : {}}> Contact</a>
          {user && (
            <NotificationBell
              notifications={notifications}
              onClear={onClearNotifications}
              onMarkAsRead={onMarkNotificationsAsRead}
              onDeleteNotification={onDeleteNotification}
            />
          )}
          {!user && (
            <button onClick={onLoginClick} className="btn btn-primary">Login / Register</button>
          )}
        </nav>
      </div>
    </header>
  );
}