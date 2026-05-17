import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase.js';

const GoogleSignIn = () => {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      console.log('Successfully logged in as:', user.displayName);
      console.log('Email:', user.email);
      console.log('User Profile Photo:', user.photoURL);

      // If you need to authenticate with your custom backend via apiService.js
      const token = await user.getIdToken();
      console.log('Firebase ID Token (pass this to your API):', token);
      
    } catch (error) {
      console.error('Error during Google Sign-In:', error.message);
    }
  };

  return (
    <button onClick={handleLogin} style={{ padding: '10px 20px', cursor: 'pointer' }}>
      Sign in with Google
    </button>
  );
};

export default GoogleSignIn;