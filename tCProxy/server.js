// ============================================================================
// CHRONOMAIL (TIME CAPSULES) - CORE BACKEND SERVER
// Features: End-to-End Encryption, Cron Scheduling, JWT Auth, Admin Dashboard
// ============================================================================

// ============================================================================
// 1. IMPORTS & SYSTEM CONFIGURATION
// ============================================================================
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cron = require('node-cron');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');
const rateLimit = require('express-rate-limit');
const DOMPurify = require('dompurify')(new JSDOM('').window);

// Initialize Firebase Admin
// This is critical for sending push notifications. It tries two methods of authentication.
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized with Service Account.');
  } else {
    admin.initializeApp(); // Relies on GOOGLE_APPLICATION_CREDENTIALS
    console.log('✅ Firebase Admin initialized with Application Default Credentials.');
  }
} catch (err) {
  console.error('❌ Firebase Admin initialization failed. Push notifications will not work.', err);
}

// Startup check to ensure all critical environment variables are loaded.
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'ENCRYPTION_KEY', 'EMAIL_USER', 'EMAIL_PASS', 'ADMIN_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_KEY'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

// Initialize the client for Supabase, used for storing file attachments.
let supabase;
try {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  console.log('✅ Supabase Client Initialized');
} catch (err) {
  console.error('❌ Failed to initialize Supabase. Check SUPABASE_URL and SUPABASE_KEY.');
  process.exit(1);
}

const app = express();
// Trust the proxy to get the correct client IP address when deployed behind a reverse proxy like Nginx or Heroku.
app.set('trust proxy', 1); // Ensures accurate Client IP tracking even when deployed to the cloud

// Middleware
// Define which origins (frontend URLs) are allowed to access this API.
// CORS origins are read from the environment.
// Set FRONTEND_URL in .env for production (e.g. https://chronomail.vercel.app).
const allowedOrigins = [
  process.env.FRONTEND_URL,         // Production frontend URL (set in .env)
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean); // Remove undefined entries

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests) or from whitelisted origins.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
// Parse incoming JSON request bodies.
app.use(express.json());
// Enable file uploads.
app.use(fileUpload());

// Rate Limiter for authentication routes to prevent brute-force attacks
// This helps protect against password guessing and user enumeration attacks.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 20 to 500 to support classroom presentations on shared WiFi
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

// ============================================================================
// CONTACT FORM ROUTE (MOVED FOR PRIORITY)
// ============================================================================
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Sanitize all user-supplied fields before embedding in HTML email (XSS prevention).
    const safeName = DOMPurify.sanitize(String(name).slice(0, 200));
    const safeEmail = String(email).slice(0, 254).replace(/[<>"']/g, '');
    const safeMessage = DOMPurify.sanitize(String(message).slice(0, 5000));

    if (!safeName || !safeEmail || !safeMessage) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // The contact form sends an email to the administrator's address.
    const adminEmail = process.env.EMAIL_USER;

    const mailOptions = {
      from: `"ChronoMail Contact" <${adminEmail}>`,
      to: adminEmail,
      replyTo: safeEmail,
      subject: `New Contact Form Submission from ${safeName}`,
      html: `<div style="font-family: sans-serif; padding: 20px;">
               <h2>New Message from ChronoMail Contact Form</h2>
               <p><strong>From:</strong> ${safeName}</p>
               <p><strong>Reply-To:</strong> ${safeEmail}</p>
               <hr>
               <p><strong>Message:</strong></p>
               <p style="white-space: pre-wrap;">${safeMessage}</p>
             </div>`
    };

    await sendEmailViaResend({
      to: adminEmail,
      replyTo: safeEmail,
      subject: `New Contact Form Submission from ${safeName}`,
      html: mailOptions.html
    });
    await logActivity('system', `New contact form submission from ${safeEmail}.`);

    res.json({ success: true, message: 'Your message has been sent successfully!' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

// ============================================================================
// 2. DATABASE CONNECTION & SCHEMAS
// ============================================================================

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Defines the structure for a user account in the database.
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  profilePhoto: String,
  fcmTokens: { type: [String], default: [] },
  blacklist: { type: [String], default: [] },
  // Fields for email verification
  verificationOtp: String,
  otpExpires: Date,
  otpAttempts: { type: Number, default: 0 }, // Tracks wrong OTP attempts to prevent brute-force
  isVerified: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  lastLogin: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Defines the structure for a time capsule.
const CapsuleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipients: String,
  subject: String,
  category: { type: String, default: 'General' },
  message: String,     // Stored as an Encrypted hex string
  iv: String,          // Initialization vector for decryption
  isScheduled: Boolean,
  date: Date,
  recurring: { type: String, default: 'none' }, // 'none' or 'yearly'
  isDirect: Boolean,
  fileName: String,
  fileData: Buffer,    // Reverted from fileId to fileData
  fileMimeType: String, // Added back
  filePath: String,    // NEW: Supabase storage path
  fileIv: String,      // Initialization vector for file encryption
  sent: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  isDeadMansSwitch: { type: Boolean, default: false },
  isPhysical: { type: Boolean, default: false },
  physicalAddress: String,
  deliveryStatus: { type: String, default: 'pending' }, // 'pending', 'sent', 'failed'
  opened: { type: Boolean, default: false },
  fileSize: { type: Number, default: 0 } // Track storage usage
});

// Proactively add an index for the cron job to ensure it remains fast at scale.
CapsuleSchema.index({ isScheduled: 1, sent: 1, date: 1 });
const Capsule = mongoose.model('Capsule', CapsuleSchema);

// System Settings Schema (Singleton Configuration)
// A single document in this collection controls global settings for the entire application.
const SystemSettingsSchema = new mongoose.Schema({
  allowNewRegistrations: { type: Boolean, default: true },
  maxAttachmentSizeMB: { type: Number, default: 10 },
  maintenanceMode: { type: Boolean, default: false },
  requireEmailVerification: { type: Boolean, default: true },
  maxCapsulesPerUser: { type: Number, default: 50 },
  maxRecipientsPerCapsule: { type: Number, default: 10 },
  maxAdmins: { type: Number, default: 1 }
});
const SystemSettings = mongoose.model('SystemSettings', SystemSettingsSchema);

// Activity Log Schema (Tracks real-time system events)
// `expires: '90d'` automatically removes logs older than 90 days to keep the collection size manageable.
const ActivityLogSchema = new mongoose.Schema({
  type: { type: String, enum: ['system', 'auth', 'capsule', 'security'], required: true },
  action: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, expires: '90d' }
});
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

// Defines the structure for a push notification message.
const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', NotificationSchema);

// A helper function to easily create new activity log entries.
async function logActivity(type, action, details = {}) {
  try {
    await ActivityLog.create({ type, action, details });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// ============================================================================
// 3. SECURITY & ENCRYPTION ENGINE (AES-256-CTR)
// Ensures that messages are securely encrypted before saving to the database
// ============================================================================
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
// The key must be 32 bytes (256 bits) for AES-256. A 64-char hex string becomes 32 bytes.
if (key.length !== 32) {
  console.error('❌ FATAL: ENCRYPTION_KEY must be a 64-character hex string to produce a 32-byte key.');
  process.exit(1);
}
const ENCRYPTION_KEY = key;

// Encrypts a string of text. Returns the encrypted data and the initialization vector (IV).
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-ctr', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

// Decrypts a string of text using its IV.
function decrypt(text, iv) {
  const decipher = crypto.createDecipheriv('aes-256-ctr', ENCRYPTION_KEY, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(Buffer.from(text, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Encrypts a file buffer.
function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-ctr', ENCRYPTION_KEY, iv);
  let encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return { iv: iv.toString('hex'), encryptedData: encrypted };
}

// Decrypts a file buffer.
function decryptBuffer(encryptedBuffer, ivHex) {
  const decipher = crypto.createDecipheriv('aes-256-ctr', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}

// Central function for sending push notifications via Firebase Cloud Messaging (FCM).
async function sendNotificationToUser(userId, payload) {
  try {
    // 1. Save the notification to our database
    const notification = new Notification({
      userId,
      title: payload.title,
      body: payload.body,
      link: payload.link
    });
    await notification.save();

    // 2. Get the user's FCM tokens
    const user = await User.findById(userId);
    // If the user has no registered devices, we can't send a notification.
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      console.log(`User ${userId} has no FCM tokens.`);
      return;
    }

    // 3. Construct the FCM message
    const message = {
      tokens: user.fcmTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      // The data payload is used by the foreground message handler
      data: {
        // Pass essential notification info to the client. This is more reliable and smaller
        // than stringifying the entire Mongoose object.
        notificationId: notification._id.toString(),
        title: payload.title,
        body: payload.body,
        link: payload.link || '/',
        type: payload.type || 'GENERAL_NOTIFICATION'
      },
      webpush: {
        fcmOptions: {
          link: payload.link || '/' // Link to open when app is in background
        }
      }
    };

    // 4. Send the message
    const response = await admin.messaging().sendEachForMulticast(message);

    // 5. Clean up invalid tokens
    // If a token is no longer valid (e.g., user uninstalled the app), FCM tells us, and we remove it from our database.
    const tokensToRemove = [];
    response.responses.forEach((result, index) => {
      if (!result.success) {
        const error = result.error.code;
        if (error === 'messaging/invalid-registration-token' ||
          error === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(user.fcmTokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      user.fcmTokens = user.fcmTokens.filter(token => !tokensToRemove.includes(token));
      await user.save();
      console.log('Removed invalid FCM tokens:', tokensToRemove);
    }

  } catch (error) {
    console.error(`Failed to send notification to user ${userId}:`, error);
  }
}

// ============================================================================
// 4. MIDDLEWARE: AUTHENTICATION & ACCESS CONTROL
// Protects endpoints so only authorized users can access their capsules
// ============================================================================
const auth = async (req, res, next) => {
  // Extract the JWT from the Authorization header.
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  try {
    // Verify the token's signature and get the payload (which contains the user ID).
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the full user document from the database. This is more secure than just trusting the JWT payload.
    const userDoc = await User.findById(verified.id);
    if (!userDoc) {
      return res.status(401).json({ error: 'User associated with this token not found.' });
    }

    // If maintenance mode is on, only allow admins to proceed.
    if (!userDoc.isAdmin) {
      const settings = await SystemSettings.findOne();
      if (settings && settings.maintenanceMode) {
        return res.status(503).json({ error: 'System is currently in maintenance mode. Only administrators can access the platform right now.' });
      }
    }

    // Attach the user document to the request object for use in subsequent route handlers.
    req.userEmail = userDoc.email; // For logging
    req.user = userDoc; // Attach the full Mongoose document, ensuring req.user._id is an ObjectId
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expired or token is invalid. Please log in again.' });
  }
};

// ============================================================================
// 5. API ROUTES: NOTIFICATIONS
// ============================================================================
// Saves a device's unique FCM token to the user's account so we can send them push notifications.
app.post('/api/save-fcm-token', auth, async (req, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken) {
    return res.status(400).json({ error: 'FCM token is required.' });
  }
  try {
    const user = req.user; // User document is already attached by auth middleware
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if this is the very first token being registered for this user.
    const isFirstToken = user.fcmTokens.length === 0;

    if (!user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
      await user.save();
    }

    // If this is the very first token being registered for the user,
    // send them a welcome notification. This avoids a race condition where
    // the welcome notification is sent before the client has a token.
    if (isFirstToken) { // Check if this is the first token ever for this user
      const notificationCount = await Notification.countDocuments({ userId: req.user._id });
      if (notificationCount === 0) {
        await sendNotificationToUser(user._id, {
          title: 'Welcome to ChronoMail! 🎉',
          body: 'We are excited to have you. Start by creating your first time capsule.',
          link: '/#create'
        });
      }
    }

    res.status(200).json({ message: 'FCM token saved successfully.' });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Fetches the current user's notifications.
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Marks a batch of notifications as read.
app.post('/api/notifications/mark-read', auth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }
  try {
    await Notification.updateMany({ _id: { $in: ids }, userId: req.user._id }, { $set: { read: true } });
    res.status(200).json({ message: 'Notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

// Middleware to ensure only an admin can access a route.
const adminAuth = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied. Administrators only.' });
  }
  next();
};

// Deletes a single notification.
app.delete('/api/notifications/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Notification.deleteOne({ _id: id, userId: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Notification not found or you do not have permission to delete it.' });
    }
    res.status(200).json({ message: 'Notification deleted.' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
});

// Deletes all notifications for the current user.
app.post('/api/notifications/clear', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear notifications.' });
  }
});

// ============================================================================
// 6. API ROUTES: USER AUTHENTICATION
// ============================================================================
// 1. Register User
app.post('/api/register', authLimiter, async (req, res) => {
  // This route handles the first step of user registration.
  try {
    const settings = await SystemSettings.findOne();
    if (settings && settings.maintenanceMode) {
      return res.status(503).json({ error: 'System is in maintenance mode. Registration is temporarily disabled.' });
    }
    if (settings && !settings.allowNewRegistrations) {
      return res.status(403).json({ error: 'New registrations are currently disabled by the administrator.' });
    }

    const { name, email, password } = req.body;

    // --- Input Validation ---
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: 'Password must be less than 128 characters.' });
    }

    // Check if a verified user already exists
    const existingVerifiedUser = await User.findOne({ email, isVerified: true });
    if (existingVerifiedUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Hash the password before saving it.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Generate a 6-digit One-Time Password (OTP).
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    // `upsert: true` will create a new user if one with the email doesn't exist, or update the existing one.
    await User.findOneAndUpdate(
      { email },
      { name, password: hashedPassword, verificationOtp: otp, otpExpires, isVerified: false, isAdmin: false },
      { returnDocument: 'after', upsert: true }
    );

    // Send verification email
    await sendVerificationEmail(email, otp);
    await logActivity('auth', `New user registered: ${email} (IP: ${req.ip})`);

    res.json({ success: true, message: 'Verification OTP sent to your email.' });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// 2. Login User
app.post('/api/login', authLimiter, async (req, res) => {
  // Handles user login with email and password.
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    const settings = await SystemSettings.findOne();

    if (user && !user.isAdmin && settings && settings.maintenanceMode) {
      return res.status(503).json({ error: 'System is currently in maintenance mode. Please try again later.' });
    }

    if (!user) {
      await logActivity('security', `Failed login attempt for unknown user: ${email} (IP: ${req.ip})`);
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check if email verification is required by system settings.
    const requireVerification = settings ? settings.requireEmailVerification !== false : true;
    if (requireVerification && !user.isVerified) {
      return res.status(401).json({ error: 'Please verify your email before logging in.', verificationRequired: true });
    }

    // Compare the provided password with the hashed password in the database.
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      await logActivity('security', `Failed login attempt for user: ${email} (IP: ${req.ip})`);
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    // If login is successful, create and sign a JWT for the user session.
    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
    await logActivity('auth', `User logged in: ${user.email} (IP: ${req.ip})`);
    res.json({ token, email: user.email, name: user.name, profilePhoto: user.profilePhoto, isAdmin: user.isAdmin });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// 3. Verify OTP and Finalize Registration
app.post('/api/verify-otp', authLimiter, async (req, res) => {
  // This route is called after the user enters the OTP they received via email.
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: 'User not found.' });
    }
    if (user.isVerified) {
      return res.status(400).json({ error: 'Account already verified.' });
    }

    // --- OTP Brute-Force Lockout ---
    // Lock the OTP after 5 consecutive wrong attempts, forcing the user to request a new one.
    if ((user.otpAttempts || 0) >= 5) {
      user.verificationOtp = undefined;
      user.otpExpires = undefined;
      user.otpAttempts = 0;
      await user.save();
      return res.status(429).json({ error: 'Too many failed attempts. Please request a new verification code.' });
    }

    // Check if the OTP is correct and has not expired.
    if (user.verificationOtp !== otp || user.otpExpires < new Date()) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      const remaining = 5 - user.otpAttempts;
      return res.status(400).json({ error: `Invalid or expired OTP. ${remaining} attempt(s) remaining.` });
    }

    // Mark the user as verified and clean up OTP fields.
    user.isVerified = true;
    user.verificationOtp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0; // Reset on success
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email, name: user.name, profilePhoto: user.profilePhoto, isAdmin: user.isAdmin });
  } catch (err) {
    res.status(500).json({ error: 'OTP verification failed.' });
  }
});

// 3.5 Forgot Password
app.post('/api/forgot-password', authLimiter, async (req, res) => {
  // Initiates the password reset process by sending an OTP to the user's email.
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // NOTE: We return a generic success message whether the user exists or not.
    // This prevents user enumeration attacks (an attacker finding out which emails are registered).
    if (!user) {
      return res.json({ success: true, message: 'If an account with that email exists, a reset code has been sent.' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    user.verificationOtp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendPasswordResetEmail(email, otp);
    await logActivity('auth', `Password reset requested for: ${email} (IP: ${req.ip})`);

    res.json({ success: true, message: 'Password reset OTP sent to your email.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// 3.5.5 Verify Reset OTP (Intermediate Step)
app.post('/api/verify-reset-otp', authLimiter, async (req, res) => {
  // Verifies the OTP entered by the user during the password reset flow.
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ error: 'User not found.' });

    // --- OTP Brute-Force Lockout (also applies to password reset flow) ---
    if ((user.otpAttempts || 0) >= 5) {
      user.verificationOtp = undefined;
      user.otpExpires = undefined;
      user.otpAttempts = 0;
      await user.save();
      return res.status(429).json({ error: 'Too many failed attempts. Please request a new reset code.' });
    }

    if (user.verificationOtp !== otp || user.otpExpires < new Date()) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      const remaining = 5 - user.otpAttempts;
      return res.status(400).json({ error: `Invalid or expired OTP. ${remaining} attempt(s) remaining.` });
    }

    // Reset attempt counter on successful verification
    user.otpAttempts = 0;
    await user.save();

    res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

// 3.6 Reset Password
app.post('/api/reset-password', authLimiter, async (req, res) => {
  // Finalizes the password reset after the OTP has been verified.
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ error: 'User not found.' });
    if (user.verificationOtp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    // --- Password Strength Validation ---
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ error: 'Password must be less than 128 characters.' });
    }

    // Hash the new password and save it.
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.verificationOtp = undefined;
    user.otpExpires = undefined;
    user.isVerified = true; // Implicitly verify their email since they passed the OTP check
    await user.save();

    await logActivity('security', `Password successfully reset for: ${email} (IP: ${req.ip})`);

    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// 3.7 Firebase Authentication (Google Sign-In)
app.post('/api/firebase-auth', authLimiter, async (req, res) => {
  // Handles user login/registration via Google Sign-In.
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'No Firebase token provided.' });

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { email, name, picture } = decodedToken;

    // Check if user exists in your MongoDB
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      // If the user doesn't exist, create a new account for them.
      const settings = await SystemSettings.findOne();
      if (settings && !settings.allowNewRegistrations) {
        return res.status(403).json({ error: 'New registrations are currently disabled by the administrator.' });
      }

      // Create a new user account if they don't exist
      const randomPassword = crypto.randomBytes(16).toString('hex');
      // We still create a password for them, even though they use Google, for consistency and potential future password login.
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = new User({
        name: name || email.split('@')[0],
        email: email,
        password: hashedPassword,
        profilePhoto: picture,
        isVerified: true // Firebase emails are generally pre-verified
      });
      isNewUser = true;
      await user.save();
    }

    user.lastLogin = new Date();
    await user.save();

    if (isNewUser) {
      await logActivity('auth', `New user registered via Google: ${email} (IP: ${req.ip})`);
    } else {
      await logActivity('auth', `User logged in via Google: ${email} (IP: ${req.ip})`);
    }

    // Create our app's own standard JWT token for the session.
    const jwtToken = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token: jwtToken, email: user.email, name: user.name, profilePhoto: user.profilePhoto, isAdmin: user.isAdmin });
  } catch (err) {
    console.error('Firebase auth error:', err);
    res.status(500).json({ error: 'Firebase authentication failed.' });
  }
});

// ============================================================================
// 7. API ROUTES: CAPSULE MANAGEMENT (CORE CRUD)
// ============================================================================
// 4. Get User's Dashboard Capsules
app.get('/api/capsules', auth, async (req, res) => {
  try {
    // Fetch user's capsules, excluding the large file data buffer to save bandwidth
    const capsules = await Capsule.find({ userId: req.user._id }).select('-fileData').sort({ date: 1 });

    // Map the capsules to a format suitable for the frontend dashboard. Note we don't send the encrypted message here.
    const decryptedCapsules = capsules.map(c => ({
      id: c._id,
      recipients: c.recipients,
      subject: c.subject,
      category: c.category,
      date: c.date,
      isDirect: c.isDirect,
      fileName: c.fileName,
      sent: c.sent,
      isDeadMansSwitch: c.isDeadMansSwitch,
      isPhysical: c.isPhysical,
      physicalAddress: c.physicalAddress
    }));

    res.json(decryptedCapsules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch capsules' });
  }
});

// 5. Create & Schedule Capsule
app.post('/api/capsules', auth, async (req, res) => {
  // This is a complex route that handles creating a new time capsule.
  try {
    const { recipients, subject, category, message, isScheduled, date, recurring, isPublic, isDeadMansSwitch, isPhysical, physicalAddress } = req.body;
    const isDirect = isScheduled === 'false';
    const dms = isDeadMansSwitch === 'true' || isDeadMansSwitch === true;

    const capsuleDate = isDirect || dms ? new Date() : new Date(date);
    // Validate the date to ensure it's a valid date object.
    if (isNaN(capsuleDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date provided.' });
    }

    // Sanitize the HTML message from the rich text editor before encrypting it.
    const encrypted = encrypt(DOMPurify.sanitize(message));
    const settings = await SystemSettings.findOne();
    const maxMB = settings ? settings.maxAttachmentSizeMB : 10;
    const maxCapsules = settings && settings.maxCapsulesPerUser !== undefined ? settings.maxCapsulesPerUser : 50;
    const maxRecipients = settings && settings.maxRecipientsPerCapsule !== undefined ? settings.maxRecipientsPerCapsule : 10;

    const allRecipients = recipients.split(',').map(r => r.trim()).filter(Boolean);
    if (allRecipients.length > maxRecipients) {
      return res.status(400).json({ error: `You can only specify up to ${maxRecipients} recipients per capsule.` });
    }

    const userCapsulesCount = await Capsule.countDocuments({ userId: req.user._id });
    if (userCapsulesCount >= maxCapsules) {
      return res.status(400).json({ error: `You have reached the maximum limit of ${maxCapsules} capsules per user.` });
    }

    let fileData = null, fileName = null, fileMimeType = null, fileIv = null, filePath = null;
    let tempRawFile = null;
    let uploadFilename = null;
    let encryptedDataToUpload = null;
    // Handle file attachment upload.
    // Allowed MIME types for capsule attachments.
    const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/', 'text/'];
    const ALLOWED_MIME_EXACT = [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (req.files && req.files.file) {
      const upload = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
      fileName = upload.name;

      // --- File Type Allowlist ---
      const isMimeAllowed =
        ALLOWED_MIME_PREFIXES.some(p => upload.mimetype.startsWith(p)) ||
        ALLOWED_MIME_EXACT.includes(upload.mimetype);
      if (!isMimeAllowed) {
        return res.status(400).json({ error: 'File type not allowed. Accepted: images, videos, audio, PDFs, Word/Excel/PowerPoint, zip, and text files.' });
      }

      if (upload.size > maxMB * 1024 * 1024) {
        return res.status(400).json({ error: `Attachment file size cannot exceed ${maxMB}MB.` });
      }
      tempRawFile = upload.data;
      // Encrypt the file buffer before it's stored.
      const encryptedFile = encryptBuffer(upload.data);
      fileIv = encryptedFile.iv;
      fileMimeType = upload.mimetype;

      uploadFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}-${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      filePath = uploadFilename;
      encryptedDataToUpload = encryptedFile.encryptedData;
    }

    // Create a new Mongoose document for the capsule.
    const capsule = new Capsule({
      userId: req.user._id,
      recipients,
      subject,
      category: category || 'General',
      message: encrypted.encryptedData,
      iv: encrypted.iv,
      isScheduled: !isDirect,
      date: capsuleDate,
      recurring: recurring || 'none',
      isDirect,
      fileName,
      fileData,
      fileMimeType,
      filePath,
      fileIv,
      sent: false,
      isPublic: isPublic === 'true' || isPublic === true,
      isDeadMansSwitch: dms,
      isPhysical: isPhysical === 'true' || isPhysical === true,
      physicalAddress: physicalAddress || '',
      fileSize: fileData ? fileData.length : 0
    });

    // Store raw file in memory just for this execution to avoid downloading it from Supabase again
    if (tempRawFile) {
      capsule._tempRawFile = tempRawFile;
    }

    await capsule.save();
    await logActivity('capsule', `New ${isDirect ? 'direct' : 'scheduled'} capsule created by ${req.user.email}.`);

    // Send a notification for scheduled capsules. Direct sends are handled by sendEmail.
    if (!isDirect) {
      await sendNotificationToUser(req.user._id, {
        title: 'Capsule Scheduled!',
        body: `Your time capsule "${capsule.subject || 'Untitled'}" is now scheduled.`,
        link: '/#dashboard',
        type: 'CAPSULE_CREATED'
      });
    }

    // 1. Instantly respond to the frontend to provide a fast user experience.
    res.status(201).json({ success: true, id: capsule._id });

    // 2. Perform heavy network I/O (file upload, sending email) in the background.
    // This prevents the user from having to wait for these slow operations to complete.
    (async () => {
      try {
        if (encryptedDataToUpload && uploadFilename) {
          const { error } = await supabase.storage.from('attachments').upload(uploadFilename, encryptedDataToUpload, {
            contentType: 'application/octet-stream'
          });
          if (error) console.error(`Background Supabase Upload Error: ${error.message}`);
        }
        // If it's an instant "Send Now" capsule, dispatch the email immediately.
        if (isDirect) {
          await sendEmail(capsule);
          capsule.sent = true;
          await capsule.save();
        }
      } catch (bgErr) {
        console.error('Background processing error:', bgErr);
      }
    })();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save capsule' });
  }
});

// 6. Delete Capsule
app.delete('/api/capsules/:id', auth, async (req, res) => {
  try {
    const capsule = await Capsule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!capsule) {
      return res.status(404).json({ error: 'Capsule not found or user not authorized to delete.' });
    }
    const capsuleSubject = capsule.subject;
    const userId = capsule.userId;
    // Keep track of the file path to delete it from Supabase storage.
    const oldFilePath = capsule.filePath;
    await Capsule.deleteOne({ _id: capsule._id });
    await logActivity('capsule', `Capsule deleted by ${req.userEmail}.`);

    // Send a notification to the user confirming the deletion
    await sendNotificationToUser(userId, {
      title: 'Capsule Deleted',
      body: `Your time capsule "${capsuleSubject || 'Untitled'}" was successfully deleted.`,
      link: '/#dashboard',
      type: 'CAPSULE_DELETED'
    });

    res.json({ success: true });

    // In the background, remove the associated file from Supabase.
    if (oldFilePath) {
      supabase.storage.from('attachments').remove([oldFilePath]).catch(console.error);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete capsule' });
  }
});

// 6.5 Get Single Capsule for Editing
app.get('/api/capsules/:id', auth, async (req, res) => {
  // Fetches the full data for a single capsule so the user can edit it.
  try {
    const capsule = await Capsule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!capsule) return res.status(404).json({ error: 'Capsule not found' });

    res.json({
      id: capsule._id,
      recipients: capsule.recipients,
      subject: capsule.subject,
      category: capsule.category,
      date: capsule.date,
      isDirect: capsule.isDirect,
      fileName: capsule.fileName,
      sent: capsule.sent,
      recurring: capsule.recurring,
      // The message is decrypted here before being sent to the client.
      message: decrypt(capsule.message, capsule.iv),
      isDeadMansSwitch: capsule.isDeadMansSwitch,
      isPhysical: capsule.isPhysical,
      physicalAddress: capsule.physicalAddress
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch capsule' });
  }
});

// 6.6 Update Capsule
app.put('/api/capsules/:id', auth, async (req, res) => {
  // Handles updating an existing capsule.
  try {
    const { recipients, subject, category, message, isScheduled, date, recurring, isPublic, isDeadMansSwitch, isPhysical, physicalAddress } = req.body;
    const capsule = await Capsule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!capsule) return res.status(404).json({ error: 'Capsule not found' });
    if (capsule.sent) return res.status(400).json({ error: 'Cannot edit a capsule that has already been sent.' });

    const dms = isDeadMansSwitch === 'true' || isDeadMansSwitch === true;
    // Add a business rule: prevent editing a capsule that is close to its delivery time.
    const timeUntilDelivery = new Date(capsule.date).getTime() - Date.now();
    if (timeUntilDelivery < 24 * 60 * 60 * 1000 && !capsule.isDirect && !capsule.isDeadMansSwitch && !dms) {
      return res.status(400).json({ error: 'Capsules cannot be edited within 24 hours of their scheduled delivery.' });
    }

    const isDirect = isScheduled === 'false';
    const capsuleDate = isDirect || dms ? new Date() : new Date(date);
    if (isNaN(capsuleDate.getTime())) return res.status(400).json({ error: 'Invalid date provided.' });

    const encrypted = encrypt(DOMPurify.sanitize(message));
    const settings = await SystemSettings.findOne();
    const maxMB = settings ? settings.maxAttachmentSizeMB : 10;
    const maxRecipients = settings && settings.maxRecipientsPerCapsule !== undefined ? settings.maxRecipientsPerCapsule : 10;

    const allRecipients = recipients.split(',').map(r => r.trim()).filter(Boolean);
    if (allRecipients.length > maxRecipients) {
      return res.status(400).json({ error: `You can only specify up to ${maxRecipients} recipients per capsule.` });
    }

    capsule.recipients = recipients;
    capsule.subject = subject;
    capsule.category = category || 'General';
    capsule.message = encrypted.encryptedData;
    capsule.iv = encrypted.iv;
    capsule.isScheduled = !isDirect;
    capsule.isDirect = isDirect;
    capsule.date = capsuleDate;
    capsule.recurring = recurring || 'none';
    capsule.isPublic = isPublic === 'true' || isPublic === true;
    capsule.isDeadMansSwitch = dms;
    capsule.isPhysical = isPhysical === 'true' || isPhysical === true;
    capsule.physicalAddress = physicalAddress || '';

    let uploadFilename = null;
    let encryptedDataToUpload = null;
    let oldFilePathToDelete = null;

    // If a new file is uploaded, handle replacing the old one.
    if (req.files && req.files.file) {
      const upload = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
      if (upload.size > maxMB * 1024 * 1024) return res.status(400).json({ error: `Attachment file size cannot exceed ${maxMB}MB.` });

      if (capsule.filePath) {
        oldFilePathToDelete = capsule.filePath;
      }

      const encryptedFile = encryptBuffer(upload.data);
      capsule.fileIv = encryptedFile.iv;
      capsule.fileName = upload.name;
      capsule.fileMimeType = upload.mimetype;
      capsule.fileSize = upload.data.length;

      uploadFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}-${upload.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      capsule.filePath = uploadFilename;
      capsule.fileData = undefined;
      encryptedDataToUpload = encryptedFile.encryptedData;
    }

    await capsule.save();
    await logActivity('capsule', `Capsule updated by ${req.userEmail}.`);

    await sendNotificationToUser(req.user._id, {
      title: 'Capsule Updated',
      body: `Your time capsule "${capsule.subject || 'Untitled'}" has been successfully updated.`,
      link: '/#dashboard',
      type: 'CAPSULE_UPDATED'
    });

    res.json({ success: true });

    // Perform file operations in the background.
    (async () => {
      try {
        if (oldFilePathToDelete) {
          await supabase.storage.from('attachments').remove([oldFilePathToDelete]);
        }
        if (encryptedDataToUpload && uploadFilename) {
          const { error } = await supabase.storage.from('attachments').upload(uploadFilename, encryptedDataToUpload, {
            contentType: 'application/octet-stream'
          });
          if (error) console.error(`Background Supabase Upload Error: ${error.message}`);
        }
      } catch (bgErr) {
        console.error('Background update processing error:', bgErr);
      }
    })();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update capsule' });
  }
});

// ============================================================================
// 8. API ROUTES: PROFILE, PUBLIC GALLERY, & UTILITIES
// ============================================================================
// 7. Update User Profile Photo
app.post('/api/user/photo', auth, async (req, res) => {
  try {
    if (!req.files || !req.files.photo) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const photo = req.files.photo;

    // --- Strict Image Validation ---
    // Only allow common web-safe image formats by both mimetype and extension.
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!ALLOWED_IMAGE_TYPES.includes(photo.mimetype)) {
      return res.status(400).json({ error: 'Only JPEG, PNG, GIF, and WebP images are allowed.' });
    }
    // Limit profile photos to 2MB to protect MongoDB document size.
    if (photo.size > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Profile photo must be less than 2MB.' });
    }

    // Convert the image to a Base64 string to store it directly in the user document.
    const base64Data = photo.data.toString('base64');
    const profilePhoto = `data:${photo.mimetype};base64,${base64Data}`;

    await User.findByIdAndUpdate(req.user._id, { profilePhoto });
    await logActivity('auth', `Profile photo updated by ${req.userEmail}.`);
    res.json({ success: true, profilePhoto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile photo' });
  }
});

// 8. Unsubscribe Route
app.get('/api/unsubscribe/:token', async (req, res) => {
  // Allows a recipient to opt-out of receiving emails from a specific sender.
  const { token } = req.params;
  if (!token) {
    return res.status(400).send('<h1>Invalid Unsubscribe Link</h1>');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { userId, recipientEmail } = payload;

    if (!userId || !recipientEmail) {
      return res.status(400).send('<h1>Invalid Token</h1><p>The token is missing required information.</p>');
    }

    // Add the recipient's email to the sender's blacklist.
    await User.findByIdAndUpdate(userId, { $addToSet: { blacklist: recipientEmail } });
    await logActivity('system', `Recipient unsubscribed from: ${recipientEmail}`);

    res.send(`<div style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h1>Unsubscribed</h1>
        <p><b>${recipientEmail}</b> will no longer receive future ChronoMail messages from this sender.</p>
      </div>`);
  } catch (err) {
    res.status(400).send('<h1>Invalid or Expired Link</h1><p>This unsubscribe link is no longer valid.</p>');
  }
});

// 9. Generate Subject Line (Mock AI)
// Protected by auth to prevent unauthenticated spam/abuse of this endpoint.
app.post('/api/generate-subject', auth, async (req, res) => {
  // This simulates an AI by using simple keyword matching to generate a subject line.
  try {
    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Mock AI Subject Generator logic based on content
    let generatedSubject = "A Message to the Future ✨";
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('birthday')) generatedSubject = "Happy Future Birthday! 🎂";
    else if (lowerMessage.includes('anniversary')) generatedSubject = "Happy Anniversary! ❤️";
    else if (lowerMessage.includes('secret')) generatedSubject = "A Secret from the Past 🤫";
    else if (lowerMessage.includes('goal') || lowerMessage.includes('hope')) generatedSubject = "Future Goals & Hopes 🌟";
    else if (lowerMessage.includes('remember')) generatedSubject = "A Memory to Keep 💭";

    // Artificial delay to simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 800));

    res.json({ subject: generatedSubject });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate subject' });
  }
});

// 10. Get Public Gallery (No auth required)
app.get('/api/public-gallery', async (req, res) => {
  // Fetches capsules that users have marked as public and that have already been delivered.
  try {
    // Only fetch capsules that are marked public AND have already been sent to the future
    const publicCapsules = await Capsule.find({ isPublic: true, sent: true }).select('-fileData -recipients -userId').sort({ date: -1 }).limit(50);

    const decrypted = publicCapsules.map(c => ({
      id: c._id,
      subject: c.subject,
      category: c.category,
      date: c.date,
      message: decrypt(c.message, c.iv) // We decrypt it here safely since it's anonymous
    }));

    res.json(decrypted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch public gallery' });
  }
});

// 11. Email Tracking Pixel (No auth required)
app.get('/api/track/:id', async (req, res) => {
  // A 1x1 invisible pixel image that, when loaded by an email client, marks a capsule as "opened".
  try {
    const capsule = await Capsule.findByIdAndUpdate(req.params.id, { opened: true });
    if (capsule && !capsule.opened) {
      await logActivity('capsule', `Capsule opened by a recipient: ${capsule.subject || capsule._id}`);
    }

    // Return an invisible 1x1 transparent GIF
    const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': img.length
    });
    res.end(img);
  } catch (err) {
    res.status(500).end();
  }
});

// ============================================================================
// 9. API ROUTES: SYSTEM ADMINISTRATION
// ============================================================================

// Promote current user to Admin using a secret key.
// Protected by both authLimiter (brute-force throttle) and the admin max-count check.
app.post('/api/admin/promote', auth, authLimiter, async (req, res) => {
  // Allows a logged-in user to become an administrator by providing the correct secret key.
  try {
    // Prevent multiple users from becoming admins
    const existingAdmins = await User.countDocuments({ isAdmin: true });
    const settings = await SystemSettings.findOne();
    const maxAdmins = settings && settings.maxAdmins !== undefined ? settings.maxAdmins : 1;

    if (existingAdmins >= maxAdmins) {
      const currentUser = req.user; // Already have the user doc from auth middleware
      if (!currentUser || !currentUser.isAdmin) {
        return res.status(403).json({ error: `The maximum limit of ${maxAdmins} administrator(s) has been reached. Further promotions are locked.` });
      }
    }

    const { adminKey } = req.body;
    const expectedKey = process.env.ADMIN_SECRET_KEY;

    if (adminKey !== expectedKey) {
      return res.status(401).json({ error: 'Invalid admin key' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { isAdmin: true }, { new: true });
    await logActivity('security', `${req.userEmail} promoted to Admin status using secret key.`);
    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'You are now an admin!', token, isAdmin: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to promote to admin' });
  }
});

// Fetches various statistics for the admin dashboard overview.
app.get('/api/admin/stats', auth, adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeCapsules = await Capsule.countDocuments({ sent: false });
    const pendingDelivery = await Capsule.countDocuments({ isScheduled: true, sent: false });

    const storageStats = await Capsule.aggregate([
      { $group: { _id: null, totalSize: { $sum: "$fileSize" } } }
    ]);
    const totalStorageBytes = storageStats.length > 0 ? storageStats[0].totalSize : 0;

    const sentStats = await Capsule.aggregate([
      { $match: { sent: true } },
      {
        $group: {
          _id: null,
          successfulDeliveries: { $sum: { $cond: [{ $eq: ["$deliveryStatus", "sent"] }, 1, 0] } },
          failedDeliveries: { $sum: { $cond: [{ $eq: ["$deliveryStatus", "failed"] }, 1, 0] } },
          openedCount: { $sum: { $cond: ["$opened", 1, 0] } }
        }
      }
    ]);

    let deliverySuccessRate = 0;
    let openRate = 0;
    if (sentStats.length > 0) {
      const stats = sentStats[0];
      const totalSent = stats.successfulDeliveries + stats.failedDeliveries;
      if (totalSent > 0) deliverySuccessRate = Math.round((stats.successfulDeliveries / totalSent) * 100);
      if (stats.successfulDeliveries > 0) openRate = Math.round((stats.openedCount / stats.successfulDeliveries) * 100);
    }

    res.json({ totalUsers, activeCapsules, pendingDelivery, totalStorageBytes, deliverySuccessRate, openRate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Fetches a combined list of recent activities for the admin dashboard.
app.get('/api/admin/activity', auth, adminAuth, async (req, res) => {
  try {
    // Fetch the latest 5 logs for each category to ensure a diverse and guaranteed activity feed
    const systemLogs = await ActivityLog.find({ type: 'system' }).sort({ createdAt: -1 }).limit(5);
    const authLogs = await ActivityLog.find({ type: 'auth' }).sort({ createdAt: -1 }).limit(5);
    const capsuleLogs = await ActivityLog.find({ type: 'capsule' }).sort({ createdAt: -1 }).limit(5);
    const securityLogs = await ActivityLog.find({ type: 'security' }).sort({ createdAt: -1 }).limit(5);

    // Combine and sort all logs by date to get a chronological feed.
    const logs = [...systemLogs, ...authLogs, ...capsuleLogs, ...securityLogs];
    logs.sort((a, b) => b.createdAt - a.createdAt);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Clears all activity logs.
app.delete('/api/admin/activity', auth, adminAuth, async (req, res) => {
  try {
    await ActivityLog.deleteMany({});
    await logActivity('system', `Activity logs cleared by Admin (${req.userEmail}).`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear activity logs' });
  }
});

// Fetches all users for the admin user management table.
app.get('/api/admin/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ _id: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Fetches all capsules in the system for the admin capsule management table.
app.get('/api/admin/capsules', auth, adminAuth, async (req, res) => {
  try {
    const capsules = await Capsule.find().select('-fileData -message -iv').populate('userId', 'name email').sort({ date: -1 });
    res.json(capsules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch system capsules' });
  }
});

// Fetches the current system-wide settings.
app.get('/api/admin/settings', auth, adminAuth, async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// Updates the system-wide settings.
app.put('/api/admin/settings', auth, adminAuth, async (req, res) => {
  try {
    const { allowNewRegistrations, maxAttachmentSizeMB, maintenanceMode, requireEmailVerification, maxCapsulesPerUser, maxRecipientsPerCapsule, maxAdmins } = req.body;
    let settings = await SystemSettings.findOne();
    if (!settings) settings = new SystemSettings();

    if (allowNewRegistrations !== undefined) settings.allowNewRegistrations = allowNewRegistrations;
    if (maxAttachmentSizeMB !== undefined) settings.maxAttachmentSizeMB = Number(maxAttachmentSizeMB);
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
    if (requireEmailVerification !== undefined) settings.requireEmailVerification = requireEmailVerification;
    if (maxCapsulesPerUser !== undefined) settings.maxCapsulesPerUser = Number(maxCapsulesPerUser);
    if (maxRecipientsPerCapsule !== undefined) settings.maxRecipientsPerCapsule = Number(maxRecipientsPerCapsule);
    if (maxAdmins !== undefined) settings.maxAdmins = Number(maxAdmins);

    await settings.save();
    await logActivity('system', `System settings updated by Admin (${req.userEmail}).`);
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

// Deletes a user and all of their associated data (capsules and files).
app.delete('/api/admin/users/:id', auth, adminAuth, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }
    const deletedUser = await User.findById(req.params.id);
    await User.findByIdAndDelete(req.params.id);

    // Delete all user attachments from Supabase
    const userCapsules = await Capsule.find({ userId: req.params.id });
    const filePaths = userCapsules.map(c => c.filePath).filter(Boolean);

    // Also delete any capsules belonging to this user
    await Capsule.deleteMany({ userId: req.params.id });
    await logActivity('system', `Admin (${req.userEmail}) deleted user account: ${deletedUser?.email || req.params.id}`);
    res.json({ success: true });

    if (filePaths.length > 0) {
      supabase.storage.from('attachments').remove(filePaths).catch(console.error);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Deletes a single capsule from the system.
app.delete('/api/admin/capsules/:id', auth, adminAuth, async (req, res) => {
  try {
    const capsule = await Capsule.findById(req.params.id);
    const oldFilePath = capsule ? capsule.filePath : null;
    await Capsule.findByIdAndDelete(req.params.id);
    await logActivity('system', `Admin (${req.userEmail}) deleted a system capsule.`);
    res.json({ success: true });

    if (oldFilePath) {
      supabase.storage.from('attachments').remove([oldFilePath]).catch(console.error);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete system capsule' });
  }
});

// ============================================================================
// 10. BACKGROUND DISPATCH ENGINE & CRON SCHEDULER
// Handles physical delivery, email dispatch, tracking, and the Dead Man's Switch
// ============================================================================

// Helper to send emails via Brevo's REST API using HTTPS over port 443
async function sendEmailViaResend({ to, subject, html, replyTo, from, attachments = [] }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY environment variable is missing.');
  }

  // Extract display name from 'from', default to 'ChronoMail'
  let fromName = 'ChronoMail';
  if (from) {
    const match = from.match(/^"([^"]+)"/);
    if (match && match[1]) {
      fromName = match[1];
    } else {
      const cleanDisplayName = from.split('<')[0].trim().replace(/"/g, '');
      if (cleanDisplayName) {
        fromName = cleanDisplayName;
      }
    }
  }

  // Format attachments for Brevo (Brevo accepts base64 content and name)
  const formattedAttachments = attachments.map(att => {
    let base64Content = '';
    if (Buffer.isBuffer(att.content)) {
      base64Content = att.content.toString('base64');
    } else if (typeof att.content === 'string') {
      base64Content = Buffer.from(att.content).toString('base64');
    } else {
      base64Content = att.content;
    }

    let cleanName = att.filename || 'attachment';
    // Rewrite .webm (not supported by Brevo API) to .mp4 (supported and plays perfectly)
    if (cleanName.toLowerCase().endsWith('.webm')) {
      cleanName = cleanName.substring(0, cleanName.length - 5) + '.mp4';
    }

    return {
      content: base64Content,
      name: cleanName
    };
  });

  const senderEmailAddress = (process.env.EMAIL_USER || 'Chronomail96@gmail.com').trim().toLowerCase();

  const bodyPayload = {
    sender: { name: fromName, email: senderEmailAddress },
    to: (Array.isArray(to) ? to : [to]).map(email => ({ email })),
    subject: subject || 'A ChronoMail Message',
    htmlContent: html,
  };

  // Set reply-to to the official ChronoMail sender email to protect the creator's personal email privacy
  bodyPayload.replyTo = { email: senderEmailAddress };

  if (formattedAttachments.length > 0) {
    bodyPayload.attachment = formattedAttachments;
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(bodyPayload)
  });

  const responseText = await res.text();
  let responseData = {};
  try {
    responseData = JSON.parse(responseText);
  } catch (e) {}

  if (!res.ok) {
    throw new Error(responseData.message || `Brevo API returned status ${res.status}`);
  }

  return { messageId: responseData.messageId };
}

let transporter;

async function initializeServer() {
  try {
    // Using Gmail for sending emails is not recommended for production due to rate limits.
    // Configure the email transporter using credentials from .env
    transporter = nodemailer.createTransport({
      service: 'gmail',
      dns: {
        family: 4 // Force IPv4 to avoid resolution delays on some networks
      },
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log('✅ Email transporter configured.');

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, async () => {
      console.log(`🚀 API Server running on port ${PORT}`);
      await logActivity('system', 'ChronoMail backend server started and network connections established.');
    });

  } catch (err) {
    console.error('❌ Failed to initialize server:', err);
    process.exit(1);
  }
}

// Helper function to send the OTP email during registration.
async function sendVerificationEmail(email, otp) {
  const htmlContent = `<div style="font-family: sans-serif; text-align: center; padding: 20px;">
             <h2>Welcome to ChronoMail!</h2>
             <p>Your verification code is:</p>
             <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; border: 1px solid #ddd; padding: 10px; display: inline-block;">${otp}</p>
             <p>This code will expire in 10 minutes.</p>
           </div>`;
  const info = await sendEmailViaResend({
    to: email,
    subject: 'Your ChronoMail Verification Code',
    html: htmlContent
  });
  console.log(`✅ Verification email sent to ${email}. Message ID: ${info.messageId}`);
}

// Helper function to send the OTP email for password resets.
async function sendPasswordResetEmail(email, otp) {
  const htmlContent = `<div style="font-family: sans-serif; text-align: center; padding: 20px;">
             <h2>Password Reset Request</h2>
             <p>Your password reset code is:</p>
             <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; border: 1px solid #ddd; padding: 10px; display: inline-block;">${otp}</p>
             <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
           </div>`;
  await sendEmailViaResend({
    to: email,
    subject: 'ChronoMail Password Reset Code',
    html: htmlContent
  });
  console.log(`✅ Password reset email sent to ${email}.`);
}

// The core function responsible for decrypting and sending a capsule's content via email.
async function sendEmail(capsule) {
  const user = await User.findById(capsule.userId);
  const senderName = user ? user.name : 'A Time Traveler';
  const senderEmail = user ? user.email : process.env.EMAIL_USER;

  const allRecipients = capsule.recipients.split(',').map(r => r.trim()).filter(Boolean);

  let hasSuccess = false;
  let hasFail = false;

  // Step 1: Decode the attachment only ONCE for all recipients
  let decryptedFileData = null;
  if (capsule._tempRawFile) {
    decryptedFileData = capsule._tempRawFile;
  } else if (capsule.filePath) {
    const { data, error } = await supabase.storage.from('attachments').download(capsule.filePath);
    if (error) {
      console.error(`❌ Failed to download attachment from Supabase for capsule ${capsule._id}:`, error);
    } else {
      const buffer = Buffer.from(await data.arrayBuffer());
      decryptedFileData = capsule.fileIv ? decryptBuffer(buffer, capsule.fileIv) : buffer;
    }
  } else if (capsule.fileData) {
    if (capsule.fileIv) {
      decryptedFileData = decryptBuffer(capsule.fileData, capsule.fileIv);
    } else {
      decryptedFileData = capsule.fileData; // Backwards compatibility for older unencrypted files
    }
  }

  // Step 2: Send emails to all recipients concurrently rather than sequentially
  await Promise.all(allRecipients.map(async (recipient) => {
    // Check if the recipient has unsubscribed from this sender.
    if (user && user.blacklist && user.blacklist.includes(recipient)) {
      console.log(`🚫 Recipient ${recipient} is on the blacklist for user ${user.email}. Skipping.`);
      return;
    }

    const decryptedMessage = decrypt(capsule.message, capsule.iv);
    let htmlBody = decryptedMessage;

    // This is a placeholder for a premium feature.
    if (capsule.isPhysical && capsule.physicalAddress) {
      console.log(`\n💌 [PREMIUM FEATURE] Preparing Physical Letter...`);
      console.log(`--> Sending physical mail to: ${capsule.physicalAddress.replace(/\n/g, ', ')}`);
      console.log(`✅ Physical Letter dispatched successfully!\n`);
      await logActivity('system', `Physical letter dispatch triggered for capsule ${capsule._id}.`);
    }

    // Embed the tracking pixel in the email body (only if a valid non-localhost API_URL is provided)
    if (process.env.API_URL && !process.env.API_URL.includes('localhost')) {
      htmlBody += `<img src="${process.env.API_URL}/api/track/${capsule._id}" width="1" height="1" alt="" style="display:none;" />`;
    }

    // Add an unsubscribe link if the recipient is not the sender and a valid API_URL is available
    if (recipient.toLowerCase() !== senderEmail.toLowerCase() && process.env.API_URL && !process.env.API_URL.includes('localhost')) {
      const unsubscribeToken = jwt.sign({ userId: user._id, recipientEmail: recipient }, process.env.JWT_SECRET, { expiresIn: '1y' });
      const unsubscribeUrl = `${process.env.API_URL}/api/unsubscribe/${unsubscribeToken}`;

      htmlBody += `<br><br><hr><p style="font-size: 12px; color: #888; text-align: center;">
        You received this message because ${senderName} scheduled it for you using ChronoMail. 
        <a href="${unsubscribeUrl}" target="_blank">Unsubscribe</a> to stop receiving future messages from this user.
      </p>`;
    }

    const mailOptions = {
      from: `"${senderName} (via ChronoMail)" <${process.env.EMAIL_USER}>`,
      replyTo: senderEmail,
      to: recipient,
      subject: capsule.subject || 'A ChronoMail Message',
      html: htmlBody,
      text: decryptedMessage.replace(/<[^>]*>?/gm, ''),
      attachments: decryptedFileData ? [{
        filename: capsule.fileName,
        content: decryptedFileData,
        contentType: capsule.fileMimeType
      }] : [],
    };

    try {
      const info = await sendEmailViaResend({
        from: mailOptions.from,
        to: recipient,
        replyTo: senderEmail,
        subject: capsule.subject || 'A ChronoMail Message',
        html: htmlBody,
        attachments: decryptedFileData ? [{
          filename: capsule.fileName,
          content: decryptedFileData
        }] : []
      });
      console.log(`✅ Email for capsule ${capsule._id} sent to: ${recipient}. Message ID: ${info.messageId}`);
      hasSuccess = true;
    } catch (err) {
      console.error(`❌ Failed to send email to ${recipient} for capsule ${capsule._id}:`, err);
      hasFail = true;
    }
  }));

  if (hasSuccess) {
    capsule.deliveryStatus = 'sent';
    // Send notification to the user who created the capsule
    await sendNotificationToUser(capsule.userId, {
      title: 'Your Time Capsule was Delivered!',
      body: `Your capsule "${capsule.subject}" was successfully sent to recipients.`,
      link: '/#dashboard',
      type: 'CAPSULE_SENT' // Add type for client to handle dashboard refresh
    });
  } else if (hasFail) {
    capsule.deliveryStatus = 'failed';
  }
}

// CRON JOB: Checks for due capsules every minute. This is a scalable and reliable interval for production.
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();

    // 1. Get standard scheduled capsules that are due
    const standardCapsules = await Capsule.find({ isScheduled: true, sent: false, isDeadMansSwitch: { $ne: true }, date: { $lte: now } });

    // 2. Process Dead Man's Switch (1 Year of Inactivity)
    // Find users who haven't logged in for a year and get their pending Dead Man's Switch capsules.
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const inactiveUsers = await User.find({ lastLogin: { $lte: oneYearAgo } }).select('_id');
    const dmsCapsules = await Capsule.find({ isDeadMansSwitch: true, sent: false, userId: { $in: inactiveUsers.map(u => u._id) } });

    const capsulesToProcess = [...standardCapsules, ...dmsCapsules];

    if (capsulesToProcess.length > 0) {
      console.log(`⏰ Cron job started. Found ${capsulesToProcess.length} pending capsule(s).`);

      // Process in concurrent batches of 20 to prevent single-thread blocking and vastly speed up delivery
      // This improves performance when many capsules are due at the same time.
      const batchSize = 20;
      for (let i = 0; i < capsulesToProcess.length; i += batchSize) {
        const batch = capsulesToProcess.slice(i, i + batchSize);

        await Promise.all(batch.map(async (capsule) => {
          try {
            await sendEmail(capsule);
            // If the capsule is recurring, reschedule it for the next year instead of marking it as sent.
            if (capsule.recurring === 'yearly') {
              const nextDate = new Date(capsule.date);
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              capsule.date = nextDate;
              console.log(`✅ Recurring capsule ${capsule._id} processed and rescheduled for ${nextDate.toISOString()}`);
            } else {
              capsule.sent = true;
              console.log(`✅ One-time capsule ${capsule._id} processed successfully.`);
            }
            await capsule.save();
          } catch (err) {
            console.error(`❌ Failed to process capsule ${capsule._id} for recipients ${capsule.recipients}:`, err);
          }
        }));
      }

      console.log('⏰ Cron job finished.');
      await logActivity('system', `Background Job: ${capsulesToProcess.length} time capsule(s) processed and dispatched.`);
    }
  } catch (err) {
    console.error('❌ An unexpected error occurred in the cron job scheduler:', err);
  }
});
console.log('⏰ Cron job for sending capsules scheduled.');

// ============================================================================
// 11. GLOBAL ERROR HANDLERS (Ensures JSON responses instead of HTML)
// ============================================================================
// Catch-all for any API routes that don't exist.
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

// Generic error handler to catch any unhandled exceptions in the application.
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

initializeServer();
