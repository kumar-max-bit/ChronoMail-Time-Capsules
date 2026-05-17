import { API_BASE_URL } from './apiConfig.js';

/**
 * Centralized API service for making authenticated requests.
 * Handles adding Authorization headers and basic error parsing.
 */
const apiService = {
  async request(endpoint, method = 'GET', data = null, token = null, isFormData = false) {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      method,
      headers: isFormData ? { 'Authorization': `Bearer ${token}` } : headers, // FormData sets its own Content-Type
      body: isFormData ? data : (data ? JSON.stringify(data) : null),
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const responseData = await response.json();

      if (!response.ok) {
        // Automatically log out the user if their session has expired
        if (response.status === 401 && responseData.error?.includes('expired')) {
          localStorage.removeItem('tcUser');
          window.location.hash = '#home';
          window.location.reload();
        }
        
        // Custom error handling for API responses
        const error = new Error(responseData.error || `API Error: ${response.status}`);
        error.status = response.status;
        error.data = responseData;
        throw error;
      }

      return responseData;
    } catch (error) {
      console.error(`API Service Error for ${endpoint}:`, error);
      throw error; // Re-throw to be handled by the calling component
    }
  },

  // Example usage for specific endpoints (can be expanded)
  login: (credentials) => apiService.request('/api/login', 'POST', credentials),
  register: (credentials) => apiService.request('/api/register', 'POST', credentials),
  verifyOtp: (payload) => apiService.request('/api/verify-otp', 'POST', payload),
  getCapsules: (token) => apiService.request('/api/capsules', 'GET', null, token),
  getCapsule: (id, token) => apiService.request(`/api/capsules/${id}`, 'GET', null, token),
  getPublicCapsules: () => apiService.request('/api/public-gallery', 'GET', null, null),
  createCapsule: (formData, token) => apiService.request('/api/capsules', 'POST', formData, token, true),
  updateCapsule: (id, formData, token) => apiService.request(`/api/capsules/${id}`, 'PUT', formData, token, true),
  deleteCapsule: (id, token) => apiService.request(`/api/capsules/${id}`, 'DELETE', null, token),
  uploadProfilePhoto: (formData, token) => apiService.request('/api/user/photo', 'POST', formData, token, true),
  generateSubject: (payload, token) => apiService.request('/api/generate-subject', 'POST', payload, token),
  getAdminStats: (token) => apiService.request('/api/admin/stats', 'GET', null, token),
  getAdminUsers: (token) => apiService.request('/api/admin/users', 'GET', null, token),
  getAdminCapsules: (token) => apiService.request('/api/admin/capsules', 'GET', null, token),
  deleteAdminUser: (id, token) => apiService.request(`/api/admin/users/${id}`, 'DELETE', null, token),
  deleteAdminCapsule: (id, token) => apiService.request(`/api/admin/capsules/${id}`, 'DELETE', null, token),
  getAdminSettings: (token) => apiService.request('/api/admin/settings', 'GET', null, token),
  getAdminActivity: (token) => apiService.request('/api/admin/activity', 'GET', null, token),
  updateAdminSettings: (data, token) => apiService.request('/api/admin/settings', 'PUT', data, token),
};

export default apiService;