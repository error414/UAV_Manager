import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const navigate = useNavigate();

  // Returns headers with Bearer token for authenticated requests
  const getAuthHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('access_token')}`
  }), []);

  // Handles 401 errors by clearing auth and redirecting to login
  const handleAuthError = useCallback(res => {
    if (res.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_id');
      navigate('/login');
      return true;
    }
    return false;
  }, [navigate]);

  // Checks for auth tokens and navigates to login if missing
  const checkAuthAndGetUser = useCallback(() => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    if (!token || !user_id) {
      navigate('/login');
      return null;
    }
    return { token, user_id };
  }, [navigate]);

  return { getAuthHeaders, handleAuthError, checkAuthAndGetUser };
};

export const useApi = (baseUrl, setError) => {
  const { getAuthHeaders, handleAuthError } = useAuth();

  // Generic fetch wrapper with auth and error handling
  const fetchData = useCallback(async (endpoint, queryParams = {}, method = 'GET', body = null) => {
    const url = new URL(`${baseUrl}${endpoint}`);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    try {
      const options = { method, headers: getAuthHeaders() };
      if (body && method !== 'GET') {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        if (handleAuthError(response)) return { error: true };

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

      // Handle empty response for DELETE or 204 No Content
      if (method === 'DELETE' || response.status === 204) {
        return { error: false, data: {} };
      }

      // Parse JSON response if available
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
  }, [baseUrl, getAuthHeaders, handleAuthError, setError]);

  return { fetchData };
};