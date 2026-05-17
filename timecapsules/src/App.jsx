import React, { useState, useEffect, useCallback } from 'react';
import Confirm from "./Confirm.jsx";
import './NotificationBell.css';
import './app.css';
import Header from './Header.jsx';
import AuthModal from './AuthModal.jsx';
import ProfileSection from './ProfileSection.jsx';
import CreateCapsule from './CreateCapsule.jsx'; // Corrected import path
import Dashboard from './Dashboard.jsx';
import apiService from './apiService.js';
import About from './About.jsx';
import Contact from './Contact.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import PublicGallery from './PublicGallery.jsx';
import Home from './Home.jsx';
import { auth, googleProvider, requestForToken, onMessage } from './firebase.js'; // Make sure to create/update firebase.js
import { signInWithPopup } from 'firebase/auth'; // This is correct
import { Toaster, toast } from 'react-hot-toast';

// ============================================================================
// CHRONOMAIL - MAIN APPLICATION COMPONENT
// Orchestrates Routing, Global State, Auto-Saving, and Authentication
// ============================================================================
export default function App() {
  
  // ============================================================================
  // 1. AUTHENTICATION & USER STATE
  // ============================================================================
  // Recommendation: For better security, consider storing the JWT in an HttpOnly cookie
  // rather than localStorage to mitigate XSS risks.
  // User object is loaded from localStorage to keep the user logged in across browser sessions.
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('tcUser')) || null);
  const [notifications, setNotifications] = useState([]);

  const [showAuth, setShowAuth] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [authStep, setAuthStep] = useState('credentials'); // Controls the flow of the auth modal: 'credentials', 'otp', 'resetPassword', 'updatePassword'
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [otpVal, setOtpVal] = useState('');
  const [authError, setAuthError] = useState(null); // For displaying auth errors in modal
  const [isAuthLoading, setIsAuthLoading] = useState(false); // For auth modal loading state
  
  // --- Draft Loader ---
  // Load Draft from LocalStorage
  // This function retrieves any saved capsule draft from localStorage when the app loads.
  const loadDraft = () => {
    try {
      const draft = localStorage.getItem('tcDraft');
      return draft ? JSON.parse(draft) : null;
    } catch (e) {
      return null;
    }
  };
  const savedDraft = loadDraft();

  // ============================================================================
  // 2. TIME CAPSULE DRAFT / FORM STATE
  // All state variables for the 'Create Capsule' form. They are initialized from the saved draft, if it exists.
  // ============================================================================
  const [recipientsVal, setRecipientsVal] = useState(savedDraft?.recipientsVal || '');
  const [subjectVal, setSubjectVal] = useState(savedDraft?.subjectVal || null);
  const [messageVal, setMessageVal] = useState(savedDraft?.messageVal || null);
  const [dateVal, setDateVal] = useState(savedDraft?.dateVal || null);
  const [isScheduled, setIsScheduled] = useState(savedDraft?.isScheduled ?? true);
  const [categoryVal, setCategoryVal] = useState(savedDraft?.categoryVal || 'General');
  const [fileVal, setFileVal] = useState(null);
  const [isRecurringVal, setIsRecurringVal] = useState(savedDraft?.isRecurringVal ?? false);
  const [isPublicVal, setIsPublicVal] = useState(savedDraft?.isPublicVal ?? false);
  const [isDeadMansSwitchVal, setIsDeadMansSwitchVal] = useState(savedDraft?.isDeadMansSwitchVal ?? false);
  const [isPhysicalVal, setIsPhysicalVal] = useState(savedDraft?.isPhysicalVal ?? false);
  const [physicalAddressVal, setPhysicalAddressVal] = useState(savedDraft?.physicalAddressVal || '');
  
  // ============================================================================
  // 3. UI & COMPONENT STATE
  // ============================================================================
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoadingCapsules, setIsLoadingCapsules] = useState(false); // For dashboard loading state
  const [showSaveIndicator, setShowSaveIndicator] = useState(false); // Controls the visibility of the "Saved" indicator in the creation form.
  const [editingCapsuleId, setEditingCapsuleId] = useState(savedDraft?.editingCapsuleId || null);

  // --- Auto-Saver Effect ---
  // Silently saves the user's progress to local storage as they type
  useEffect(() => {
    // Consolidate all form fields into a single object to save in localStorage.
    const draftToSave = { recipientsVal, subjectVal, messageVal, dateVal, isScheduled, isRecurringVal, categoryVal, editingCapsuleId, isPublicVal, isDeadMansSwitchVal, isPhysicalVal, physicalAddressVal };
    localStorage.setItem('tcDraft', JSON.stringify(draftToSave));

    // Briefly show the "Saved" indicator to give the user visual feedback.
    if (recipientsVal || subjectVal || messageVal || categoryVal !== 'General' || isPublicVal) {
      setShowSaveIndicator(true);
      const timer = setTimeout(() => setShowSaveIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [recipientsVal, subjectVal, messageVal, dateVal, isScheduled, isRecurringVal, categoryVal, editingCapsuleId, isPublicVal, isDeadMansSwitchVal, isPhysicalVal, physicalAddressVal]);

  // --- Date Helper ---
  // Adds X days to the current date and formats it for the HTML datetime-local input
  // This is used by the "quick date" buttons (+1 Day, +1 Week, etc.).
  const setQuickDate = (daysToAdd) => {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
    setDateVal(localISOTime);
  };

  // ============================================================================
  // 4. ROUTING & DASHBOARD STATE
  // ============================================================================
  const [dashboardCapsules, setDashboardCapsules] = useState([]);
  const [filter, setFilter] = useState('all');
  const [currentView, setCurrentView] = useState('home'); // The current "page" or view being displayed.

  // This effect implements client-side routing based on the URL hash (e.g., #dashboard, #create).
  useEffect(() => {
    // Function to read the hash and update the current view state.
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      setCurrentView(hash);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run initial check
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Filters the capsules displayed on the dashboard based on the selected filter ('all', 'scheduled', 'sent').
  const displayedCapsules = dashboardCapsules.filter(c => {
    if (filter === 'scheduled') return !c.sent;
    if (filter === 'sent') return c.sent;
    return true;
  }).reverse();

  const handleClick = () => {
    setIsConfirmOpen(true);
  };

  // ============================================================================
  // 5. NOTIFICATION HANDLING
  // ============================================================================
  // Fetches all notifications for the logged-in user.
  const fetchNotifications = useCallback(async (token) => {
    if (!token) return;
    try {
      // This is an assumed API endpoint. You will need to create it.
      const fetchedNotifications = await apiService.request('/api/notifications', 'GET', null, token);
      setNotifications(fetchedNotifications || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  // Clears all notifications for the user.
  const handleClearNotifications = async () => {
    if (!user?.token) return;
    try {
      await apiService.request('/api/notifications/clear', 'POST', null, user.token);
      setNotifications([]);
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  // Marks a specific set of notifications as read.
  const handleMarkNotificationsAsRead = async (ids) => {
    if (!user?.token || (Array.isArray(ids) && ids.length === 0)) return;

    const originalNotifications = [...notifications];
    // Optimistic UI Update: Change the state immediately for a responsive feel.
    setNotifications(prev =>
      prev.map(n => (ids.includes(n._id)) ? { ...n, read: true } : n)
    );

    try {
      await apiService.request('/api/notifications/mark-read', 'POST', { ids }, user.token);
    } catch (error) {
      // If the API call fails, revert the UI to its original state.
      console.error("Failed to mark notifications as read, reverting UI.", error);
      setNotifications(originalNotifications);
    }
  };

  // Deletes a single notification.
  const handleDeleteNotification = async (id) => {
    if (!user?.token) return;

    const originalNotifications = [...notifications];
    // Optimistic UI Update.
    setNotifications(prev => prev.filter(n => n._id !== id));

    try {
      await apiService.request(`/api/notifications/${id}`, 'DELETE', null, user.token);
    } catch (error) {
      // Revert on failure.
      console.error("Failed to delete notification:", error);
      setNotifications(originalNotifications);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null); // Clear previous errors

    // Determine whether to call the register or login endpoint.
    const endpoint = isRegister ? '/api/register' : '/api/login';
    const payload = isRegister 
      ? { name: authName, email: authEmail, password: authPassword } 
      : { email: authEmail, password: authPassword };

    try {
      const data = await apiService.request(endpoint, 'POST', payload);
      
      if (data.error) { // API service will throw for !response.ok, but check data.error for specific messages
        // Special case: If a user tries to log in but their email isn't verified, switch to the OTP screen.
        if (data.verificationRequired && !isRegister && data.error) {
          setAuthError(data.error);
          setIsRegister(true); // Switch to register view context
          setAuthStep('otp');   // and jump to OTP step
          return;
        }
        throw new Error(data.error);
      }

      // If registering, move to the OTP verification step.
      if (isRegister) {
        setAuthStep('otp');
      } else {
        // If logging in, set the user state and close the modal.
        setUser(data);
        localStorage.setItem('tcUser', JSON.stringify(data)); // Still using localStorage for now
        setShowAuth(false);
        setAuthName('');
        setAuthEmail('');
        setAuthPassword('');
        window.location.hash = '#dashboard';
      }
    } catch (err) {
      console.error("Auth error:", err);
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handles the OTP verification step of registration.
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null); // Clear previous errors

    try {
      const data = await apiService.verifyOtp({ email: authEmail, otp: otpVal });
      if (data.error) {
        throw new Error(data.error);
      }

      // If OTP is correct, log the user in and set their session.
      setUser(data);
      localStorage.setItem('tcUser', JSON.stringify(data));
      setShowAuth(false);
      // Reset all auth form state for the next time the modal opens.
      setAuthName('');
      setAuthEmail('');
      setAuthPassword('');
      setOtpVal('');
      setAuthStep('credentials');
      window.location.hash = '#dashboard';
    } catch (err) {
      console.error("OTP Verify error:", err);
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handles the entire Google Sign-In flow.
  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      // By default, Google remembers the user's session.
      // Adding this custom parameter forces the account selection prompt to appear every time,
      // which is a more intuitive experience for users who may have multiple Google accounts.
      googleProvider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, googleProvider);
      const firebaseToken = await result.user.getIdToken();
      
      // Send the token from Google to our backend to get our app's own JWT.
      const data = await apiService.request('/api/firebase-auth', 'POST', { token: firebaseToken });
      if (data.error) throw new Error(data.error);

      // The rest of the flow is identical to a standard password login.
      setUser(data);
      localStorage.setItem('tcUser', JSON.stringify(data));
      setShowAuth(false);
      window.location.hash = '#dashboard';
    } catch (err) {
      console.error("Google Auth error:", err);
      setAuthError(err.message.replace("Firebase: ", ""));
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handles the first step of the "Forgot Password" flow.
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!authEmail) {
      setAuthError("Please enter your email address first to reset your password.");
      return;
    }
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const data = await apiService.request('/api/forgot-password', 'POST', { email: authEmail });
      if (data.error) throw new Error(data.error);
      // Move to the next step in the modal flow.
      setAuthStep('resetPassword');
      setOtpVal('');
      setAuthPassword(''); // Clear the password field to be used for the new password
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Verifies the OTP that the user entered for password reset.
  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const data = await apiService.request('/api/verify-reset-otp', 'POST', { email: authEmail, otp: otpVal });
      if (data.error) throw new Error(data.error);
      setAuthStep('updatePassword'); // Transition to the new password screen
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handles the final step: setting the new password.
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const data = await apiService.request('/api/reset-password', 'POST', { email: authEmail, otp: otpVal, newPassword: authPassword });
      if (data.error) throw new Error(data.error);
      // On success, reset the modal to the standard login screen.
      setAuthStep('credentials');
      setIsRegister(false);
      setAuthPassword('');
      setOtpVal('');
      toast.success("Password reset successful! Please log in with your new password.");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Clears all user-related state and removes the user from localStorage.
  const handleLogout = () => {
    setUser(null);
    setDashboardCapsules([]);
    setNotifications([]);
    localStorage.removeItem('tcUser');
    setAuthStep('credentials'); // Reset auth flow on logout
    window.location.hash = '#home';
  };

  // Fetches all capsules for the logged-in user to display on the dashboard.
  const fetchCapsules = useCallback(async (tokenOverride) => {
    const token = tokenOverride || user?.token;
    if (!token) {
      setDashboardCapsules([]); // Clear capsules if no token
      return;
    }
    setIsLoadingCapsules(true);
    try {
      const data = await apiService.getCapsules(token);
      setDashboardCapsules(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCapsules(false);
    }
  }, [user?.token]); // user?.token is a primitive, so it's fine here.

  // Deletes a capsule. Passed down as a prop to the Dashboard and CapsuleCard components.
  const deleteCapsule = async (id) => { // This function is passed to CapsuleCard
    if (!user) return;
    try {
      const deletedCapsule = dashboardCapsules.find(c => c.id === id);
      await apiService.deleteCapsule(id, user.token);
      setDashboardCapsules(prev => prev.filter(c => c.id !== id));

      // Optimistic local notification for instant user feedback
      const newLocalNotif = {
        _id: 'local_' + Date.now(),
        title: 'Capsule Deleted',
        body: `Your capsule "${deletedCapsule?.subject || 'Untitled'}" was deleted successfully.`,
        read: false,
        createdAt: new Date().toISOString()
      };
      setNotifications(prev => [newLocalNotif, ...prev]);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete the capsule.");
    }
  };

  // Pre-fills the creation form with the data of an existing capsule for editing.
  const editCapsule = async (capsule) => {
    if (!user) return;
    try {
      // Fetch the full capsule data, including the decrypted message.
      const fullCapsule = await apiService.getCapsule(capsule.id, user.token);
      setEditingCapsuleId(fullCapsule.id);
      setRecipientsVal(fullCapsule.recipients || '');
      setSubjectVal(fullCapsule.subject || '');
      setMessageVal(fullCapsule.message || '');
      setCategoryVal(fullCapsule.category || 'General');
      setIsScheduled(!fullCapsule.isDirect);
      if (fullCapsule.date) {
        // Format the date correctly for the datetime-local input field.
        const date = new Date(fullCapsule.date);
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
        setDateVal(localISOTime);
      }
      setIsRecurringVal(fullCapsule.recurring === 'yearly');
      setIsPublicVal(fullCapsule.isPublic === true);
      setIsDeadMansSwitchVal(fullCapsule.isDeadMansSwitch === true);
      setIsPhysicalVal(fullCapsule.isPhysical === true);
      setPhysicalAddressVal(fullCapsule.physicalAddress || '');
      // Navigate to the creation form view.
      window.location.hash = '#create';
    } catch (err) {
      toast.error("Could not load capsule for editing: " + err.message);
    }
  };

  // Resets the creation form when editing is cancelled.
  const cancelEdit = () => {
    setEditingCapsuleId(null);
    setRecipientsVal(''); setSubjectVal(''); setMessageVal(''); setDateVal(''); setFileVal(null); setIsRecurringVal(false); setCategoryVal('General'); setIsPublicVal(false); setIsDeadMansSwitchVal(false); setIsPhysicalVal(false); setPhysicalAddressVal('');
    localStorage.removeItem('tcDraft');
    window.location.hash = '#dashboard';
  };

  // Handles uploading a new profile photo.
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    try { // This function is passed to ProfileSection
      const data = await apiService.uploadProfilePhoto(formData, user.token);
      if (data.profilePhoto) {
        // If upload is successful, update the user state and localStorage with the new photo URL.
        const updatedUser = { ...user, profilePhoto: data.profilePhoto };
        setUser(updatedUser);
        localStorage.setItem('tcUser', JSON.stringify(updatedUser));
      } else {
        throw new Error(data.error || 'Failed to upload photo');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to upload photo');
    }
  };

  // Handles removing the profile photo.
  const handlePhotoRemove = async () => {
    if (!user || !user.profilePhoto) return;
    try {
      const updatedUser = { ...user, profilePhoto: null };
      setUser(updatedUser);
      localStorage.setItem('tcUser', JSON.stringify(updatedUser));
      toast.success('Profile photo removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove photo');
    }
  };

  // This is the main effect hook that runs when the user logs in or out.
  useEffect(() => {
    if (user) {
      // When a user is present, fetch their data.
      fetchCapsules();
      fetchNotifications(user.token);

      // Set up Firebase Cloud Messaging (FCM) for push notifications.
      const setupFcm = async () => {
        const fcmToken = await requestForToken();
        if (fcmToken && user.token) {
          try {
            // Send this token to your server to associate it with the user
            await apiService.request('/api/save-fcm-token', 'POST', { fcmToken }, user.token);
            console.log('FCM token sent to server.');
          } catch (error) {
            console.error('Failed to send FCM token to server.', error);
          }
        }
      };

      setupFcm();

      // Set up a listener for when a push notification is received while the app is open in the browser.
      const unsubscribe = onMessage((payload) => {
        console.log('Foreground message received.', payload);

        // The backend now sends a flattened data payload. We need to construct
        // the notification object on the client-side for a live update.
        if (payload?.data?.notificationId && payload?.data?.title && payload?.data?.body) {
          try {
            // Construct a notification object that matches the structure of what the
            // NotificationBell component expects (e.g., from the /api/notifications endpoint).
            const newNotification = {
              _id: payload.data.notificationId,
              title: payload.data.title,
              body: payload.data.body,
              link: payload.data.link,
              read: false, // New notifications are always unread
              createdAt: new Date().toISOString(), // Use current time for instant feedback
            };

            // Add the new notification to the beginning of the state array.
            setNotifications(prev => [newNotification, ...prev]);

            // LIVE POP-UP: Show a toast so the user knows a notification arrived in real-time.
            toast(
              (t) => (
                <div onClick={() => { toast.dismiss(t.id); window.location.hash = payload.data.link || '#dashboard'; }} style={{ cursor: 'pointer' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    {payload.data.title}
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{payload.data.body}</div>
                </div>
              ),
              { duration: 6000, icon: null }
            );

            // If the notification is about a capsule event, refresh the dashboard data.
            if (['CAPSULE_SENT', 'CAPSULE_CREATED', 'CAPSULE_UPDATED', 'CAPSULE_DELETED'].includes(payload?.data?.type)) {
              fetchCapsules();
            }
          } catch (e) {
            console.error('Could not process incoming notification payload, falling back to refetch.', e);
            fetchNotifications(user.token); // Fallback to refetching on error
          }
        } else {
          // Fallback for older message formats or if the direct payload is missing.
          console.log('No direct notification payload found, refetching everything.');
          fetchNotifications(user.token);
        }
      });

      // Clean up the listener when the component unmounts or the user logs out.
      return () => unsubscribe();
    }
  }, [user, fetchCapsules, fetchNotifications]);

  return (
    <div className="app-container">
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: { 
            background: 'rgba(15, 23, 42, 0.9)', 
            color: '#f8fafc', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            padding: '12px 20px',
            borderRadius: '12px',
            fontSize: '0.95rem'
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
            style: { border: '1px solid rgba(16, 185, 129, 0.4)' }
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
            style: { border: '1px solid rgba(239, 68, 68, 0.4)' }
          }
        }}
      />
      <Header user={user} onLoginClick={() => setShowAuth(true)} currentView={currentView} notifications={notifications} onClearNotifications={handleClearNotifications} onMarkNotificationsAsRead={handleMarkNotificationsAsRead} onDeleteNotification={handleDeleteNotification} />
      
      <AuthModal
        isOpen={showAuth}
        onClose={() => {
          setShowAuth(false);
          setOtpVal('');
        }}
        isRegister={isRegister}
        setIsRegister={setIsRegister}
        authStep={authStep}
        setAuthStep={setAuthStep}
        authName={authName}
        setAuthName={setAuthName}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        otpVal={otpVal}
        setOtpVal={setOtpVal}
        authError={authError}
        isAuthLoading={isAuthLoading}
        handleAuth={handleAuth}
        handleVerifyOtp={handleVerifyOtp}
        handleGoogleLogin={handleGoogleLogin}
        handleForgotPassword={handleForgotPassword}
        handleVerifyResetOtp={handleVerifyResetOtp}
        handleResetPassword={handleResetPassword}
      />

      {/* These are decorative animated blobs for the background. */}
      <div className="animated-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <main className="main-content">
        {/* Conditional rendering based on the currentView state, which is controlled by the URL hash. */}
        {currentView === 'profile' && user && (
          <div className="profile-combo-view">
            <ProfileSection
              user={user}
              onLogout={handleLogout}
              onPhotoUpload={handlePhotoUpload}
              onPhotoRemove={handlePhotoRemove}
              onScheduledClick={() => { setFilter('scheduled'); window.scrollTo({ top: 500, behavior: 'smooth' }); }}
            />
            <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
              <Dashboard
                user={user}
                capsules={dashboardCapsules}
                filter={filter}
                setFilter={setFilter}
                displayedCapsules={displayedCapsules}
                isLoadingCapsules={isLoadingCapsules}
                onDelete={deleteCapsule}
                onEdit={editCapsule}
                onLoginClick={() => setShowAuth(true)}
              />
            </div>
          </div>
        )}
        
        {currentView === 'profile' && !user && (
          <div className="glass-card empty-state" style={{ marginTop: '20px' }}>
            <div className="empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h3>Authentication Required</h3>
            <p>You must be logged in to view your profile.</p>
            <button onClick={() => setShowAuth(true)} className="btn btn-primary mt-4">Login Now</button>
          </div>
        )}

        {currentView === 'home' && <Home user={user} onLoginClick={() => setShowAuth(true)} />}

        {currentView === 'create' && (
          <CreateCapsule
            // Pass all the form state and handlers down to the CreateCapsule component.
            recipientsVal={recipientsVal} setRecipientsVal={setRecipientsVal}
            subjectVal={subjectVal} setSubjectVal={setSubjectVal}
            messageVal={messageVal} setMessageVal={setMessageVal}
            dateVal={dateVal} setDateVal={setDateVal}
            isScheduled={isScheduled} setIsScheduled={setIsScheduled}
            categoryVal={categoryVal} setCategoryVal={setCategoryVal}
            fileVal={fileVal} setFileVal={setFileVal}
            isRecurringVal={isRecurringVal} setIsRecurringVal={setIsRecurringVal}
            isPublicVal={isPublicVal} setIsPublicVal={setIsPublicVal}
            isDeadMansSwitchVal={isDeadMansSwitchVal} setIsDeadMansSwitchVal={setIsDeadMansSwitchVal}
            isPhysicalVal={isPhysicalVal} setIsPhysicalVal={setIsPhysicalVal}
            physicalAddressVal={physicalAddressVal} setPhysicalAddressVal={setPhysicalAddressVal}
            setQuickDate={setQuickDate}
            onSubmit={handleClick}
            isEditing={!!editingCapsuleId}
            onCancelEdit={cancelEdit}
            showSaveIndicator={showSaveIndicator}
          />
        )}
        
        {currentView === 'dashboard' && (
          <Dashboard
            user={user}
            capsules={dashboardCapsules}
            filter={filter}
            setFilter={setFilter}
            displayedCapsules={displayedCapsules}
            isLoadingCapsules={isLoadingCapsules}
            onDelete={deleteCapsule}
            onEdit={editCapsule}
            onLoginClick={() => setShowAuth(true)}
          />
        )}

        {currentView === 'gallery' && <PublicGallery />}
        {currentView === 'about' && <About />}
        {currentView === 'contact' && <Contact />}
        {currentView === 'admin' && <AdminDashboard user={user} />}
      </main>

      <Confirm 
        isOpen={isConfirmOpen}
        title="Review Your Capsule"
        subject={subjectVal}
        message={messageVal}
        category={categoryVal}
        recipients={recipientsVal}
        isScheduled={isScheduled}
        date={isScheduled ? dateVal : 'Send Now'}
        isRecurring={isRecurringVal}
        isPublic={isPublicVal}
        isDeadMansSwitch={isDeadMansSwitchVal}
        isPhysical={isPhysicalVal}
        physicalAddress={physicalAddressVal}
        file={fileVal}
        userToken={user?.token}
        editingId={editingCapsuleId}
        closeModal={() => { setIsConfirmOpen(false); setFileVal(null); }} // Clear file selection when modal is closed.
        onSuccess={() => {
          // Optimistic local notification for instant user feedback
          const isDirect = !isScheduled;
          const newLocalNotif = {
            _id: 'local_' + Date.now(),
            title: editingCapsuleId 
              ? 'Capsule Updated!' 
              : (isDirect ? 'Capsule Sent!' : 'Capsule Scheduled!'),
            body: editingCapsuleId 
              ? `Your time capsule "${subjectVal || 'Untitled'}" was updated successfully.` 
              : (isDirect 
                ? `Your capsule "${subjectVal || 'Untitled'}" has been dispatched to recipients.`
                : `Your capsule "${subjectVal || 'Untitled'}" is now securely scheduled.`),
            read: false,
            createdAt: new Date().toISOString()
          };
          setNotifications(prev => [newLocalNotif, ...prev]);

          // On successful submission, clear the entire form and the saved draft.
          setRecipientsVal(''); setSubjectVal(''); setMessageVal(''); setDateVal(''); setFileVal(null); setIsRecurringVal(false); setCategoryVal('General'); setIsPublicVal(false); setIsDeadMansSwitchVal(false); setIsPhysicalVal(false); setPhysicalAddressVal('');
          localStorage.removeItem('tcDraft');
          setEditingCapsuleId(null);
          
          // Instant Sync: Wait a tiny bit for the DB to settle, then fetch.
          setTimeout(() => {
            fetchCapsules();
            toast.success(editingCapsuleId ? "Capsule updated!" : "Capsule secured and scheduled!");
          }, 300);
        }}
      />
    </div>
  );
}