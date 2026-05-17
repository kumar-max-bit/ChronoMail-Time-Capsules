import React, { useState } from 'react';
import apiService from './apiService.js';
import DOMPurify from 'dompurify';
import { toast } from 'react-hot-toast';

export default function Confirm({
  isOpen = false,
  title,
  subject,
  message,
  category,
  recipients,
  isScheduled,
  date,
  isRecurring,
  isPublic,
  isDeadMansSwitch,
  isPhysical,
  physicalAddress,
  file,
  userToken,
  editingId,
  closeModal,
  onSuccess,
}) {
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    if (!userToken) {
      toast.error("You must be logged in to send or schedule a message!");
      return closeModal();
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("recipients", recipients);
      formData.append("subject", subject || '');
      formData.append("message", message);
      formData.append("isScheduled", isScheduled);
      formData.append("recurring", isScheduled && isRecurring ? 'yearly' : 'none');
      formData.append("category", category || 'General');
      formData.append("isPublic", isPublic || false);
      formData.append("isDeadMansSwitch", isDeadMansSwitch || false);
      formData.append("isPhysical", isPhysical || false);
      if (isPhysical) formData.append("physicalAddress", physicalAddress || '');
      if (isScheduled) formData.append("date", date);

      if (file) {
        formData.append("file", file);
      }

      if (editingId) {
        await apiService.updateCapsule(editingId, formData, userToken);
      } else {
        await apiService.createCapsule(formData, userToken);
      }
      if (onSuccess) onSuccess();

      setSuccess(true);
    } catch (error) {
      console.error("Error submitting time capsule:", error);
      toast.error("Failed to submit to the server. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isMissingFields = !recipients || !message || (isScheduled && !isDeadMansSwitch && !date) || (isPhysical && !physicalAddress);

  return (
    <div role="dialog" className="modal-overlay" onClick={() => { if(closeModal) closeModal() }}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={() => { if(closeModal) closeModal() }}>&times;</button>
        {!isMissingFields && !success && (
          <>
            <h2 className="modal-title">{title}</h2>
            <div className="confirm-details">
              <p><strong>To:</strong> {recipients}</p>
              <p><strong>Subject:</strong> {subject || <em>No Subject</em>}</p>
              <p><strong>Category:</strong> {category || 'General'}</p>
              <div><strong>Message:</strong>
                <div className="message-preview" style={{ border: '1px solid var(--glass-border)', padding: '10px', marginTop: '5px', maxHeight: '150px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message || '') }} />
              </div>
              <p><strong>Visibility:</strong> {isPublic ? '🌍 Will be added to Public Gallery upon delivery' : '🔒 Private (Recipients Only)'}</p>
              <p><strong>Delivery:</strong> {isDeadMansSwitch ? '☠️ Automatically after 1 year of inactivity' : isScheduled ? `${new Date(date).toLocaleString()}${isRecurring ? ' (and every year after)' : ''}` : 'Instantly (Send Now)'}</p>
              {isPhysical && <p style={{ color: '#f59e0b' }}><strong>💌 Physical Delivery To:</strong> {physicalAddress}</p>}
              {file && <p><strong>Attachment:</strong> 📎 {file.name}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline-slate" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={isLoading}>
                {isLoading ? 'Submitting...' : `Confirm & ${editingId ? 'Update' : isScheduled ? 'Schedule' : 'Send'}`}
              </button>
            </div>
          </>
        )}
        
        {isMissingFields && !success && (
          <>
            <h2 className="modal-title error-title">Missing Information</h2>
            <div className="error-box">
              <ul>
              {!recipients && <li>Please add at least one recipient.</li>}
              {!message && <li>Please write a message.</li>}
              {isScheduled && !isDeadMansSwitch && !date && <li>Please select a delivery date.</li>}
              {isPhysical && !physicalAddress && <li>Please provide a mailing address for the physical letter.</li>}
              </ul>
            </div>
            <button className="btn btn-primary full-width" onClick={() => {
              setSuccess(false);
              if (closeModal) closeModal();
            }}>Go Back & Fix</button>
          </>
        )}
        
        {success && (
          <div className="success-state">
            <div className="success-icon">🎉</div>
            <h2 className="modal-title">{editingId ? 'Capsule Updated!' : 'Capsule Secured!'}</h2>
            <p>{editingId ? 'Your time capsule has been successfully updated.' : 'Your time capsule has been successfully encrypted and stored. We\'ll handle the rest.'}</p>
            <button className="btn btn-primary full-width" onClick={() => {
              setSuccess(false);
              if (closeModal) closeModal();
              window.location.hash = '#dashboard';
            }}>Go to Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}