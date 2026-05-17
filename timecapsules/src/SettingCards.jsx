import React from 'react';

const cardStyle = { background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' };
const textContainerStyle = { flex: '1 1 300px', paddingRight: '20px' };
const titleContainerStyle = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' };
const iconStyle = { fontSize: '1.3rem' };
const titleStyle = { color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: '600' };
const descriptionStyle = { margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.5' };

export function SettingToggleCard({ icon, title, description, checked, onChange, color = 'primary' }) {
  return (
    <div style={cardStyle}>
      <div style={textContainerStyle}>
        <div style={titleContainerStyle}>
          <span style={iconStyle}>{icon}</span>
          <strong style={titleStyle}>{title}</strong>
        </div>
        <p style={descriptionStyle}>{description}</p>
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px', flexShrink: 0 }}>
        <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: checked ? `var(--${color})` : '#cbd5e1', transition: '.3s', borderRadius: '34px' }}>
          <span style={{ position: 'absolute', content: '""', height: '20px', width: '20px', left: '4px', bottom: '4px', backgroundColor: 'white', transition: '.3s', borderRadius: '50%', transform: checked ? 'translateX(24px)' : 'translateX(0)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
        </span>
      </label>
    </div>
  );
}

export function SettingInputCard({ icon, title, description, value, onChange, unit, type = 'number', min, max }) {
  return (
    <div style={cardStyle}>
      <div style={textContainerStyle}>
        <div style={titleContainerStyle}>
          <span style={iconStyle}>{icon}</span>
          <strong style={titleStyle}>{title}</strong>
        </div>
        <p style={descriptionStyle}>{description}</p>
      </div>
      <div style={{ position: 'relative', width: '120px', flexShrink: 0 }}>
        <input 
          type={type} min={min} max={max} value={value} onChange={onChange} 
          style={{ width: '100%', padding: `10px ${unit ? '40px' : '15px'} 10px 15px`, borderRadius: '8px', background: '#fff', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', textAlign: unit ? 'left' : 'center' }} 
        />
        {unit && <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 'bold', pointerEvents: 'none', fontSize: '0.9rem' }}>{unit}</span>}
      </div>
    </div>
  );
}