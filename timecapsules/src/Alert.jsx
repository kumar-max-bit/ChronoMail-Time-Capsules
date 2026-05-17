import React from 'react';

export default function Alert({ isOpen = false, message, title, closeModal }) {
  if (!isOpen) return null;

  return (
    <div role="dialog" className="modal">
      <div className="contents">
        <ul>
          <p>Message: {message}</p>
        </ul>
        <div className="actions">
          <button onClick={closeModal}>Done</button>
        </div>
      </div>
    </div>
  );
}