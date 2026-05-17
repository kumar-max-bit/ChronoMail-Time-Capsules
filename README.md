# ⏳ ChronoMail (Time Capsules)

A secure web application that allows you to create digital time capsules—containing text, files, voice recordings, and video messages—and schedule them to be sent to anyone at a specific future date or automatically via a Dead Man's Switch.

---

## 💡 The Concept
ChronoMail acts as a digital time-capsule. You write a message, record a video/audio clip, or upload file attachments, and lock them in a vault. The vault only unlocks and sends the content to your chosen recipient when the selected time arrives, or if you remain inactive for a specified period (Dead Man's Switch).

---

## 🛠️ Technologies Used
- **Frontend:** React.js, Tailwind CSS (Modern, responsive UI)
- **Backend:** Node.js, Express.js (Fast REST API)
- **Database:** MongoDB & Mongoose (Storing user accounts and metadata)
- **Storage:** Supabase Storage (Safe file, audio, and video uploads)
- **Notifications:** Firebase Cloud Messaging (Real-time alerts)
- **Email Delivery:** Nodemailer (Local dev SMTP) & Brevo REST API (Production HTTPS)
- **Security:** AES-256 Encryption (Zero-knowledge envelope encryption)

---

## ✨ Key Features
- **Future Email Scheduling:** Pick any future date and time to deliver your messages.
- **Media Attachments:** Record live audio/video notes directly in your browser or attach files.
- **Dead Man's Switch:** Automatically dispatch capsules to emergency contacts if you fail to check-in for a set period (30, 90, or 365 days).
- **AES-256 Encryption:** Your messages are encrypted and completely unreadable until the unlock date.
- **Live Notifications:** Receive real-time push notification badges for activity alerts.

---

## 🚀 Quick Start

### 1. Backend Setup (`tCProxy/`)
```bash
cd tCProxy
npm install
npm run dev
```
*(Make sure to configure your `.env` file with `PORT`, `MONGO_URI`, `JWT_SECRET`, `SUPABASE_URL`, and `SUPABASE_KEY`)*

### 2. Frontend Setup (`timecapsules/`)
```bash
cd timecapsules
npm install
npm run dev
```
*(Make sure to configure your `.env` file with `VITE_API_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_KEY`)*

---
*Created with ❤️ by the ChronoMail team.*
