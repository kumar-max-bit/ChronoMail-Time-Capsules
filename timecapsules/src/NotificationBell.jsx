import React, { useState, useEffect, useRef } from 'react';

const ModernNotificationStyles = () => (
  <style>{`
    .notification-dropdown {
      background: #ffffff !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
      border-radius: 12px !important;
      width: 380px !important;
      border: 1px solid #f0f0f0 !important;
      color: #0f172a !important;
    }

    @media (max-width: 600px) {
      .notification-dropdown {
        position: fixed !important;
        top: 75px !important;
        left: 16px !important;
        right: 16px !important;
        width: calc(100vw - 32px) !important;
        max-width: 380px !important;
        transform: none !important;
        box-sizing: border-box !important;
      }
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0 !important;
    }

    .notification-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700 !important;
      color: #0f172a !important;
    }

    .clear-button {
      background: none;
      border: none;
      color: #6366f1 !important;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background-color 0.2s ease;
    }

    .clear-button:hover {
      background-color: rgba(99, 102, 241, 0.1);
    }

    .notification-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0 !important;
      transition: background-color 0.2s ease;
      position: relative;
    }

    .notification-item:last-child {
      border-bottom: none;
    }

    .notification-item.clickable:hover {
      background-color: #f9fafb !important;
    }

    .notification-item:not(.read) .notification-title {
      font-weight: 700 !important;
      color: #0f172a !important;
    }
    
    .notification-icon {
      flex-shrink: 0;
      margin-right: 12px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(99, 102, 241, 0.1);
      color: #6366f1;
      margin-top: 2px;
    }

    .notification-item.read .notification-icon {
      background-color: #eef2ff;
      color: #818cf8;
    }

    .notification-content {
      flex-grow: 1;
    }

    .notification-title {
      margin: 0;
      font-size: 0.9rem;
      color: #0f172a !important;
      font-weight: 600 !important;
      line-height: 1.4;
    }

    .notification-body {
      margin: 2px 0 0 0;
      font-size: 0.85rem;
      color: #334155 !important;
      line-height: 1.5;
    }

    .notification-time {
      font-size: 0.75rem;
      color: #64748b !important;
      margin-top: 4px;
      display: block;
    }

    .notification-delete-btn {
      position: absolute;
      top: 12px;
      right: 16px;
      background: transparent;
      color: #9ca3af !important;
      border: none;
      padding: 0;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s ease, color 0.2s ease;
    }

    .notification-item:hover .notification-delete-btn {
      opacity: 1;
    }

    .notification-delete-btn:hover {
      color: #374151 !important;
    }

    .no-notifications {
      text-align: center;
      padding: 40px 20px;
      color: #6b7280 !important;
    }

    .no-notifications-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      display: block;
    }
  `}</style>
);

function timeAgo(date) {
  const totalSeconds = Math.floor((new Date() - new Date(date)) / 1000);

  const intervals = [
    { seconds: 31536000, name: 'year' },
    { seconds: 2592000, name: 'month' },
    { seconds: 86400, name: 'day' },
    { seconds: 3600, name: 'hour' },
    { seconds: 60, name: 'minute' }
  ];

  for (const interval of intervals) {
    const count = Math.floor(totalSeconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.name}${count > 1 ? 's' : ''} ago`;
    }
  }
  return Math.floor(totalSeconds) + ' seconds ago';
}


export default function NotificationBell({ notifications = [], onClear, onMarkAsRead, onDeleteNotification }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggle = () => {
    const nextIsOpen = !isOpen;
    // If we are opening the dropdown and there are unread notifications, mark them as read.
    if (nextIsOpen && unreadCount > 0) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
      onMarkAsRead(unreadIds);
    }
    setIsOpen(nextIsOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="notification-bell-wrapper" ref={wrapperRef}>
      <ModernNotificationStyles />
      <button onClick={handleToggle} className="icon-button bell-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && <button onClick={onClear} className="clear-button">Clear All</button>}
          </div>
          <div className="notification-list">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div key={notification._id} className={`notification-item ${notification.read ? 'read' : ''} clickable`} onClick={() => {
                  if (!notification.read) {
                    onMarkAsRead([notification._id]);
                  }
                  if (notification.link) {
                    setTimeout(() => {
                      window.location.href = notification.link;
                      setIsOpen(false);
                    }, 100);
                  }
                }}>
                  <div className="notification-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                  </div>
                  <div className="notification-content">
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-body">{notification.body}</p>
                    <span className="notification-time">{timeAgo(notification.createdAt)}</span>
                  </div>
                  <button className="notification-delete-btn" onClick={(e) => { e.stopPropagation(); onDeleteNotification(notification._id); }} title="Delete notification">&times;</button>
                </div>
              ))
            ) : (
              <div className="no-notifications">
                <span className="no-notifications-icon" role="img" aria-label="Party popper">🎉</span>
                You're all caught up!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}