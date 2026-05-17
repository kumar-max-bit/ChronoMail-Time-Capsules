// This file centralizes the API base URL for the entire application.
// If you need to change the backend server address, you only need to change it here.

// Dynamically uses the current device's hostname to find the backend on port 3000.
// This allows it to work instantly on other devices on your local Wi-Fi!
export const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000`;