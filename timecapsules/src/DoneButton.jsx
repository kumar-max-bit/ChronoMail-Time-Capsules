import React from 'react';
import './DoneButton.css';

export default function DoneButton({ message = "Hi", closeModal }) {
  return (
    <div className="backdrop" onClick={closeModal} />
  );
}