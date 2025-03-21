// API service to centralize all API calls

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiService = {
  // Auth endpoints
  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/jwt/create/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  async register(userData) {
    const response = await fetch(`${API_URL}/auth/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return response.json();
  },

  async getUser(token) {
    const response = await fetch(`${API_URL}/auth/users/me/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  async updateUser(userId, userData, token) {
    const response = await fetch(`${API_URL}/api/users/${userId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
    return response.json();
  },

  // FlightLog endpoints
  async getFlightLogs(userId, token) {
    const response = await fetch(`${API_URL}/api/flightlogs/?user=${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  async createFlightLog(flightData, token) {
    const response = await fetch(`${API_URL}/api/flightlogs/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(flightData),
    });
    return response.json();
  },

  async updateFlightLog(flightLogId, flightData, token) {
    const response = await fetch(`${API_URL}/api/flightlogs/${flightLogId}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(flightData),
    });
    return response.json();
  },

  async deleteFlightLog(flightLogId, token) {
    const response = await fetch(`${API_URL}/api/flightlogs/${flightLogId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response;
  },

  // UAV endpoints
  async getUAVs(userId, token) {
    const response = await fetch(`${API_URL}/api/uavs/?user=${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  createAircraft: async (aircraftData) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/api/uavs/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(aircraftData)
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
    }
  
    return response.json();
  },

  // Add more API methods as needed
};