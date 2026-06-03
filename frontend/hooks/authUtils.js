import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const refreshAccessToken = async () => {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return null;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/jwt/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.access) {
      localStorage.setItem('access_token', data.access);
      if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
      return data.access;
    }
    return null;
  } catch {
    return null;
  }
};

export const useAuth = () => {
  const navigate = useNavigate();

  const getAuthHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('access_token')}`
  }), []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    navigate('/login');
  }, [navigate]);

  // Returns true if the user was logged out (unrecoverable), false if refresh succeeded
  const handleAuthError = useCallback(async (res) => {
    if (res.status !== 401) return false;
    const newToken = await refreshAccessToken();
    if (newToken) return false;
    logout();
    return true;
  }, [logout]);

  const checkAuthAndGetUser = useCallback(() => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    if (!token || !user_id) {
      navigate('/login');
      return null;
    }
    return { token, user_id };
  }, [navigate]);

  return { getAuthHeaders, handleAuthError, checkAuthAndGetUser, logout };
};

export const useApi = (baseUrl, setError) => {
  const { logout } = useAuth();

  const fetchData = useCallback(async (endpoint, queryParams = {}, method = 'GET', body = null) => {
    const url = new URL(`${baseUrl}${endpoint}`);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    const makeRequest = (token) => {
      const options = { method, headers: { Authorization: `Bearer ${token}` } };
      if (body && method !== 'GET') {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
      return fetch(url, options);
    };

    try {
      let response = await makeRequest(localStorage.getItem('access_token'));

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await makeRequest(newToken);
        } else {
          logout();
          return { error: true };
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          return { error: true };
        }

        let errorData = 'Unknown error';
        try {
          if (response.headers.get('content-type')?.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorData = await response.text();
          }
        } catch {}
        setError(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
        return { error: true };
      }

      if (method === 'DELETE' || response.status === 204) {
        return { error: false, data: {} };
      }

      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          return { error: false, data: await response.json() };
        } catch {
          return { error: false, data: {} };
        }
      }

      return { error: false, data: {} };
    } catch {
      setError('An unexpected error occurred.');
      return { error: true };
    }
  }, [baseUrl, logout, setError]);

  return { fetchData };
};
