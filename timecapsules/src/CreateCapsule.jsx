import React, { useState, useRef, useEffect } from 'react';
import uploadLogo from "./assets/1092216 1.svg";
import check from "./assets/3917090.png";
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import apiService from './apiService.js';
import { toast } from 'react-hot-toast';

// ============================================================================
// CREATION FORM COMPONENT
// Handles Rich Text, Voice Dictation, Webcam Recording, & Delivery Modes
// ============================================================================

export default function CreateCapsule({
  recipientsVal, setRecipientsVal,
  subjectVal, setSubjectVal,
  messageVal, setMessageVal,
  dateVal, setDateVal,
  isScheduled, setIsScheduled,
  categoryVal, setCategoryVal,
  fileVal, setFileVal,
  isRecurringVal, setIsRecurringVal,
  isPublicVal, setIsPublicVal,
  isDeadMansSwitchVal, setIsDeadMansSwitchVal,
  isPhysicalVal, setIsPhysicalVal,
  physicalAddressVal, setPhysicalAddressVal,
  setQuickDate,
  onSubmit,
  isEditing,
  onCancelEdit,
  showSaveIndicator,
}) {
  // State for the "AI Suggestion" button loading indicator.
  const [isGenerating, setIsGenerating] = useState(false);
  // State to control the expansion of the rich text editor.
  const [editorExpanded, setEditorExpanded] = useState(false);

  // Media Recording State
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false); // Tracks if we are in audio-only recording mode

  const mediaRecorderRef = useRef(null); // Holds the MediaRecorder instance.
  const videoRef = useRef(null); // Ref for the <video> element.
  const streamRef = useRef(null); // Holds the camera/microphone stream.
  const chunksRef = useRef([]); // Stores chunks of recorded data.

  // Voice Dictation State
  const dictationRef = useRef(null);
  const [isDictating, setIsDictating] = useState(false);

  // Preview URL management (Privacy & Memory Cleanup)
  const [previewUrl, setPreviewUrl] = useState(null);

  // Function to request access to the user's hardware.
  const startMedia = async (audioOnly = false) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support media devices.");
      }

      setIsAudioOnly(audioOnly);
      let stream;
      
      if (audioOnly) {
        // Request ONLY audio for Voice Notes
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        try {
          // Try to get both video and audio
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err) {
          // Fallback: Try just video (if they don't have a microphone)
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (err2) {
            // Fallback: Try just audio (if they don't have a webcam)
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsAudioOnly(true); // Forced audio-only if camera fails
          }
        }
      }

      // If successful, store the stream and switch to recording mode UI.
      streamRef.current = stream;
      setIsRecordingMode(true);
      
      // We don't set the video source here because the video element hasn't rendered yet.
      // It will be handled by the useEffect or a delayed check in the render cycle.
      if (!audioOnly) {
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Auto-play failed:", e));
          }
        }, 300); // Increased timeout to ensure React mounting is complete
      }
    } catch (err) {
      alert("Hardware Missing: We couldn't find a connected camera or microphone on this device. Please plug one in or check your OS permissions.");
    }
  };

  // Starts the actual recording process.
  const startRecording = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    let recorder;
    const type = isAudioOnly ? 'audio/webm' : 'video/webm';
    
    try {
      recorder = new MediaRecorder(streamRef.current, { mimeType: type });
    } catch (e) {
      recorder = new MediaRecorder(streamRef.current);
    }

    // When data is available, add it to our array.
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    // When recording stops, assemble the chunks into a single file.
    recorder.onstop = () => {
      const recordedType = recorder.mimeType || type;
      const blob = new Blob(chunksRef.current, { type: recordedType });
      
      const maxSize = (isAudioOnly ? 5 : 10) * 1024 * 1024; // 5MB for audio, 10MB for video
      if (blob.size > maxSize) {
        alert(`${isAudioOnly ? 'Audio' : 'Video'} is too large. Please record a shorter message.`);
        stopMedia();
        return;
      }
      
      const filename = isAudioOnly ? 'audio_note.webm' : 'video_message.webm';
      const file = new File([blob], filename, { type: recordedType });
      setFileVal(file);
      
      // We keep the recording mode open for a moment to allow previewing if needed,
      // or we can just close it. Let's close it but the file is now in fileVal.
      stopMedia();
      toast.success(`${isAudioOnly ? 'Audio' : 'Video'} recorded and attached!`);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  // Stops the recording.
  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  // Stops the camera/mic stream and releases the hardware.
  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecordingMode(false);
    setIsAudioOnly(false);
    setIsRecording(false);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Effect to handle video element initialization when mode changes
  useEffect(() => {
    if (isRecordingMode && !isAudioOnly && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isRecordingMode, isAudioOnly]);

  // Handle manual file selection with size validation
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 15 * 1024 * 1024; // 15MB limit for manual uploads
    if (file.size > maxSize) {
      alert("File is too large. Maximum size is 15MB.");
      return;
    }
    setFileVal(file);
  };

  // Manage Preview URLs for Privacy & Memory efficiency
  useEffect(() => {
    if (fileVal) {
      const url = URL.createObjectURL(fileVal);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setPreviewUrl(null);
      };
    }
  }, [fileVal]);

  // Voice Dictation Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setMessageVal(prev => (prev || '') + transcript + ' ');
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
          alert("Microphone access blocked!");
        }
        setIsDictating(false);
      };
      recognition.onend = () => setIsDictating(false);
      dictationRef.current = recognition;
    }
  }, [setMessageVal]);

  const toggleDictation = () => {
    if (isDictating) {
      dictationRef.current?.stop();
    } else {
      if (!dictationRef.current) {
        alert("Speech recognition not supported in this browser.");
        return;
      }
      try {
        dictationRef.current.start();
        setIsDictating(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleGenerateSubject = async () => {
    const plainText = messageVal ? messageVal.replace(/<[^>]*>?/gm, '').trim() : '';
    if (!plainText) {
      alert("Please write a message first!");
      return;
    }
    setIsGenerating(true);
    try {
      // Find the user token from the app state or localStorage if needed
      const user = JSON.parse(localStorage.getItem('tcUser'));
      const token = user?.token;
      
      const data = await apiService.generateSubject({ message: plainText }, token);
      if (data.subject) {
        setSubjectVal(data.subject);
      }
    } catch (err) {
      toast.error("Failed to generate subject.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="hero-section">
      <style>{`
        @media (min-width: 992px) {
          .sticky-hero-text {
            position: sticky;
            top: 100px;
            align-self: flex-start;
          }
        }
        .ql-editor {
          min-height: 100px;
          font-size: 1rem;
          transition: min-height 0.3s ease;
        }
        .quill-wrapper.expanded .ql-editor, .quill-wrapper:focus-within .ql-editor {
          min-height: 150px;
        }
        @keyframes pulsing {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .audio-mic-icon.pulsing {
          animation: pulsing 1.5s infinite ease-in-out;
        }
        .attachment-preview {
          margin-top: 10px;
          padding: 10px;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .preview-player {
          width: 100%;
          border-radius: 4px;
          max-height: 200px;
        }
        .attachment-active-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: bold;
          border: 1px solid rgba(16, 185, 129, 0.2);
          margin-bottom: 8px;
        }
      `}</style>
      <div className="hero-text sticky-hero-text">
        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          ChronoMail
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
        <h1>Send a message to the <span className="highlight">future</span>.</h1>
        <p>Write a message to yourself or your loved ones, attach your favorite memories, and choose a date. We'll securely encrypt and deliver it when the time is right.</p>
        <div className="hero-features">
          <div className="feature">🔒 End-to-End Encrypted Storage</div>
          <div className="feature">📎 Included File Attachments</div>
          <div className="feature">⏱️ Precision Future Delivery</div>
        </div>
      </div>
      
      <div className="hero-form">
        <form className="glass-card" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>{isEditing ? 'Edit your Capsule' : 'Draft your Capsule'}</h3>
            <span style={{ fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px', opacity: showSaveIndicator ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              Saved
            </span>
          </div>
          
          <div className="input-group">
            <label htmlFor="recipients">Recipient Email(s)</label>
            <input type="text" id="recipients" placeholder="separated by commas" value={recipientsVal || ''} onChange={(e) => setRecipientsVal(e.target.value)} required />
          </div>
          
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label htmlFor="subject" style={{ marginBottom: 0 }}>Subject</label>
              <button type="button" onClick={handleGenerateSubject} disabled={isGenerating} style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#a855f7', borderRadius: '4px', cursor: isGenerating ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }}>
                {isGenerating ? '⏳ Thinking...' : '✨ AI Suggestion'}
              </button>
            </div>
            <input type="text" id="subject" placeholder="optional.." value={subjectVal || ''} onChange={(e) => setSubjectVal(e.target.value)} />
          </div>
          
          <div className="input-group">
            <label htmlFor="category">Category / Theme</label>
            <select id="category" value={categoryVal || 'General'} onChange={(e) => setCategoryVal(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))', background: 'var(--card-bg, rgba(255, 255, 255, 0.03))', color: 'inherit', fontSize: '1rem' }}>
              <option value="General">General</option>
              <option value="Letter to Self">Letter to Self</option>
              <option value="Career Goals">Career Goals</option>
              <option value="To my kids">To my kids</option>
              <option value="Predictions">Predictions</option>
              <option value="Secret Confession">Secret Confession</option>
              <option value="Memory / Event">Memory / Event</option>
            </select>
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label htmlFor="message" style={{ marginBottom: 0 }}>Message Body</label>
              <button type="button" onClick={toggleDictation} style={{ padding: '4px 10px', fontSize: '0.8rem', background: isDictating ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', border: `1px solid ${isDictating ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`, color: isDictating ? '#ef4444' : '#3b82f6', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                {isDictating ? '🛑 Stop Listening...' : '🎙️ Dictate Message'}
              </button>
            </div>
            <div className={`quill-wrapper ${editorExpanded || (messageVal && messageVal.length > 15) ? 'expanded' : ''}`} style={{ backgroundColor: '#fff', color: '#333', borderRadius: '4px', overflow: 'hidden' }}>
              <ReactQuill 
                theme="snow"
                value={messageVal || ''} 
                onChange={setMessageVal} 
                onFocus={() => setEditorExpanded(true)}
                placeholder="Write your message here..."
                spellCheck={false}
                modules={{
                  toolbar: [
                    [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                    [{ 'align': [] }],
                    ['link', 'clean']
                  ]
                }}
              />
            </div>
          </div>
          
          <div className="toggle-group" style={{ flexWrap: 'wrap' }}>
            <label className={`toggle-btn ${!isScheduled && !isDeadMansSwitchVal ? 'active' : ''}`}>
              <input type="radio" checked={!isScheduled && !isDeadMansSwitchVal} onChange={() => { setIsScheduled(false); setIsDeadMansSwitchVal(false); }} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              Send Now
            </label>
            <label className={`toggle-btn ${isScheduled && !isDeadMansSwitchVal ? 'active' : ''}`}>
              <input type="radio" checked={isScheduled && !isDeadMansSwitchVal} onChange={() => { setIsScheduled(true); setIsDeadMansSwitchVal(false); }} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Schedule
            </label>
            <label className={`toggle-btn ${isDeadMansSwitchVal ? 'active' : ''}`}>
              <input type="radio" checked={isDeadMansSwitchVal} onChange={() => { setIsScheduled(true); setIsDeadMansSwitchVal(true); }} />
              ☠️ Dead Man's Switch
            </label>
          </div>

          {isScheduled && !isDeadMansSwitchVal && (
            <div className="input-group">
              <label htmlFor="date">Delivery Date & Time</label>
              <div className="quick-dates">
                <button type="button" className="btn btn-quick" onClick={() => setQuickDate(1)}>+1 Day</button>
                <button type="button" className="btn btn-quick" onClick={() => setQuickDate(7)}>+1 Week</button>
                <button type="button" className="btn btn-quick" onClick={() => setQuickDate(30)}>+1 Month</button>
                <button type="button" className="btn btn-quick" onClick={() => setQuickDate(365)}>+1 Year</button>
                <button type="button" className="btn btn-quick" onClick={() => setQuickDate(365 * 5)}>+5 Years</button>
                <button type="button" className="btn btn-quick" onClick={() => setQuickDate(365 * 10)}>+10 Years</button>
              </div>
              <input
                type="datetime-local"
                id="date"
                value={dateVal || ''}
                onChange={(e) => setDateVal(e.target.value)}
                required
                min={(() => {
                  const d = new Date();
                  const offset = d.getTimezoneOffset() * 60000;
                  return new Date(d - offset).toISOString().slice(0, 16);
                })()}
              />
            </div>
          )}

          {isDeadMansSwitchVal && (
            <div className="input-group" style={{ padding: '15px', background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.2)', borderRadius: '8px' }}>
              <p style={{ margin: 0, color: '#ec4899', fontSize: '0.95rem' }}><strong>Dead Man's Switch Active:</strong> This capsule will bypass the date picker and automatically be delivered if you do not log into your account for 1 full year.</p>
            </div>
          )}

          {isScheduled && !isDeadMansSwitchVal && (
            <div className="input-group recurring-check">
              <input type="checkbox" id="recurring" checked={isRecurringVal} onChange={(e) => setIsRecurringVal(e.target.checked)} />
              <label htmlFor="recurring">Make this a recurring yearly capsule</label>
            </div>
          )}

          <div className="input-group recurring-check" style={{ marginTop: '15px' }}>
            <input type="checkbox" id="isPublic" checked={isPublicVal} onChange={(e) => setIsPublicVal(e.target.checked)} />
            <label htmlFor="isPublic">Make this capsule public (anonymously) in the Global Gallery once it is delivered.</label>
          </div>

          <div className="input-group" style={{ padding: '15px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', marginTop: '15px' }}>
            <div className="recurring-check" style={{ margin: 0 }}>
              <input type="checkbox" id="isPhysical" checked={isPhysicalVal} onChange={(e) => setIsPhysicalVal(e.target.checked)} />
              <label htmlFor="isPhysical" style={{ color: '#f59e0b', fontWeight: 'bold' }}>💌 Premium: Deliver as a Physical Printed Letter</label>
            </div>
            {isPhysicalVal && (
              <div style={{ marginTop: '15px' }}>
                <label htmlFor="physicalAddress" style={{ color: '#f59e0b' }}>Recipient Mailing Address</label>
                <textarea id="physicalAddress" rows="3" placeholder="123 Future Lane..." value={physicalAddressVal || ''} onChange={(e) => setPhysicalAddressVal(e.target.value)} required={isPhysicalVal} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
              </div>
            )}
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ marginBottom: 0 }}>Attachment / Media</label>
              {fileVal && !isRecordingMode && (
                <div className="attachment-active-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  {fileVal.name.includes('audio_note') ? 'Audio Note' : fileVal.name.includes('video_message') ? 'Video Message' : 'File'} Ready
                </div>
              )}
            </div>
            {!isRecordingMode ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                <label className="file-upload-zone" style={{ flex: '1 1 200px', margin: 0, border: fileVal && !fileVal.name.includes('audio_note') && !fileVal.name.includes('video_message') ? '2px dashed #10b981' : '' }}>
                  <img src={fileVal == null ? uploadLogo : check} alt="file icon" className="upload-icon" />
                  <span className="upload-text">{fileVal == null ? 'Click to attach files' : (fileVal.name.includes('audio_note') || fileVal.name.includes('video_message')) ? 'Replace with a file' : fileVal.name}</span>
                  <input type="file" onChange={handleFileChange} hidden /> 
                  {fileVal && (
                    <button type="button" className="clear-file-btn" onClick={(e) => { e.stopPropagation(); setFileVal(null); }}>&times;</button>
                  )}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: '1 1 200px' }}>
                  <button type="button" className="btn" onClick={() => startMedia(true)} style={{ width: '100%', background: fileVal?.name.includes('audio_note') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: `1px solid ${fileVal?.name.includes('audio_note') ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '15px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    {fileVal ? 'Replace with Audio' : 'Record Audio Note'}
                  </button>
                  <button type="button" className="btn" onClick={() => startMedia(false)} style={{ width: '100%', background: fileVal?.name.includes('video_message') ? 'rgba(236, 72, 153, 0.2)' : 'rgba(236, 72, 153, 0.1)', color: '#ec4899', border: `1px solid ${fileVal?.name.includes('video_message') ? '#ec4899' : 'rgba(236, 72, 153, 0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '15px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    {fileVal ? 'Replace with Video' : 'Record Video Message'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="video-recording-zone" style={{ background: '#0f172a', borderRadius: '12px', overflow: 'hidden', position: 'relative', minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                {!isAudioOnly ? (
                  <video ref={videoRef} muted playsInline style={{ width: '100%', display: 'block', maxHeight: '400px', objectFit: 'cover' }}></video>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div className={`audio-mic-icon ${isRecording ? 'pulsing' : ''}`} style={{ marginBottom: '15px', color: '#3b82f6' }}>
                      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{isRecording ? 'Recording your voice note...' : 'Microphone Ready'}</p>
                  </div>
                )}
                
                <div style={{ position: 'absolute', bottom: '20px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  {!isRecording ? (
                    <>
                      <button type="button" className="btn" style={{ background: '#ef4444', color: '#fff', borderRadius: '30px', padding: '10px 25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }} onClick={startRecording}>
                        {isAudioOnly ? '⏺ Start Audio' : '🔴 Start Video'}
                      </button>
                      <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', borderRadius: '30px', padding: '10px 20px', backdropFilter: 'blur(5px)' }} onClick={stopMedia}>Cancel</button>
                    </>
                  ) : (
                    <button type="button" className="btn" style={{ background: '#fff', color: '#1e293b', borderRadius: '30px', padding: '10px 30px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255,255,255,0.2)' }} onClick={stopRecording}>
                      ⏹ Stop & Save
                    </button>
                  )}
                </div>
                {isRecording && (
                  <div style={{ position: 'absolute', top: '20px', right: '20px', background: '#ef4444', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'blink 1s infinite' }}></span>
                    RECORDING
                  </div>
                )}
              </div>
            )}
            {fileVal && !isRecordingMode && previewUrl && (
              <div className="attachment-preview">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Attachment Preview
                  </span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {(fileVal.name.includes('audio_note') || fileVal.name.includes('video_message')) && (
                      <button type="button" onClick={() => {
                        const a = document.createElement('a');
                        a.href = previewUrl;
                        a.download = fileVal.name;
                        a.click();
                      }} style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>
                        Download Copy
                      </button>
                    )}
                    <button type="button" onClick={() => setFileVal(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
                  </div>
                </div>
                {fileVal.type.startsWith('video/') && (
                  <video src={previewUrl} controls className="preview-player" />
                )}
                {fileVal.type.startsWith('audio/') && (
                  <audio src={previewUrl} controls className="preview-player" />
                )}
                {fileVal.type.startsWith('image/') && (
                  <img src={previewUrl} alt="Preview" className="preview-player" style={{ objectFit: 'contain' }} />
                )}
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{fileVal.name} ({(fileVal.size / 1024 / 1024).toFixed(2)} MB)</p>
              </div>
            )}
          </div>
          
          <button type="submit" className="btn btn-primary full-width mt-4">Review & Submit</button>
        </form>
      </div>
    </section>
  );
}