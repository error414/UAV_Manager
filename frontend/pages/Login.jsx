import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout, FormInput, Alert, Button, Loading } from '../components';

const Login = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [status, setStatus] = useState({ error: null, success: null, loading: false });

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      navigate('/flightlog', { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ error: null, success: null, loading: true });

    try {
      const response = await fetch(`${API_URL}/auth/jwt/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Invalid credentials');
      }
      
      if (!data.access) {
        throw new Error('No access token received.');
      }
      
      localStorage.setItem('access_token', data.access);
      
      try {
        const meResponse = await fetch(`${API_URL}/auth/users/me/`, {
          headers: { 'Authorization': `Bearer ${data.access}` }
        });
        
        if (meResponse.ok) {
          const userData = await meResponse.json();
          localStorage.setItem('user_id', userData.user_id);
        }
      } catch (err) {
      }
      
      setStatus({ error: null, success: 'Login successful!', loading: false });
      navigate('/flightlog');
      
    } catch (err) {
      setStatus({ 
        error: err.message || 'An error occurred. Please try again later.', 
        success: null, 
        loading: false 
      });
    }
  };

  if (status.loading) {
    return <Loading message="Logging in..." />;
  }

  return (
    <AuthLayout title="Login">
      <Alert type="error" message={status.error} />
      <Alert type="success" message={status.success} />

      <form onSubmit={handleSubmit}>
        <FormInput
          label="E-Mail"
          type="email"
          name="email"
          id="email"
          value={formData.email}
          onChange={handleChange}
          required
          labelClassName="text-white"
        />

        <FormInput
          label="Password"
          type="password"
          name="password"
          id="password"
          value={formData.password}
          onChange={handleChange}
          required
          className="mb-6"
          labelClassName="text-white"
        />

        <Button type="submit">Login</Button>
        
        <div className="mt-4 text-center">
          <span className="text-gray-300">Don't have an account? </span>
          <Link to="/register" className="text-blue-400 hover:text-blue-300">
            Register
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;