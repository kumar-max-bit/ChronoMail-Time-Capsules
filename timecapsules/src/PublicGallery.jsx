import React, { useState, useEffect } from 'react';
import apiService from './apiService.js';
import DOMPurify from 'dompurify';
import styles from './PublicGallery.module.css';

export default function PublicGallery() {
  const [publicCapsules, setPublicCapsules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const data = await apiService.getPublicCapsules();
        setPublicCapsules(data);
      } catch (err) {
        console.error("Failed to load public gallery", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGallery();
  }, []);

  return (
    <section className={styles.gallerySection}>
      <div className={styles.header}>
        <span className={`badge ${styles.badge}`}>Global Memories 🌎</span>
        <h2 className={styles.title}>The Public Gallery</h2>
        <p className={styles.subtitle}>Read anonymous time capsules from people around the world that have officially opened.</p>
      </div>

      {isLoading ? (
        <div className={styles.loadingText}>⏳ Loading public capsules...</div>
      ) : publicCapsules.length === 0 ? (
        <div className="glass-card empty-state">
          <div className="empty-icon">📭</div>
          <h3>No Public Capsules Yet</h3>
          <p>Be the first to share a memory with the world!</p>
        </div>
      ) : (
        <div className={styles.capsuleGrid}>
          {publicCapsules.map(c => (
            <div key={c.id} className={`capsule-card ${styles.capsuleCard}`}>
              <div className={`badge ${styles.categoryBadge}`}>🏷️ {c.category || 'General'}</div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{c.subject || 'No Subject'}</h3>
              <div className="message-preview" style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.5', maxHeight: '200px', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.message || '') }} />
              <div className={styles.cardFooter}>Delivered: {new Date(c.date).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}